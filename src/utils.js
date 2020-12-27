'use strict';

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const FormData = require('form-data');

const got = require( 'got' );

const config = require( './config' );
const db = require( './db' );
const logs = require( './logs' );

const {inspect} = require('util');

module.exports.addLog = async function( log ) {
	// Add log timing of the request to the JSON log.
	logs.get('items').push( log ).write();
}

module.exports.notify = async function ( response ) {
	const form = new FormData();
	form.append( 'from', `RogueBot <rogue@${config.get('mailgun.domain').value()}>` );
	form.append( 'to', config.get('notify').value() );
	form.append( 'subject', 'Stock Notification' );
	form.append( 'text', JSON.stringify( response, null, 2 ) );

	const mailgunResponse = await got.post( `https://api.mailgun.net/v3/${config.get('mailgun.domain').value()}/messages`, {
		username: 'api',
		password: config.get('mailgun.api_key').value(),
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

	db.get( 'notifications' ).push( notification ).write();

	return true;
}
