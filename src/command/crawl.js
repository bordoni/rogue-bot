import { v4 as uuidv4 } from 'uuid';

const arg = require( 'arg' );
const chalk = require( 'chalk' );
const inquirer = require( 'inquirer' );
const moment = require('moment');
const crypto = require('crypto');

const db = require( '../db' );
const { parseContent } = require( '../scrapper' );
const inventory = require( '../inventory' );
const { notify, addLog } = require( '../utils' );
const { doRequest } = require( '../request' );

module.exports.parseArgs = function( rawArgs, options ) {
	const args = arg(
		{
			'--url': String,
			'-u': '--url',

			'--item': String,
			'-i': '--item',
		},
		{
			argv: rawArgs.slice(2),
		}
	);

	options.url = args['--url'] || '';
	options.item = args['--item'] || '';

	return options;
};

module.exports.prompt = async function( options ) {
	const questions = [];

	if ( ! options.url && ! options.item ) {
		questions.push({
			type: 'input',
			name: 'url',
			message: 'Which product you are trying to crawl?',
			default: null,
		});
	}

	const answers = await inquirer.prompt(questions);

	return {
		...options,
		url: options.url || answers.url,
		item: options.item || answers.item,
	};
};

module.exports.run = async function( options ) {
	if ( options.item && options.item in inventory === false ) {
		console.error( chalk.red.bold( 'ERROR:' ), `Invalid item from the inventory "${options.item}"` );
		return false;
	} else {
		options.item = inventory[ options.item ]
	}

	const requestTime = moment().format( 'YYYY-MM-DD HH:mm:ss' );

	let url;
	let itemType;

	if ( options.item ) {
		url = options.item.link;
		itemType = options.item.type;
	} else {
		url = options.url;
		itemType = null;
	}

	const id = crypto.createHash('md5').update(url).digest("hex");
	url = url + '?=' + uuidv4()

	const body = await doRequest( url );

	const items = parseContent( body, itemType );
	const response = {
		time: requestTime,
		id: id,
		url: url,
		items: items,
		emailSent: false,
	};
	console.log( response );

	let inStock = false;

	items.forEach( function( item, index ) {
		if ( item.in_stock ) {
			inStock = true;
		}
	} );

	// Bail without email when there is no stock.
	if ( ! inStock )  {
		// Add this to the log.
		await addLog( response );

		console.error( chalk.red.bold( 'No stock available, no email sent.' ) );
		return true;
	}

	const foundNotification = db.get( 'notifications' ).findLast( { id: id } );

	if ( foundNotification.value() && moment( foundNotification.value().registered ).isSame( moment(), 'day' ) ) {
		// Add this to the log.
		await addLog( response );

		console.error( chalk.red.bold( 'Email has already been sent today.' ) );
		return true;
	}

	const notification = await notify( response );

	if ( 'undefined' !== typeof notification.error ) {
		console.error( chalk.red.bold( notification.error ) );
		return false;
	}

	response.emailSent = true;

	// Add this to the log later in case of email..
	await addLog( response );

	console.error( chalk.green.bold( 'Sent email with stock notification.' ) );

	return true;
}
