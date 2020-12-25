const arg = require( 'arg' );
const chalk = require( 'chalk' );
const inquirer = require( 'inquirer' );
const moment = require( 'moment' );
const cronstrue = require( 'cronstrue' );

import * as cron from 'node-cron'

const { crawl } = require( '../commands' );

module.exports.parseArgs = function( rawArgs, options ) {
	const args = arg(
		{
			'--rule': String,
			'-r': '--rule',

			'--items': [String],
			'-I': '--items',

		},
		{
			argv: rawArgs.slice(2),
		}
	);

	options.rule = args['--rule'] || '0 */5 * * * *';
	options.items = args['--items'] || [];

	return options;
};

module.exports.prompt = async function( options ) {
	return {
		...options,
	};
};

module.exports.run = async function( options ) {
	const requestTime = moment().format( 'YYYY-MM-DD HH:mm:ss' );
	const humanReadableCron = cronstrue.toString( options.rule );

	console.log( chalk.blue.bold( `Started cron scheduler at ${requestTime}` ) );
	options.items.forEach( ( item, index ) => {
		console.log( chalk.green.bold( `Running cron schedule: ${humanReadableCron} for "${item}"` ) );
		cron.schedule(
			options.rule,
			() => {
				crawl.run( { item: item } );
			}
		);
	} );

	return true;
}
