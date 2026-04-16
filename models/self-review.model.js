/**
 * Self-review model.
 * Fetches employee data for AI-powered self-review generation.
 */

const db = require('../util/database');

const getEmployeeLogs = async (userId, from, to) => {
  const [rows] = await db.query(
    `SELECT l.completed, l.planned, l.created_at,
       GROUP_CONCAT(DISTINCT p.project_name ORDER BY p.project_name SEPARATOR ', ') AS projects
     FROM log l
     LEFT JOIN log_project lp ON l.id_log = lp.id_log
     LEFT JOIN project p ON lp.id_project = p.id_project
     WHERE l.id_user = ?
     AND DATE(l.created_at) BETWEEN ? AND ?
     GROUP BY l.id_log
     ORDER BY l.created_at DESC`,
    [userId, from, to]
  );
  return rows;
};

const getEmployeeAchievements = async (userId, from, to) => {
  const [rows] = await db.query(
    `SELECT description, created_at, validation_status
     FROM achievement
     WHERE id_user = ?
     AND DATE(created_at) BETWEEN ? AND ?
     ORDER BY created_at DESC`,
    [userId, from, to]
  );
  return rows;
};

const getEmployeeBlockers = async (userId, from, to) => {
  const [rows] = await db.query(
    `SELECT b.description, b.resolution_status, l.created_at
     FROM blocker b
     INNER JOIN log l ON b.id_log = l.id_log
     WHERE l.id_user = ?
     AND DATE(l.created_at) BETWEEN ? AND ?
     ORDER BY l.created_at DESC`,
    [userId, from, to]
  );
  return rows;
};

const getEmployeeProjectBreakdown = async (userId, from, to) => {
  const [rows] = await db.query(
    `SELECT p.project_name, COUNT(DISTINCT l.id_log) AS log_count
     FROM log l
     INNER JOIN log_project lp ON l.id_log = lp.id_log
     INNER JOIN project p ON lp.id_project = p.id_project
     WHERE l.id_user = ?
     AND DATE(l.created_at) BETWEEN ? AND ?
     GROUP BY p.id_project, p.project_name
     ORDER BY log_count DESC`,
    [userId, from, to]
  );
  return rows;
};

const getSelfReviewData = async (userId, from, to) => {
  const [logs, achievements, blockers, projectBreakdown] = await Promise.all([
    getEmployeeLogs(userId, from, to),
    getEmployeeAchievements(userId, from, to),
    getEmployeeBlockers(userId, from, to),
    getEmployeeProjectBreakdown(userId, from, to),
  ]);

  return { logs, achievements, blockers, projectBreakdown };
};

module.exports = { getSelfReviewData };
