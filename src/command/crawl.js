import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

const moment = require('moment');
const crypto = require('crypto');

const { parseContent } = require( './../scrapper' )
const { notify, addLog } = require( './../utils' )

const got = require( 'got' );

module.exports = async function(options) {
	const requestTime = moment().format( 'YYYY-MM-DD HH:mm:ss' );

	let url;
	let itemType;

	if ( options.item ) {
		url = options.item.link;
		itemType = options.item.type;
	} else {
		url = options.url;
		itemType = 'simple';
	}

	const id = crypto.createHash('md5').update(url).digest("hex");;
	url = url + '?=' + uuidv4()

	const { body, statusCode } = await got(url);

	if ( 200 !== statusCode ) {
		console.error('%s Invalid URL or Failed Request', chalk.red.bold('ERROR'));
		process.exit(1);
	}

	const items = parseContent( body, itemType );
	const response = {
		'time': requestTime,
		'id': id,
		'url': url,
		'items': items,
	}

	// Add this to the log.
	await addLog( response );

	console.log( response );
	let inStock = false;

	items.forEach( function( item, index ) {
		if ( item.in_stock ) {
			inStock = true;
		}
	} );

	// Bail without email when there is no stock.
	if ( ! inStock )  {
		console.error( chalk.red.bold( 'No stock available, no email sent.' ) );

		return true;
	}

	const foundNotification = db.notifications.find( o => o.id === id );

	if ( foundNotification && moment( foundNotification.registered ).isSame( moment(), 'day' ) ) {
		console.error( chalk.red.bold( 'Email has already been sent today.' ) );
		process.exit( 1 );
		return true;
	}

	const notification = await notify( response );

	if ( 'undefined' !== typeof notification.error ) {
		console.error( chalk.red.bold( notification.error ) );
		process.exit( 1 );
	}

	console.error( chalk.green.bold( 'Sent email with stock notification.' ) );

	return true;
}
