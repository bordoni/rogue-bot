'use strict';

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const FormData = require('form-data');

const got = require( 'got' );

const {inspect} = require('util');
const {readFileSync} = require('fs');

const CODE = 'ERR_INVALID_OPT_VALUE_ENCODING';
const ENCODING_ERROR = 'read-json-sync expected the encoding option to be a <string> (defaulting to \'utf8\' if nothing is specified) so as to convert file contents from <Buffer> to <string> before parsing it as JSON';

const readJsonSync = function(...args) {
	const argLen = args.length;

	if (argLen === 2) {
		const options = args[1];
		const isObject = typeof options === 'object';

		if (options === null || (isObject && options.encoding !== undefined && typeof options.encoding !== 'string')) {
			const encoding = options === null ? null : options.encoding;
			const error = new TypeError(`${ENCODING_ERROR}, but a non-string value ${inspect(encoding)} was provided.`);
			error.code = CODE;

			throw error;
		}

		if (options === '' || (isObject && options.encoding === '')) {
			const error = new TypeError(`${ENCODING_ERROR.replace('<', 'non-empty <')}, but '' (empty string) was provided.`);
			error.code = CwODE;

			throw error;
		}

		if (isObject || options === undefined) {
			args[1] = {encoding: 'utf8', ...options};
		}
	} else if (argLen === 1) {
		args.push('utf8');
	} else {
		throw new RangeError(`Expected 1 or 2 arguments (path[, options]), but got ${
			argLen === 0 ? 'no' : argLen
		} arguments.`);
	}

	const str = readFileSync(...args);

	return JSON.parse(str.charCodeAt(0) === 65279 /* 0xFEFF */ ? str.slice(1) : str);
};

module.exports.readJsonSync = readJsonSync;

module.exports.addLog = async function( log ) {
	let logs = readJsonSync( path.resolve( __dirname, '../logs.json' ) );

	if ( ! Array.isArray( logs ) ) {
		logs = [];
	}

	// Add log timing of the request to the JSON log.
	logs.push( log );

	const jsonLogs = JSON.stringify( logs, null, 2 );
	return fs.writeFile( path.resolve( __dirname, '../logs.json' ), jsonLogs, (err) => { if (err) throw err; });
}

module.exports.notify = async function ( response ) {
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