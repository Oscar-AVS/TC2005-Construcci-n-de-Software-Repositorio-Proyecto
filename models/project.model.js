/**
 * Project model.
 * Handles database operations for project assignments.
 */

const db = require('../util/database');

module.exports = class Project {
  static fetchAllByEmployee(id_user) {
    return db.execute(
      `SELECT p.id_project, p.project_name, p.description, p.status, p.start_date, 
              COALESCE(t.team_name, 'Sin equipo asignado') AS team_name, ua.id_team
       FROM project p
       JOIN user_assignment ua ON p.id_project = ua.id_project
       LEFT JOIN team t ON ua.id_team = t.id_team
       WHERE ua.id_user = ?
       ORDER BY p.project_name`,
      [id_user]
    );
  }
};