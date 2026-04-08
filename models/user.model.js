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

  static fetchRoleByUser(id_user) {
    return db.execute(
      `SELECT r.role_name
       FROM role r
       JOIN user_role ur ON r.id_role = ur.id_role
       WHERE ur.id_user = ?`,
      [id_user]
    );
  }

  static fetchPrivilegesByUser(id_user) {
    return db.execute(
      `SELECT p.privilege_name
       FROM privilege p
       JOIN role_privilege rp ON p.id_privilege = rp.id_privilege
       JOIN user_role ur ON rp.id_role = ur.id_role
       WHERE ur.id_user = ?`,
      [id_user]
    );
  }
};