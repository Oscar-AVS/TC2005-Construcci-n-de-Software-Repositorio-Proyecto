/**
 * Goal model.
 * Handles DB queries for strategic goals
 */

const db = require('../util/database');

/**
 * Inserts a new goal into the database.
 * @param {object} data - { title, goal_name, description, start_date, end_date, priority, status, id_project, id_user }
 */
exports.create = (data) => {
  const sql = `
    insert into goal
      (title, goal_name, description, start_date, end_date, priority, status, id_project, id_user, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, now())
  `;
  return db.execute(sql, [
    data.title,
    data.goal_name,
    data.description,
    data.start_date,
    data.end_date,
    data.priority,
    data.status,
    data.id_project || null,
    data.id_user,
  ]);
};

/**
 * Fetches all goals. Optionally filtered by status.
 * @param {string|null} status - 'active' | 'paused' | 'completed' | 'cancelled' | null
 */
exports.fetchAll = (status = null) => {
  if (status) {
    return db.execute(
      `select g.*, p.project_name
       from goal g
       left join project p on g.id_project = p.id_project
       where g.status = ?
       order by g.created_at desc`,
      [status]
    );
  }
  return db.execute(
    `select g.*, p.project_name
     from goal g
     left join project p on g.id_project = p.id_project
     order by g.created_at desc`
  );
};