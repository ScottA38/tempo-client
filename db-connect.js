const mysql = require('mysql');
const dbCredentials = require('./.db-credentials')

let db = mysql.createConnection(dbCredentials);

module.exports = db;
