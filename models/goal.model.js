/**
 * Goal model.
 * Handles database operations for manager goals.
 */

const db = require('../util/database');

module.exports = class Goal {
  static fetchAllByManager(idUser) {
    return db.execute(
      `SELECT
        id_goal,
        title,
        description,
        start_date,
        end_date,
        priority,
        status,
        is_draft,
        id_user,
        created_at,
        updated_at
      FROM goal
      WHERE id_user = ?
      ORDER BY created_at DESC`,
      [idUser]
    );
  }
};