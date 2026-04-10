/**
 * Blocker model.
 * Handles database operations for the blocker table.
 */

const db = require('../util/database');

module.exports = class Blocker {
  static fetchByLog(id_log) {
    return db.execute(
      'SELECT * FROM blocker WHERE id_log = ?',
      [id_log]
    );
  }

  static create(id_log, description) {
    return db.execute(
      'INSERT INTO blocker (id_log, description) VALUES (?, ?)',
      [id_log, description]
    );
  }

  static updateStatus(id_blocker, resolution_status) {
    return db.execute(
      'UPDATE blocker SET resolution_status = ? WHERE id_blocker = ?',
      [resolution_status, id_blocker]
    );
  }

  static update(id_blocker, description, resolution_status) {
    return db.execute(
      'UPDATE blocker SET description = ?, resolution_status = ? WHERE id_blocker = ?',
      [description, resolution_status, id_blocker]
    );
  }

  static deleteByLog(id_log) {
    return db.execute(
      'DELETE FROM blocker WHERE id_log = ?',
      [id_log]
    );
  }

  static countActiveByUser(id_user) {
    return db.execute(
      `SELECT COUNT(*) AS count
       FROM blocker b
       INNER JOIN log l ON b.id_log = l.id_log
       WHERE l.id_user = ?
       AND b.resolution_status = 'pending'`,
      [id_user]
    );
  }
};