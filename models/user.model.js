/**
 * User model.
 * Handles database operations for the user table.
 */

const db = require('../util/database');

module.exports = class User {
  static findByUsername(username) {
    return db.execute('SELECT * FROM user WHERE username = ?', [username]);
  }

  static fetchOne(id_user) {
    return db.execute('SELECT * FROM user WHERE id_user = ?', [id_user]);
  }
};