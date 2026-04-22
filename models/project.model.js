/**
 * Project model.
 * Handles all database operations for project management.
 */
const db = require('../util/database');

module.exports = class Project {

  static fetchAll() {
    return db.execute(
      `SELECT p.*, t.team_name
       FROM project p
       LEFT JOIN user_assignment ua ON p.id_project = ua.id_project
       LEFT JOIN team t ON ua.id_team = t.id_team
       GROUP BY p.id_project`
    );
  }


  static fetchAllByEmployee(id_user) {
    return db.execute(
      `SELECT p.id_project, p.project_name, p.description, p.progress_status, p.start_date,
              COALESCE(t.team_name, 'Sin equipo asignado') AS team_name, ua.id_team
       FROM project p
       JOIN user_assignment ua ON p.id_project = ua.id_project
       LEFT JOIN team t ON ua.id_team = t.id_team
       WHERE ua.id_user = ?
       ORDER BY p.project_name`,
      [id_user]
    );
  }

  static fetchOne(id_project) {
    return db.execute(
      `SELECT * FROM project WHERE id_project = ?`,
      [id_project]
    );
  }

  static findByName(project_name) {
    return db.execute(
      `SELECT id_project FROM project WHERE project_name = ?`,
      [project_name]
    );
  }

  static findByNameExcluding(project_name, id_project) {
    return db.execute(
      `SELECT id_project FROM project WHERE project_name = ? AND id_project != ?`,
      [project_name, id_project]
    );
  }

  static create(project_name, description, progress_status, start_date, end_date) {
    return db.execute(
      `INSERT INTO project (project_name, description, progress_status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [project_name, description || null, progress_status || 'in_progress', start_date || null, end_date || null]
    );
  }

  static update(id_project, project_name, description, progress_status, start_date, end_date) {
    return db.execute(
      `UPDATE project
       SET project_name = ?, description = ?, progress_status = ?, start_date = ?, end_date = ?
       WHERE id_project = ?`,
      [project_name, description || null, progress_status, start_date || null, end_date || null, id_project]
    );
  }

  static delete(id_project) {
    return db.execute(
      `DELETE FROM project WHERE id_project = ?`,
      [id_project]
    );
  }

  static updateDates(id_project, start_date, end_date) {
    return db.execute(
      `UPDATE project SET start_date = ?, end_date = ? WHERE id_project = ?`,
      [start_date, end_date, id_project]
    );
  }

  static fetchAvailableForGoalLink() {
    return db.execute(
      `SELECT
        id_project,
        project_name,
        description,
        status,
        start_date
      FROM project
      WHERE status = 'active'
      ORDER BY project_name ASC`
    );
  }

};


