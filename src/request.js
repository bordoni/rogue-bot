const got = require( 'got' );
const userAgents = require('top-user-agents');
const uniqueRandomArray = require('unique-random-array');
const tunnel = require('tunnel');
const { getRandomProxy } = require( './proxy' );

exports.doRequest = async ( url ) => {
	const randomUserAgent = uniqueRandomArray( userAgents );
	const randomProxy = await getRandomProxy();
	const options = {
		headers: {
			'User-Agent': randomUserAgent,
			'Referrer': 'https://google.com',
	        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	        'Accept-Encoding': 'gzip, deflate, br',
	        'Accept-Language': 'en-US,en;q=0.9',
	        'Pragma': 'no-cache',
		},
	};
	const { body, statusCode } = await got( url, options );

	if ( 200 !== statusCode ) {
		console.error('%s Invalid URL or Failed Request', chalk.red.bold('ERROR'));
		return false;
	}

	return body;
};
