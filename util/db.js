/**
 * MySQL connection pool using XAMPP defaults.
 */
const mysql = require('mysql2'); 

const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',
  database: 'mufasa_admin',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise(); 