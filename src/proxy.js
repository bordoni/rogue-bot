const got = require( 'got' );
const cheerio = require( 'cheerio' );
const _ = require( 'lodash' );
const tunnel = require('tunnel');

exports.getProxies = async () => {
  const { body, statusCode } = await got( 'https://sslproxies.org/' );

  if ( 200 !== statusCode ) {
    console.error('%s Invalid URL or Failed Request', chalk.red.bold('ERROR'));
    return false;
  }

  let proxies = [];

  const $ = cheerio.load(body);

  $("td:nth-child(1)").each(function(index, value) {
    proxies[index] = {};
    proxies[index].ip = $(this).text();
  });

  $("td:nth-child(2)").each(function(index, value) {
    proxies[index].port = $(this).text();
  });

  $("td:nth-child(3)").each(function(index, value) {
    proxies[index].countryCode = $(this).text();
  });

  return _.filter(proxies, { 'countryCode': 'US' });
};

exports.getRandomProxy = async () => {
  const proxies = await exports.getProxies();

  return  _.shuffle(proxies)[0];;
};

exports.testProxy = async ( proxy ) => {
  const options = {
    https: {
      rejectUnauthorized: false,
    },
    agent: {
      https: tunnel.httpsOverHttp( {
        proxy: {
          host: proxy.ip,
          ip: proxy.port,
        }
      } )
    }
  };

  const { body, statusCode } = await got( 'https://httpbin.org/ip', options );

  if ( 200 !== statusCode ) {
    console.error('%s Invalid URL or Failed Request', chalk.red.bold('ERROR'));
    return false;
  }

  return JSON.parse( body );
};
