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

  static fetchAssignedTeams(id_project) {
    return db.execute(
      `SELECT t.id_team, t.team_name, u.full_name AS leader_name
       FROM project_team pt
       JOIN team t ON pt.id_team = t.id_team
       LEFT JOIN user u ON t.id_leader = u.id_user
       WHERE pt.id_project = ?`,
      [id_project]
    );
  }

  static fetchAssignedUsers(id_project) {
    return db.execute(
      `SELECT u.id_user, u.full_name, u.email, t.team_name
       FROM user_assignment ua
       JOIN user u ON ua.id_user = u.id_user
       LEFT JOIN team t ON ua.id_team = t.id_team
       WHERE ua.id_project = ?`,
      [id_project]
    );
  }

  static fetchActivity(id_project, limit, offset, filters = {}) {
    let query = `
      SELECT l.id_log, l.created_at, u.full_name, l.completed
      FROM log l
      JOIN user u ON l.id_user = u.id_user
      JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN user_assignment ua ON u.id_user = ua.id_user AND lp.id_project = ua.id_project
      WHERE lp.id_project = ?
    `;
    const params = [id_project];

    if (filters.id_team) {
      query += ` AND ua.id_team = ?`;
      params.push(filters.id_team);
    }
    if (filters.id_user) {
      query += ` AND l.id_user = ?`;
      params.push(filters.id_user);
    }
    if (filters.date_from) {
      query += ` AND DATE(l.created_at) >= ?`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ` AND DATE(l.created_at) <= ?`;
      params.push(filters.date_to);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.execute(query, params);
  }

  static countActivity(id_project, filters = {}) {
    let query = `
      SELECT COUNT(DISTINCT l.id_log) AS total
      FROM log l
      JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN user u ON l.id_user = u.id_user
      LEFT JOIN user_assignment ua ON u.id_user = ua.id_user AND lp.id_project = ua.id_project
      WHERE lp.id_project = ?
    `;
    const params = [id_project];

    if (filters.id_team) {
      query += ` AND ua.id_team = ?`;
      params.push(filters.id_team);
    }
    if (filters.id_user) {
      query += ` AND l.id_user = ?`;
      params.push(filters.id_user);
    }
    if (filters.date_from) {
      query += ` AND DATE(l.created_at) >= ?`;
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      query += ` AND DATE(l.created_at) <= ?`;
      params.push(filters.date_to);
    }

    return db.execute(query, params);
  }

  static isTeamAssigned(id_project, id_team) {
    return db.execute(
      `SELECT * FROM project_team WHERE id_project = ? AND id_team = ?`,
      [id_project, id_team]
    );
  }

  static assignTeam(id_project, id_team, id_assigned_by) {
    return db.execute(
      `INSERT INTO project_team (id_project, id_team, assigned_by) VALUES (?, ?, ?)`,
      [id_project, id_team, id_assigned_by]
    );
  }

  static removeTeam(id_project, id_team) {
    return db.execute(
      `DELETE FROM project_team WHERE id_project = ? AND id_team = ?`,
      [id_project, id_team]
    );
  }

  static isUserAssigned(id_project, id_user) {
    return db.execute(
      `SELECT * FROM user_assignment WHERE id_project = ? AND id_user = ?`,
      [id_project, id_user]
    );
  }

  static assignUser(id_project, id_user, id_team, id_assigned_by) {
    return db.execute(
      `INSERT INTO user_assignment (id_project, id_user, id_team, assigned_by) VALUES (?, ?, ?, ?)`,
      [id_project, id_user, id_team, id_assigned_by]
    );
  }

  static removeUser(id_project, id_user) {
    return db.execute(
      `DELETE FROM user_assignment WHERE id_project = ? AND id_user = ?`,
      [id_project, id_user]
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

  static fetchAvailableForGoalLink() {
    return db.execute(
      `SELECT
        id_project,
        project_name,
        description,
        progress_status AS status,
        start_date
      FROM project
      WHERE progress_status != 'archived'
      ORDER BY project_name ASC`
    );
  }

  static countActive() {
    return db.execute(`SELECT COUNT(*) AS count FROM project WHERE progress_status = 'in_progress' OR progress_status = 'at_risk'`);
  }

  static countCompletedThisMonth() {
    return db.execute(
      `SELECT COUNT(*) AS count FROM project 
       WHERE progress_status = 'completed' 
       AND MONTH(COALESCE(end_date, created_at)) = MONTH(CURRENT_DATE()) 
       AND YEAR(COALESCE(end_date, created_at)) = YEAR(CURRENT_DATE())`
    );
  }

  static fetchGlobalActivity(limit = 10) {
    return db.execute(
      `SELECT l.created_at, u.full_name, l.completed, p.project_name
       FROM log l
       JOIN user u ON l.id_user = u.id_user
       JOIN log_project lp ON l.id_log = lp.id_log
       JOIN project p ON lp.id_project = p.id_project
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [limit]
    );
  }

};


