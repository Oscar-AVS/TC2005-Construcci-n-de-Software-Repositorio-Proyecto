// util/db.js

/*
    Database connection pool using mysql2/promise.
*/
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',         
  password: '',         
  database: 'mufasa_manager',   
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;  