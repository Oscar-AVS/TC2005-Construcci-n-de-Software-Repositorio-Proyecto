/**
 * User model.
 * Handles database operations for the user table.
 */

const db = require('../util/database');

module.exports = class User {
  static findByEmail(email) {
    return db.execute('SELECT * FROM user WHERE email = ?', [email]);
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
      `SELECT u.id_user AS id, u.full_name, u.email, u.status,
        r.role_name AS role, ur.id_role,
        GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR '||') AS team
       FROM user u
       LEFT JOIN user_role ur ON u.id_user = ur.id_user
       LEFT JOIN role r ON ur.id_role = r.id_role
       LEFT JOIN user_team ut ON u.id_user = ut.id_user
       LEFT JOIN team t ON ut.id_team = t.id_team
       WHERE u.status != 'pending'
       GROUP BY u.id_user, u.full_name, u.email, u.status, r.role_name, ur.id_role
       ORDER BY u.id_user DESC`
    );
  }

  static create(full_name, email, password) {
    return db.execute(
      `INSERT INTO user (full_name, email, password) VALUES (?, ?, ?)`,
      [full_name, email, password]
    );
  }

  static assignRole(id_user, id_role) {
    return db.execute(
      `INSERT INTO user_role (id_user, id_role) VALUES (?, ?)`,
      [id_user, id_role]
    );
  }

  static update(id_user, full_name, email) {
    return db.execute(
      `UPDATE user SET full_name = ?, email = ? WHERE id_user = ?`,
      [full_name, email, id_user]
    );
  }

  static updateRole(id_user, id_role) {
    return db.execute(
      `UPDATE user_role SET id_role = ? WHERE id_user = ?`,
      [id_role, id_user]
    );
  }

  static fetchTeamByLeader(id_user) {
    return db.execute(
      'SELECT id_team FROM team WHERE id_leader = ?',
      [id_user]
    );
  }

  static fetchPending() {
    return db.execute(
      `SELECT id_user, full_name, email, status
       FROM user
       WHERE status = 'pending'
       ORDER BY id_user DESC`
    );
  }

  static countPending() {
    return db.execute(
      `SELECT COUNT(*) AS count FROM user WHERE status = 'pending'`
    );
  }

  static approve(id_user) {
    return db.execute(
      `UPDATE user SET status = 'active' WHERE id_user = ?`,
      [id_user]
    );
  }

  static rejectUser(id_user) {
    return db.execute(
      `UPDATE user SET status = 'inactive' WHERE id_user = ?`,
      [id_user]
    );
  }

  static createPending(full_name, email, password) {
    return db.execute(
      `INSERT INTO user (full_name, email, password, status) VALUES (?, ?, ?, 'pending')`,
      [full_name, email, password]
    );
  }

  static delete(id_user) {
    return db.execute(
      'DELETE FROM user WHERE id_user = ?',
      [id_user]
    );
  }
  static findBySlackUser(slack_user) {
    return db.execute(
      'SELECT * FROM user WHERE slack_user = ?',
      [slack_user]
    );
  }

  static updateSlack(id_user, slack_user) {
    return db.execute(
      'UPDATE user SET slack_user = ? WHERE id_user = ?',
      [slack_user, id_user]
    );
  }

  static updatePassword(id_user, hashedPassword) {
    return db.execute(
      'UPDATE user SET password = ? WHERE id_user = ?',
      [hashedPassword, id_user]
    );
  }

  static countActive() {
    return db.execute(
      `SELECT COUNT(*) AS count FROM user WHERE status = 'active'`
    );
  }

  static searchByNameEmail(query) {
    return db.execute(
      `SELECT id_user, full_name, email 
       FROM user 
       WHERE (full_name LIKE ? OR email LIKE ?) 
       AND status = 'active'
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
  }
};