import fs from 'fs';
import path from 'path';

const { readJsonSync } = require( './utils' );

const config = readJsonSync( path.resolve( __dirname, '../config.json' ) ) || {};
const db = readJsonSync( path.resolve( __dirname, '../db.json' ) ) || {};

const crawl = require( './command/crawl' );

module.exports.crawl = crawl;
