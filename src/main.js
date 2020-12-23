import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import Listr from 'listr';
import { v4 as uuidv4 } from 'uuid';

const FormData = require('form-data');
const moment = require('moment');
const crypto = require('crypto');

const config = require('../config.json');
const db = require('../db.json');

const { parseContent } = require( './scrapper' )

const got = require( 'got' );

async function addLog( log ) {
	const logs = require('../log.json');

	// Add log timing of the request to the JSON log.
	logs.push( log );
	fs.writeFile( path.resolve( __dirname, '../log.json' ), JSON.stringify( logs, null, 2 ), (err) => { if (err) throw err; });
}

async function notify( response ) {
	const form = new FormData();
	form.append( 'from', `RogueBot <rogue@${config.mailgun.domain}>` );
	form.append( 'to', config.notify );
	form.append( 'subject', 'Stock Notification' );
	form.append( 'text', JSON.stringify( response, null, 2 ) );

	const mailgunResponse = await got.post( `https://api.mailgun.net/v3/${config.mailgun.domain}/messages`, {
		username: 'api',
		password: config.mailgun.api_key,
		body: form
	} );

	if ( 200 !== mailgunResponse.statusCode ) {
		return { error: 'Email not sent due to ERROR on with Mailgun Connection.' }
	}

	let notification = {
		id: response.id,
		registered: response.time,
		url: response.url,
		items: response.items,
	};

	db.notifications.push( notification );
	fs.writeFile( path.resolve( __dirname, '../db.json' ), JSON.stringify( db, null, 2 ), (err) => { if (err) throw err; });

	return true;
}

export async function crawl(options) {
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
	addLog( response );

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

	return true;
}



