const arg = require( 'arg' );
const chalk = require( 'chalk' );
const inquirer = require( 'inquirer' );

module.exports.parseArgs = function( rawArgs, options ) {
	const args = arg(
		{

		},
		{
			argv: rawArgs.slice(2),
		}
	);

	return options;
};

module.exports.prompt = async function( options ) {
	return {
		...options,
	};
};

module.exports.run = async function( options ) {

	return true;
}
