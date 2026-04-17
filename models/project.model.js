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
      `SELECT p.*, t.team_name, ua.id_team
       FROM project p
       JOIN user_assignment ua ON p.id_project = ua.id_project
       JOIN team t ON ua.id_team = t.id_team
       WHERE ua.id_user = ?`,
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

  static create(project_name, description, status, start_date, end_date) {
    return db.execute(
      `INSERT INTO project (project_name, description, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [project_name, description || null, status || 'active', start_date || null, end_date || null]
    );
  }

};