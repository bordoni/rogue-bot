import fs from 'fs';
import path from 'path';

const { readJsonSync } = require( './utils' );
module.exports = readJsonSync( path.resolve( __dirname, '../db.json' ) ) || {};
