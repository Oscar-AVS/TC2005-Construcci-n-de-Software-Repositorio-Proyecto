/**
 * Achievement model.
 * Handles CRUD operations for the achievement table.
 */

const db = require('../util/database');

module.exports = class Achievement {
  static fetchAllByUser(id_user) {
    return db.execute(
      `SELECT id_achievement, title, description, created_at, validation_status
       FROM achievement
       WHERE id_user = ?
       ORDER BY created_at DESC`,
      [id_user]
    );
  }

  static create(id_user, title, description, created_at) {
    return db.execute(
      `INSERT INTO achievement (id_user, title, description, created_at, validation_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [id_user, title, description || '', created_at]
    );
  }

  static delete(id_achievement, id_user) {
    // Only allow deleting own pending achievements
    return db.execute(
      `DELETE FROM achievement
       WHERE id_achievement = ? AND id_user = ? AND validation_status = 'pending'`,
      [id_achievement, id_user]
    );
  }
};
