// models/Report.model.js
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
     AND a.created_at BETWEEN ? AND ?
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
     WHERE gp.id_project = ?`,
    [idProyecto]
  );

  return {
    equipo: team[0] || null,
    proyecto: project[0] || null,
    miembros: members,
    bitacoras: logs,
    logros: achievements,
    bloqueos: blockers,
    metas: goals
  };
};


const getAiSummaryData = async (idEquipo, idProyecto, fechaInicio, fechaFin) => {
  const data = await getReportData(idEquipo, idProyecto, fechaInicio, fechaFin);
  return data;
};

module.exports = { getReportData, getAiSummaryData };