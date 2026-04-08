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

  static fetchAll() {
    return db.execute(
      `SELECT u.id_user AS id, u.full_name, u.email, u.username, u.is_active,
        r.role_name AS role, ur.id_role
       FROM user u
       LEFT JOIN user_role ur ON u.id_user = ur.id_user
       LEFT JOIN role r ON ur.id_role = r.id_role
       ORDER BY u.id_user DESC`
    );
  }

  static create(full_name, email, username, password) {
    return db.execute(
      `INSERT INTO user (full_name, email, username, password) VALUES (?, ?, ?, ?)`,
      [full_name, email, username, password]
    );
  }

  static assignRole(id_user, id_role) {
    return db.execute(
      `INSERT INTO user_role (id_user, id_role) VALUES (?, ?)`,
      [id_user, id_role]
    );
  }

  static update(id_user, full_name, email, username) {
    return db.execute(
      `UPDATE user SET full_name = ?, email = ?, username = ? WHERE id_user = ?`,
      [full_name, email, username, id_user]
    );
  }

  static updateRole(id_user, id_role) {
    return db.execute(
      `UPDATE user_role SET id_role = ? WHERE id_user = ?`,
      [id_role, id_user]
    );
  }
};