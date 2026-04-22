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

  static fetchAllByTeams(id_teams) {
    if (!id_teams || id_teams.length === 0) return Promise.resolve([[]]);
    return db.query(
      `SELECT DISTINCT p.id_project, p.project_name, p.description, p.progress_status, p.start_date,
              t.team_name, lp.id_team
       FROM project p
       JOIN log_project lp ON p.id_project = lp.id_project
       LEFT JOIN team t ON lp.id_team = t.id_team
       WHERE lp.id_team IN (?)
       ORDER BY p.project_name`,
      [id_teams]
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

  static fetchAssignedUsers(id_project) {
    return db.execute(
      `SELECT u.id_user, u.full_name, u.email,
              t.team_name,
              ua.assigned_at
       FROM user_assignment ua
       JOIN user u ON ua.id_user = u.id_user
       LEFT JOIN team t ON ua.id_team = t.id_team
       WHERE ua.id_project = ?
       ORDER BY ua.assigned_at DESC`,
      [id_project]
    );
  }
  
  static assignUser(id_project, id_user, id_team, assigned_by) {
    return db.execute(
      `INSERT INTO user_assignment (id_user, id_project, id_team, assigned_by) VALUES (?, ?, ?, ?)`,
      [id_user, id_project, id_team || null, assigned_by]
    );
  }
  
  static isUserAssigned(id_project, id_user) {
    return db.execute(
      `SELECT id_user FROM user_assignment WHERE id_project = ? AND id_user = ?`,
      [id_project, id_user]
    );
  }
  
  static removeUser(id_project, id_user) {
    return db.execute(
      `DELETE FROM user_assignment WHERE id_project = ? AND id_user = ?`,
      [id_project, id_user]
    );
  }

  static fetchActivity(id_project, limit = 50) {
    return db.execute(
      `SELECT l.id_log, l.completed, l.planned, l.created_at,
              u.full_name,
              GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
       FROM log l
       JOIN log_project lp ON l.id_log = lp.id_log
       JOIN user u ON l.id_user = u.id_user
       LEFT JOIN team t ON lp.id_team = t.id_team
       WHERE lp.id_project = ?
       GROUP BY l.id_log
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [id_project, limit.toString()]
    );
  }

};


