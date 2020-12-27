import path from 'path';

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync( path.resolve( __dirname, '../logs.json' ) );
const logs = low(adapter);

module.exports = logs.defaults({ items: [] });
