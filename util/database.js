/**
 * Database connection pool.
 * Uses mysql2 for promise-based queries.
 */

const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'mufasa_db',
    password: '',
});

module.exports = pool.promise();