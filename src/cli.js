import arg from 'arg';

const commands = require( './commands' );
const chalk = require( 'chalk' );

function isAllowedCommand( command ) {
	return [ 'crawl', 'cron', 'clean' ].includes( command );
}

function parseArgumentsIntoOptions( rawArgs ) {
	const args = arg(
		{
		},
		{
			argv: rawArgs.slice(2),
			permissive: true
		}
	);

	let options = {
		command: args._[0],
	};

	if ( ! isAllowedCommand( options.command ) ) {
		console.error( chalk.red.bold( 'ERROR:' ), 'Invalid command' );
		process.exit( 1 );
		return false;
	}

	return commands[ options.command ].parseArgs( rawArgs, options );
}

async function promptForMissingOptions( options ) {
	return await commands[ options.command ].prompt( options );
}

export async function cli( args ) {
	let options = parseArgumentsIntoOptions( args );
	options = await promptForMissingOptions( options );

	await commands[ options.command ].run( options );
}
