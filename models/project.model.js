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

  static update(id_project, project_name, description, status, start_date, end_date) {
    return db.execute(
      `UPDATE project
       SET project_name = ?, description = ?, status = ?, start_date = ?, end_date = ?
       WHERE id_project = ?`,
      [project_name, description || null, status, start_date || null, end_date || null, id_project]
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

  static updateProgressStatus(id_project, progress_status, progress_percentage) {
    return db.execute(
      `UPDATE project
       SET progress_status = ?, progress_percentage = ?, last_progress_update = NOW()
       WHERE id_project = ?`,
      [progress_status, progress_percentage, id_project]
    );
  }

  static fetchAssignedTeams(id_project) {
    return db.execute(
      `SELECT t.id_team, t.team_name, t.description,
              u.full_name AS leader_name,
              pt.assigned_at
       FROM project_team pt
       JOIN team t ON pt.id_team = t.id_team
       LEFT JOIN user u ON t.id_leader = u.id_user
       WHERE pt.id_project = ?
       ORDER BY pt.assigned_at DESC`,
      [id_project]
    );
  }
  
  static assignTeam(id_project, id_team, assigned_by) {
    return db.execute(
      `INSERT INTO project_team (id_project, id_team, assigned_by) VALUES (?, ?, ?)`,
      [id_project, id_team, assigned_by]
    );
  }
  
  static isTeamAssigned(id_project, id_team) {
    return db.execute(
      `SELECT id_project FROM project_team WHERE id_project = ? AND id_team = ?`,
      [id_project, id_team]
    );
  }
  
  static removeTeam(id_project, id_team) {
    return db.execute(
      `DELETE FROM project_team WHERE id_project = ? AND id_team = ?`,
      [id_project, id_team]
    );
  }

};


