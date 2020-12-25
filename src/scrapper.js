var fs = require("fs");
var cheerio = require("cheerio");
const uselessItems = require('./useless-items');

const getRequestDataFromJS = function(body, scriptName, sliceAmount=0) {
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


// Parses HTML from URL and returns data structure containing relevent data
exports.parseContent = function(content, itemType) {
  let items = [];

  const $ = cheerio.load(content);

  // Multiple items in a page
  if (itemType === 'multi') {
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
  } else if (itemType === 'bone') {
    // Boneyard page exists
    if (redirectCount === 0) {
      $('.grouped-item').each((index, element) => {
        let stockText =  $(element).find('.bin-stock-availability').text();
        items[index] = {};
        items[index].name = $(element).find('.item-name').text();
        items[index].price = $(element).find('.price').text();
        items[index].in_stock = ! stockText.includes( 'Notify Me' ) && ! stockText.includes( 'Out of Stock' );
      });
    } else {
      items[0] = {};
      items[0].in_stock = false;
    }
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
  } else if (itemType === 'ironmaster') {
    let stockText = $('span.stock').text();
    items[0] = {};
    items[0].name = $('.product_title').text();
    items[0].price = 'N/A';
    items[0].in_stock = ! stockText.includes( 'Notify Me' ) && ! stockText.includes( 'Out of Stock' );
  }
  // Just one item in a page
  else {
    let stockText = $('.product-options-bottom button').text();

    items[0] = {};
    items[0].name = $('.product-title').text();
    items[0].price = $('.price').text();
    items[0].in_stock = ! stockText.includes( 'Notify Me' ) && ! stockText.includes( 'Out of Stock' );
  }
  return items;
}
