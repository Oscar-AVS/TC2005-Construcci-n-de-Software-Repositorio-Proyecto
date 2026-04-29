/**
 * Achievement model.
 * Handles CRUD operations for the achievement table.
 */

const db = require('../util/database');

module.exports = class Achievement {
  static countAllByUser(id_user, filters = {}) {
    let query = `SELECT COUNT(*) as total FROM achievement WHERE id_user = ?`;
    const params = [id_user];
    if (filters.date_from) { query += ' AND DATE(created_at) >= ?'; params.push(filters.date_from); }
    if (filters.date_to)   { query += ' AND DATE(created_at) <= ?'; params.push(filters.date_to); }
    return db.execute(query, params);
  }

  static fetchAllByUser(id_user, filters = {}, limit = 10, offset = 0) {
    let query = `SELECT id_achievement, title, description, created_at, validation_status
       FROM achievement WHERE id_user = ?`;
    const params = [id_user];
    if (filters.date_from) { query += ' AND DATE(created_at) >= ?'; params.push(filters.date_from); }
    if (filters.date_to)   { query += ' AND DATE(created_at) <= ?'; params.push(filters.date_to); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    return db.query(query, params);
  }

  static create(id_user, title, description, created_at) {
    return db.execute(
      `INSERT INTO achievement (id_user, title, description, created_at, validation_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [id_user, title, description || '', created_at]
    );
  }

  static delete(id_achievement, id_user) {
    return db.execute(
      `DELETE FROM achievement
       WHERE id_achievement = ? AND id_user = ?`,
      [id_achievement, id_user]
    );
  }

  static update(id_achievement, id_user, title, description, created_at) {
    return db.execute(
      `UPDATE achievement
       SET title = ?, description = ?, created_at = ?
       WHERE id_achievement = ? AND id_user = ?`,
      [title, description || '', created_at, id_achievement, id_user]
    );
  }

  // (MANAGER DASHBOARD) Metodo para contar achievements creados por el manager
static countByManager(idUser) {
  return db.execute(
    `SELECT COUNT(*) AS count
     FROM achievement
     WHERE id_user = ?`,
    [idUser]
  );
}
};
