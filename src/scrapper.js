const fs = require("fs");
const cheerio = require("cheerio");
const uselessItems = require('./useless-items');
const _ = require( 'lodash' );

const getRequestDataFromJS = ( body, scriptName, sliceAmount = 0 ) => {
  let $ = cheerio.load(body);
  var obj = $("script[type='text/javascript']");
  let info = [];
  for (var i in obj) {
    for (var j in obj[i].children) {
      var data = obj[i].children[j].data;
      if (data && data.includes(scriptName)) {
        var split_data = data.split(/[[\]]{1,2}/);
        split_data.forEach((item) => {
          if (item.includes("additional_options")) {
            var stripped_str = item.substring(
              item.indexOf("{"),
              item.lastIndexOf("realLabel") - 2
            );
            info.push(JSON.parse(stripped_str));
          }
        });
      }
    }
  }
  let items = [];
  if (sliceAmount != 0) {
    info = info.slice(0, sliceAmount);
  }
  info.forEach((element, index) => {
    let first_key = Object.keys(element)[0];
    items[index] = {};
    items[index]["name"] = element[first_key]["label"];
    items[index]["price"] = $(".price").first().text().trim();
    items[index]["in_stock"] = element[first_key]["isInStock"];
  });
  return items;
};
exports.getRequestDataFromJS = getRequestDataFromJS;

const getProductCommerceData = ( $content ) => {
  const $javascripts = $content( '[type="text/javascript"]:contains(ColorSwatches)' );
  const regex = /ColorSwatches\((.*\}\}),\n/gms
  let javascriptContents;
  let childrenData;

  for ( let index in $javascripts ) {
    for ( let childrenIndex in $javascripts[ index ].children ) {
      childrenData = $javascripts[ index ].children[ childrenIndex ].data
      break;
    }

    const matches = regex.exec( childrenData );

    if ( matches === null ) {
      continue;
    }

    javascriptContents = matches[1].trim();
  }

  return JSON.parse( javascriptContents );
};
exports.getProductCommerceData = getProductCommerceData;

const getProductDataLayer = ( $content ) => {
  const $javascript = $content( '[type="application/javascript"]:contains(if \\(typeof\\(dataLayer\\) ===)' );
  if ( ! $javascript[0] ) {
    return false;
  }

  const javascriptContents = $javascript[0].children[0].data;
  const regex = /dataLayer\.push\((.*)\);/m;
  const matches = regex.exec( javascriptContents );

  if ( matches === null ) {
    return false;
  }

  const variantsJSON = JSON.parse( matches[1] );

  if ( 'object' !== typeof variantsJSON ) {
    return false;
  }

  if ( 'object' !== typeof variantsJSON.ecommerce ) {
    return false;
  }

  if ( 'object' !== typeof variantsJSON.ecommerce.impressions ) {
    return false;
  }

  return variantsJSON.ecommerce.impressions;
};
exports.getProductDataLayer = getProductDataLayer;

const isProductTypeMulti = ( $content ) => {
  const dataLayer = getProductDataLayer( $content );
  if ( _.isEmpty( dataLayer ) ) {
    return false;
  }

  if ( ! dataLayer ) {
    return false;
  }

  // Cerakote takes precedent over multi.
  if ( isProductTypeCerakote( $content ) ) {
    return false;
  }

  // Custom Products takes precedent over multi.
  if ( isProductTypeCustom( $content ) ) {
    return false;
  }

  return 1 < dataLayer.length;
};
exports.isProductTypeMulti = isProductTypeMulti;

const isProductTypeSingle = ( $content ) => {
  const dataLayer = getProductDataLayer( $content );
  if ( _.isEmpty( dataLayer ) ) {
    return false;
  }

  if ( ! dataLayer ) {
    return false;
  }

  return 1 === dataLayer.length;
};
exports.isProductTypeSingle = isProductTypeSingle;

const isProductTypeCerakote = ( $content ) => {
  const dataLayer = getProductDataLayer( $content );
  if ( _.isEmpty( dataLayer ) ) {
    return false;
  }

  if ( ! dataLayer ) {
    return false;
  }

  if ( 'string' !== typeof dataLayer[0].variant ) {
    return false;
  }

  return 'Color Swatches' === dataLayer[0].variant;
};
exports.isProductTypeCerakote = isProductTypeCerakote;

const isProductTypeCustom = ( $content ) => {
  const $configurableBox = $content( '.product-cart-box-configurable' );
  return 1 === $configurableBox.length;
};
exports.isProductTypeCustom = isProductTypeCustom;




// Parses HTML from URL and returns data structure containing relevent data
exports.parseContent = (content, itemType) => {
  let items = [];

  const $ = cheerio.load(content);

  if ( null === itemType ) {
    if ( isProductTypeMulti( $ ) ) {
      itemType = 'multi';
    } else if ( isProductTypeSingle( $ ) ) {
      itemType = 'single';
    } else if ( isProductTypeCerakote( $ ) ) {
      itemType = 'cerakote';
    } else if ( isProductTypeCustom( $ ) ) {
      itemType = 'custom';
    }
  }

  // console.log(
  //   'DataLayer', getProductDataLayer( $ ),
  //   'Commerce Data', getProductCommerceData( $ ),
  // );

  // Multiple items in a page
  if (itemType === 'multi' || itemType === 'bone') {
    $('.grouped-item').each((index, element) => {
      const itemName = $(element).find('.item-name').text();
      items[index] = {};
      // Check for useless items
      if (uselessItems.indexOf(itemName) >= 0) {
        return;
      }
      let stockText =  $(element).find('.bin-stock-availability').text();

      items[index].name = $(element).find('.item-name').text();
      items[index].price = $(element).find('.price').text();
      items[index].in_stock = ! stockText.includes( 'Notify Me' ) && ! stockText.includes( 'Out of Stock' );
    });
  } else if (itemType === 'grab bag') {
    // Boneyard page exists
    if (redirectCount === 0) {
      items = getRequestDataFromJS(content, 'RogueColorSwatches');
    } else {
      items[0] = {};
      items[0].in_stock = false;
    }
  } else if (itemType === 'cerakote') {
    items = getRequestDataFromJS(content, 'relatedColorSwatches');
  } else if (itemType === 'monster bench') {
    items = getRequestDataFromJS(content, 'RogueColorSwatches', 5);
  } else if (itemType === 'rmlc') {
    items = getRequestDataFromJS(content, 'RogueColorSwatches', 11);
  } else if (itemType === 'trolley') {
    items = getRequestDataFromJS(content, 'RogueColorSwatches', 4);
  } else if (itemType === 'db15') {
    items = getRequestDataFromJS(content, 'RogueColorSwatches', 2);
  } else if (itemType === 'custom2') {
    items = getRequestDataFromJS(content, 'RogueColorSwatches');
  } else if (itemType === 'custom') {
    items = getRequestDataFromJS(content, 'ColorSwatches');
  } else {
    let stockText = $('.product-options-bottom button').text();

    items[0] = {};
    items[0].name = $('.product-title').text();
    items[0].price = $('.price').text();
    items[0].in_stock = ! stockText.includes( 'Notify Me' ) && ! stockText.includes( 'Out of Stock' );
  }
  return items;
}
