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
    if (resolution_status === 'resolved') {
      return db.execute(
        'UPDATE blocker SET resolution_status = ?, resolved_at = NOW() WHERE id_blocker = ?',
        [resolution_status, id_blocker]
      );
    }
    return db.execute(
      'UPDATE blocker SET resolution_status = ?, resolved_at = NULL WHERE id_blocker = ?',
      [resolution_status, id_blocker]
    );
  }

  static update(id_blocker, description, resolution_status) {
    if (resolution_status === 'resolved') {
      return db.execute(
        'UPDATE blocker SET description = ?, resolution_status = ?, resolved_at = NOW() WHERE id_blocker = ?',
        [description, resolution_status, id_blocker]
      );
    }
    return db.execute(
      'UPDATE blocker SET description = ?, resolution_status = ?, resolved_at = NULL WHERE id_blocker = ?',
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

  static countAllActive() {
    return db.execute(
      `SELECT COUNT(*) AS count
       FROM blocker
       WHERE resolution_status = 'pending'`
    );
  }

  // CU 4.10

  static fetchByProject(id_project, limit, offset) {
    let query = `
      SELECT b.id_blocker, b.description, b.resolution_status,
             b.blocker_type, b.severity, b.detected_at,
             u.full_name AS reporter_name,
             GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
      FROM blocker b
      JOIN log l ON b.id_log = l.id_log
      JOIN user u ON l.id_user = u.id_user
      JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN team t ON lp.id_team = t.id_team
      WHERE lp.id_project = ?
      GROUP BY b.id_blocker
      ORDER BY
        FIELD(b.resolution_status, 'pending', 'resolved'),
        FIELD(b.severity, 'critical', 'high', 'medium', 'low'),
        b.detected_at DESC
    `;
    const params = [id_project];
    
    if (limit !== undefined && offset !== undefined) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));
    }

    return db.query(query, params);
  }

  static countByProject(id_project) {
    return db.execute(
      `SELECT COUNT(DISTINCT b.id_blocker) AS total
       FROM blocker b
       JOIN log_project lp ON b.id_log = lp.id_log
       WHERE lp.id_project = ?`,
      [id_project]
    );
  }

  static fetchAllOrganizational() {
    return db.execute(
      `SELECT b.id_blocker, b.description, b.resolution_status,
              b.blocker_type, b.severity, b.detected_at,
              u.full_name AS reporter_name,
              p.project_name,
              GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
       FROM blocker b
       JOIN log l ON b.id_log = l.id_log
       JOIN user u ON l.id_user = u.id_user
       JOIN log_project lp ON l.id_log = lp.id_log
       JOIN project p ON lp.id_project = p.id_project
       LEFT JOIN team t ON lp.id_team = t.id_team
       GROUP BY b.id_blocker
       ORDER BY
         FIELD(b.resolution_status, 'pending', 'resolved'),
         FIELD(b.severity, 'critical', 'high', 'medium', 'low'),
         b.detected_at DESC`
    );
  }

  // (MANAGER DASHBOARD) Metodo para traer blockers activos sin usar columnas opcionales
static fetchActiveForManagerDashboard(limit = 3) {
  return db.query(
    `SELECT
       b.id_blocker,
       b.description,
       b.resolution_status,
       l.created_at,
       u.full_name AS reporter_name
     FROM blocker b
     INNER JOIN log l ON b.id_log = l.id_log
     INNER JOIN user u ON l.id_user = u.id_user
     WHERE b.resolution_status = 'pending'
     ORDER BY l.created_at DESC
     LIMIT ?`,
    [parseInt(limit, 10)]
  );
}
};