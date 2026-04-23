/**
 * Log model.
 * Handles database operations for the log and log_project tables.
 */

const db = require("../util/database");

module.exports = class Log {
  static countAllByEmployee(id_user, filters = {}) {
    let query = `
      SELECT COUNT(DISTINCT l.id_log) as total
      FROM log l
      LEFT JOIN log_project lp ON l.id_log = lp.id_log
      WHERE l.id_user = ?
    `;
    const params = [id_user];

    if (filters.id_project) {
      query += " AND lp.id_project = ?";
      params.push(filters.id_project);
    }

    if (filters.date_from) {
      query += " AND DATE(l.created_at) >= ?";
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += " AND DATE(l.created_at) <= ?";
      params.push(filters.date_to);
    }

    return db.execute(query, params);
  }

  static fetchAllByEmployee(id_user, filters = {}, limit = 10, offset = 0) {
    let query = `
      SELECT DISTINCT l.*,
        GROUP_CONCAT(DISTINCT p.project_name ORDER BY p.project_name SEPARATOR ', ') AS project_names,
        GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
      FROM log l
      LEFT JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN project p ON lp.id_project = p.id_project
      LEFT JOIN team t ON lp.id_team = t.id_team
      WHERE l.id_user = ?
    `;
    const params = [id_user];

    if (filters.id_project) {
      query += " AND lp.id_project = ?";
      params.push(filters.id_project);
    }

    if (filters.date_from) {
      query += " AND DATE(l.created_at) >= ?";
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += " AND DATE(l.created_at) <= ?";
      params.push(filters.date_to);
    }

    query += " GROUP BY l.id_log ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    return db.query(query, params);
  }

  static create(id_user, completed, planned) {
    return db.execute(
      `INSERT INTO log (id_user, completed, planned) VALUES (?, ?, ?)`,
      [id_user, completed, planned],
    );
  }

  static linkProjects(id_log, projects) {
    const values = projects.map((p) => [id_log, p.id_project, p.id_team]);
    return db.query(
      `INSERT INTO log_project (id_log, id_project, id_team) VALUES ?`,
      [values],
    );
  }

  static update(id_log, completed, planned) {
    return db.execute(
      `UPDATE log SET completed = ?, planned = ? WHERE id_log = ?`,
      [completed, planned, id_log],
    );
  }

  static updateProjects(id_log, projects) {
    return db
      .execute(`DELETE FROM log_project WHERE id_log = ?`, [id_log])
      .then(() => {
        if (projects.length === 0) return;
        const values = projects.map((p) => [id_log, p.id_project, p.id_team]);
        return db.query(
          `INSERT INTO log_project (id_log, id_project, id_team) VALUES ?`,
          [values],
        );
      });
  }

  static delete(id_log) {
    return db.execute("DELETE FROM log WHERE id_log = ?", [id_log]);
  }

  static countByWeek(id_user, weekOffset = 0) {
    return db.execute(
      `SELECT WEEKDAY(created_at) AS weekday, COUNT(*) AS count
       FROM log
       WHERE id_user = ?
       AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE() - INTERVAL ? WEEK, 1)
       GROUP BY WEEKDAY(created_at)`,
      [id_user, weekOffset.toString()],
    );
  }

  static fetchToday(id_user) {
    return db.execute(
      `SELECT id_log, completed, planned, created_at
       FROM log
       WHERE id_user = ?
       AND DATE(created_at) = CURDATE()
       ORDER BY created_at DESC`,
      [id_user],
    );
  }
  static fetchByWeek(id_user, weekOffset = 0) {
    return db.execute(
      `SELECT id_log, completed, planned, created_at,
              WEEKDAY(created_at) AS weekday
       FROM log
       WHERE id_user = ?
       AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE() - INTERVAL ? WEEK, 1)
       ORDER BY created_at DESC`,
      [id_user, weekOffset.toString()],
    );
  }

  static countAllByTeams(id_teams, filters = {}) {
    if (!id_teams || id_teams.length === 0) return Promise.resolve([[{ total: 0 }]]);
    let query = `
      SELECT COUNT(DISTINCT l.id_log) as total
      FROM log l
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      WHERE lp.id_team IN (?)
    `;
    const params = [id_teams];

    if (filters.id_user) {
      query += " AND l.id_user = ?";
      params.push(filters.id_user);
    }

    if (filters.id_project) {
      query += " AND lp.id_project = ?";
      params.push(filters.id_project);
    }

    if (filters.date_from) {
      query += " AND DATE(l.created_at) >= ?";
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += " AND DATE(l.created_at) <= ?";
      params.push(filters.date_to);
    }

    return db.query(query, params);
  }

  static fetchAllByTeams(id_teams, filters = {}, limit = 10, offset = 0) {
    if (!id_teams || id_teams.length === 0) return Promise.resolve([[]]);
    let query = `
      SELECT DISTINCT 
        l.id_log, 
        l.completed, 
        l.planned, 
        l.created_at,
        u.full_name, 
        u.email, 
        u.avatar, 
        r.role_name AS role,
        GROUP_CONCAT(DISTINCT p.project_name ORDER BY p.project_name SEPARATOR ', ') AS project_name,
        b.description AS blocker_description
      FROM log l
      INNER JOIN user u ON l.id_user = u.id_user
      LEFT JOIN user_role ur ON u.id_user = ur.id_user
      LEFT JOIN role r ON ur.id_role = r.id_role
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      INNER JOIN project p ON lp.id_project = p.id_project
      LEFT JOIN blocker b ON l.id_log = b.id_log AND b.resolution_status = 'pending'
      WHERE lp.id_team IN (?)
    `;
    const params = [id_teams];

    if (filters.id_user) {
      query += " AND l.id_user = ?";
      params.push(filters.id_user);
    }

    if (filters.id_project) {
      query += " AND lp.id_project = ?";
      params.push(filters.id_project);
    }

    if (filters.date_from) {
      query += " AND DATE(l.created_at) >= ?";
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += " AND DATE(l.created_at) <= ?";
      params.push(filters.date_to);
    }

    query += " GROUP BY l.id_log ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    return db.query(query, params);
  }

  // ── Organization-wide queries ──

  static countByWeekAll(weekOffset = 0) {
    return db.execute(
      `SELECT WEEKDAY(created_at) AS weekday, COUNT(*) AS count
       FROM log
       WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE() - INTERVAL ? WEEK, 1)
       GROUP BY WEEKDAY(created_at)`,
      [weekOffset.toString()],
    );
  }

  static countTodayAll() {
    return db.execute(
      `SELECT COUNT(*) AS count FROM log WHERE DATE(created_at) = CURDATE()`,
    );
  }

  static fetchTodayAll() {
    return db.execute(
      `SELECT l.id_log, l.completed, l.created_at, u.full_name,
              GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
       FROM log l
       JOIN user u ON l.id_user = u.id_user
       LEFT JOIN log_project lp ON l.id_log = lp.id_log
       LEFT JOIN team t ON lp.id_team = t.id_team
       WHERE DATE(l.created_at) = CURDATE()
       GROUP BY l.id_log
       ORDER BY l.created_at DESC
       LIMIT 30`,
    );
  }

  static fetchByWeekAll(weekOffset = 0) {
    return db.execute(
      `SELECT l.id_log, l.completed, l.created_at, u.full_name,
              WEEKDAY(l.created_at) AS weekday,
              GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
       FROM log l
       JOIN user u ON l.id_user = u.id_user
       LEFT JOIN log_project lp ON l.id_log = lp.id_log
       LEFT JOIN team t ON lp.id_team = t.id_team
       WHERE YEARWEEK(l.created_at, 1) = YEARWEEK(CURDATE() - INTERVAL ? WEEK, 1)
       GROUP BY l.id_log
       ORDER BY l.created_at DESC`,
      [weekOffset.toString()],
    );
  }

    // (MANAGER): Metodo para contar cuantas entradas del historial cumplen con los filtros del manager
  static countHistoryByManagerFilters(filters = {}) {

    // Construye la consulta con joins para usuario, proyecto y equipo
    let query = `
      SELECT COUNT(DISTINCT l.id_log) AS total
      FROM log l
      INNER JOIN user u ON l.id_user = u.id_user
      LEFT JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN project p ON lp.id_project = p.id_project
      LEFT JOIN team t ON lp.id_team = t.id_team
      WHERE 1 = 1
    `;

    const params = [];

    // Filtra por usuario seleccionado
    if (filters.id_user) {
      query += ' AND l.id_user = ?';
      params.push(filters.id_user);
    }

    // Filtra por proyecto seleccionado
    if (filters.id_project) {
      query += ' AND lp.id_project = ?';
      params.push(filters.id_project);
    }

    // Filtra por equipo seleccionado
    if (filters.id_team) {
      query += ' AND lp.id_team = ?';
      params.push(filters.id_team);
    }

    // Filtra por fecha inicial
    if (filters.date_from) {
      query += ' AND DATE(l.created_at) >= ?';
      params.push(filters.date_from);
    }

    // Filtra por fecha final
    if (filters.date_to) {
      query += ' AND DATE(l.created_at) <= ?';
      params.push(filters.date_to);
    }

    return db.execute(query, params);
  }

  // (MANAGER) Metodo para traer el historial del manager aplicando 
  // filtros por usuario, proyecto, equipo y fechas
  static fetchHistoryByManagerFilters(filters = {}) {
    // Cconsulta con joins para usuario, proyecto y equipo
    let query = `
      SELECT DISTINCT
        l.id_log,
        l.completed,
        l.planned,
        l.created_at,
        u.id_user,
        u.full_name,
        p.id_project,
        p.project_name,
        t.id_team,
        t.team_name
      FROM log l
      INNER JOIN user u ON l.id_user = u.id_user
      LEFT JOIN log_project lp ON l.id_log = lp.id_log
      LEFT JOIN project p ON lp.id_project = p.id_project
      LEFT JOIN team t ON lp.id_team = t.id_team
      WHERE 1 = 1
    `;

    const params = [];

    // Filtra por usuario seleccionado
    if (filters.id_user) {
      query += ' AND l.id_user = ?';
      params.push(filters.id_user);
    }

    // Filtra por proyecto seleccionado
    if (filters.id_project) {
      query += ' AND lp.id_project = ?';
      params.push(filters.id_project);
    }

    // Filtra por equipo seleccionado
    if (filters.id_team) {
      query += ' AND lp.id_team = ?';
      params.push(filters.id_team);
    }

    // Filtra por fecha inicial
    if (filters.date_from) {
      query += ' AND DATE(l.created_at) >= ?';
      params.push(filters.date_from);
    }

    // Filtra por fecha final
    if (filters.date_to) {
      query += ' AND DATE(l.created_at) <= ?';
      params.push(filters.date_to);
    }

    // Ordena del mas reciente al mas antiguo
    query += ' ORDER BY l.created_at DESC';

    return db.execute(query, params);
  }
};
