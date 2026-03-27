/**
 * Log model.
 * Handles database operations for the log and log_project tables.
 */

const db = require('../util/database');

module.exports = class Log {
  static fetchAllByEmployee(id_user, filters = {}) {
    let query = `
      SELECT DISTINCT l.*,
        GROUP_CONCAT(DISTINCT p.project_name ORDER BY p.project_name SEPARATOR ', ') AS project_names,
        GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
      FROM log l
      JOIN log_project lp ON l.id_log = lp.id_log
      JOIN project p ON lp.id_project = p.id_project
      JOIN team t ON lp.id_team = t.id_team
      WHERE l.id_user = ?
    `;
    const params = [id_user];

    if (filters.id_project) {
      query += ' AND lp.id_project = ?';
      params.push(filters.id_project);
    }

    if (filters.date_from) {
      query += ' AND DATE(l.created_at) >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND DATE(l.created_at) <= ?';
      params.push(filters.date_to);
    }

    query += ' GROUP BY l.id_log ORDER BY l.created_at DESC';

    return db.execute(query, params);
  }

  static create(id_user, completed, planned) {
    return db.execute(
      `INSERT INTO log (id_user, completed, planned) VALUES (?, ?, ?)`,
      [id_user, completed, planned]
    );
  }

  static linkProjects(id_log, projects) {
    const values = projects.map((p) => [id_log, p.id_project, p.id_team]);
    return db.query(
      `INSERT INTO log_project (id_log, id_project, id_team) VALUES ?`,
      [values]
    );
  }

  static update(id_log, completed, planned) {
    return db.execute(
      `UPDATE log SET completed = ?, planned = ? WHERE id_log = ?`,
      [completed, planned, id_log]
    );
  }

  static updateProjects(id_log, projects) {
    return db.execute(
      `DELETE FROM log_project WHERE id_log = ?`,
      [id_log]
    ).then(() => {
      if (projects.length === 0) return;
      const values = projects.map((p) => [id_log, p.id_project, p.id_team]);
      return db.query(
        `INSERT INTO log_project (id_log, id_project, id_team) VALUES ?`,
        [values]
      );
    });
  }

  static delete(id_log) {
    return db.execute(
      'DELETE FROM log WHERE id_log = ?',
      [id_log]
    );
  }
};