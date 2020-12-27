import path from 'path';

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync( path.resolve( __dirname, '../config.json' ) );
const config = low(adapter);

module.exports = config.defaults({});;
