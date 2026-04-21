// models/report.model.js
const db = require('../util/database');

const getReportData = async (idEquipo, idProyecto, fechaInicio, fechaFin) => {
  const [team] = await db.query(
    `SELECT * FROM team WHERE id_team = ?`,
    [idEquipo]
  );

  const [project] = await db.query(
    `SELECT * FROM project WHERE id_project = ?`,
    [idProyecto]
  );

  const [members] = await db.query(
    `SELECT u.id_user, u.full_name, u.email
     FROM user u
     INNER JOIN user_team ut ON u.id_user = ut.id_user
     WHERE ut.id_team = ?
       AND u.is_active = 1`,
    [idEquipo]
  );

  const [logs] = await db.query(
    `SELECT l.*, u.full_name
     FROM log l
     INNER JOIN user u ON l.id_user = u.id_user
     INNER JOIN log_project lp ON l.id_log = lp.id_log
     WHERE lp.id_project = ?
       AND DATE(l.created_at) BETWEEN ? AND ?
     ORDER BY l.created_at DESC`,
    [idProyecto, fechaInicio, fechaFin]
  );

  const [achievements] = await db.query(
    `SELECT a.*, u.full_name
     FROM achievement a
     INNER JOIN user u ON a.id_user = u.id_user
     INNER JOIN user_team ut ON u.id_user = ut.id_user
     WHERE ut.id_team = ?
       AND DATE(a.created_at) BETWEEN ? AND ?
     ORDER BY a.created_at DESC`,
    [idEquipo, fechaInicio, fechaFin]
  );

  const [blockers] = await db.query(
    `SELECT b.*, u.full_name
     FROM blocker b
     INNER JOIN log l ON b.id_log = l.id_log
     INNER JOIN user u ON l.id_user = u.id_user
     INNER JOIN log_project lp ON l.id_log = lp.id_log
     WHERE lp.id_project = ?
       AND DATE(l.created_at) BETWEEN ? AND ?
     ORDER BY l.created_at DESC`,
    [idProyecto, fechaInicio, fechaFin]
  );

  const [goals] = await db.query(
    `SELECT g.*
     FROM goal g
     INNER JOIN goal_project gp ON g.id_goal = gp.id_goal
     WHERE gp.id_project = ?
     ORDER BY g.id_goal DESC`,
    [idProyecto]
  );

  return {
    equipo: team[0] || null,
    proyecto: project[0] || null,
    miembros: members,
    bitacoras: logs,
    logros: achievements,
    bloqueos: blockers,
    metas: goals,
  };
};

const getAiSummaryData = async (idEquipo, idProyecto, fechaInicio, fechaFin) => {
  return getReportData(idEquipo, idProyecto, fechaInicio, fechaFin);
};

const getProjectReportData = async (idProyecto) => {
  const [project] = await db.query(
    `SELECT * FROM project WHERE id_project = ?`,
    [idProyecto]
  );

  const [teams] = await db.query(
    `SELECT t.id_team, t.team_name, u.full_name AS leader_name, pt.assigned_at
     FROM project_team pt
     JOIN team t ON pt.id_team = t.id_team
     LEFT JOIN user u ON t.id_leader = u.id_user
     WHERE pt.id_project = ?`,
    [idProyecto]
  );

  const [members] = await db.query(
    `SELECT u.id_user, u.full_name, u.email, t.team_name
     FROM user_assignment ua
     JOIN user u ON ua.id_user = u.id_user
     LEFT JOIN team t ON ua.id_team = t.id_team
     WHERE ua.id_project = ?`,
    [idProyecto]
  );

  const [logs] = await db.query(
    `SELECT l.*, u.full_name,
            GROUP_CONCAT(DISTINCT t.team_name ORDER BY t.team_name SEPARATOR ', ') AS team_names
     FROM log l
     JOIN log_project lp ON l.id_log = lp.id_log
     JOIN user u ON l.id_user = u.id_user
     LEFT JOIN team t ON lp.id_team = t.id_team
     WHERE lp.id_project = ?
     GROUP BY l.id_log
     ORDER BY l.created_at DESC
     LIMIT 100`,
    [idProyecto]
  );

  const [blockers] = await db.query(
    `SELECT b.id_blocker, b.description, b.resolution_status,
            b.blocker_type, b.severity, b.detected_at,
            u.full_name AS reporter_name
     FROM blocker b
     JOIN log l ON b.id_log = l.id_log
     JOIN user u ON l.id_user = u.id_user
     JOIN log_project lp ON l.id_log = lp.id_log
     WHERE lp.id_project = ?
     ORDER BY
       FIELD(b.resolution_status, 'pending', 'resolved'),
       FIELD(b.severity, 'critical', 'high', 'medium', 'low'),
       b.detected_at DESC`,
    [idProyecto]
  );

  const [goals] = await db.query(
    `SELECT g.*
     FROM goal g
     INNER JOIN goal_project gp ON g.id_goal = gp.id_goal
     WHERE gp.id_project = ?`,
    [idProyecto]
  );

  return {
    proyecto: project[0] || null,
    equipos: teams,
    miembros: members,
    bitacoras: logs,
    bloqueos: blockers,
    metas: goals,
  };
};

module.exports = {
  getReportData,
  getAiSummaryData,
  getProjectReportData,
};