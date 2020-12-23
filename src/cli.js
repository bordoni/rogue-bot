import arg from 'arg';
import inquirer from 'inquirer';
import { crawl } from './main';
const inventory = require( './inventory' );
const chalk = require( 'chalk' );

function parseArgumentsIntoOptions( rawArgs ) {
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

	let options = {
		url: args['--url'] || '',
		item: args['--item'] || '',
		command: args._[0],
	};


	if ( 'crawl' !== options.command ) {
		console.error( chalk.red.bold( 'ERROR:' ), 'Invalid command' );
		process.exit( 1 );
		return false;
	}

	if ( options.item && options.item in inventory === false ) {
		console.error( chalk.red.bold( 'ERROR:' ), 'Invalid item from the inventory', ' "' + options.item + '"' );
		process.exit( 1 );
		return false;
	} else {
		options.item = inventory[ options.item ]
	}

	return options;
}

async function promptForMissingOptions( options ) {
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
}

export async function cli( args ) {
	let options = parseArgumentsIntoOptions(args);
	options = await promptForMissingOptions(options);
	await crawl(options);
}
