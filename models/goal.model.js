/**
 * Goal model.
 * Handles database operations for manager goals.
 */

const db = require('../util/database');

module.exports = class Goal {
  static fetchAllByManager(idUser) {
    return db.execute(
      `SELECT
        id_goal,
        title,
        description,
        start_date,
        end_date,
        priority,
        status,
        is_draft,
        id_user,
        created_at,
        updated_at
      FROM goal
      WHERE id_user = ?
      ORDER BY created_at DESC`,
      [idUser]
    );
  }

  static fetchCreatedByManager(idUser) {
    return db.execute(
      `SELECT
        id_goal,
        title,
        description,
        start_date,
        end_date,
        priority,
        status,
        is_draft,
        id_user,
        created_at,
        updated_at
      FROM goal
      WHERE id_user = ?
        AND is_draft = 0
      ORDER BY created_at DESC`,
      [idUser]
    );
  }

  static create({
    title,
    description,
    startDate,
    endDate,
    priority,
    status,
    isDraft,
    idUser,
  }) {
    return db.execute(
      `INSERT INTO goal (
        title,
        description,
        start_date,
        end_date,
        priority,
        status,
        is_draft,
        id_user,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        description,
        startDate,
        endDate,
        priority,
        status,
        isDraft,
        idUser,
      ]
    );
  }

  static createAuditLog({
    idUser,
    action,
    entityType,
    entityId,
    success,
    detail,
  }) {
    return db.execute(
      `INSERT INTO audit_log (
        id_user,
        action,
        entity_type,
        entity_id,
        success,
        detail,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        idUser,
        action,
        entityType,
        entityId,
        success,
        detail,
      ]
    );
  }

  static fetchOneById(idGoal, idUser) {
    return db.execute(
      `SELECT
        id_goal,
        title,
        description,
        start_date,
        end_date,
        priority,
        status,
        is_draft,
        id_user,
        created_at,
        updated_at
      FROM goal
      WHERE id_goal = ? AND id_user = ?
      LIMIT 1`,
      [idGoal, idUser]
    );
  }

  static update({
    idGoal,
    title,
    description,
    startDate,
    endDate,
    priority,
    status,
    idUser,
  }) {
    return db.execute(
      `UPDATE goal
      SET
        title = ?,
        description = ?,
        start_date = ?,
        end_date = ?,
        priority = ?,
        status = ?,
        updated_at = NOW()
      WHERE id_goal = ? AND id_user = ?`,
      [
        title,
        description,
        startDate,
        endDate,
        priority,
        status,
        idGoal,
        idUser,
      ]
    );
  }

  static checkProjectLink(idGoal, idProject) {
    return db.execute(
      `SELECT
        id_goal,
        id_project
      FROM goal_project
      WHERE id_goal = ? AND id_project = ?`,
      [idGoal, idProject]
    );
  }

  static linkProject(idGoal, idProject, linkedBy) {
    return db.execute(
      `INSERT INTO goal_project (
        id_goal,
        id_project,
        linked_by
      ) VALUES (?, ?, ?)`,
      [idGoal, idProject, linkedBy]
    );
  }

  static fetchLinkedProjectsByGoal(idGoal) {
    return db.execute(
      `SELECT
        gp.id_goal,
        gp.id_project,
        gp.linked_by,
        gp.linked_at,
        p.project_name,
        p.status
      FROM goal_project gp
      INNER JOIN project p
        ON gp.id_project = p.id_project
      WHERE gp.id_goal = ?
      ORDER BY p.project_name ASC`,
      [idGoal]
    );
  }

  static fetchAllLinkedProjectsByManager(idUser) {
    return db.execute(
      `SELECT
        g.id_goal,
        gp.id_project,
        gp.linked_by,
        gp.linked_at,
        p.project_name,
        p.status
      FROM goal g
      LEFT JOIN goal_project gp
        ON g.id_goal = gp.id_goal
      LEFT JOIN project p
        ON gp.id_project = p.id_project
      WHERE g.id_user = ?
      ORDER BY g.created_at DESC, p.project_name ASC`,
      [idUser]
    );
  }

  static fetchGoalImpactProjectsByManager(idUser) {
    return db.execute(
      `SELECT
        g.id_goal,
        p.id_project,
        p.project_name,
        p.status
      FROM goal g
      INNER JOIN goal_project gp
        ON g.id_goal = gp.id_goal
      INNER JOIN project p
        ON gp.id_project = p.id_project
      WHERE g.id_user = ?
        AND g.is_draft = 0
      ORDER BY g.id_goal ASC, p.project_name ASC`,
      [idUser]
    );
  }

  static fetchGoalImpactTeamsByManager(idUser) {
    return db.execute(
      `SELECT DISTINCT
        g.id_goal,
        t.id_team,
        t.team_name
      FROM goal g
      INNER JOIN goal_project gp
        ON g.id_goal = gp.id_goal
      INNER JOIN project_team pt
        ON gp.id_project = pt.id_project
      INNER JOIN team t
        ON pt.id_team = t.id_team
      WHERE g.id_user = ?
        AND g.is_draft = 0
      ORDER BY g.id_goal ASC, t.team_name ASC`,
      [idUser]
    );
  }

    static fetchGoalImpactLogsByManager(idUser) {
    return db.execute(
      `SELECT DISTINCT
        g.id_goal,
        l.id_log,
        l.completed,
        l.planned,
        l.created_at,
        u.id_user,
        u.full_name,
        p.id_project,
        p.project_name
      FROM goal g
      INNER JOIN goal_project gp
        ON g.id_goal = gp.id_goal
      INNER JOIN project p
        ON gp.id_project = p.id_project
      INNER JOIN log_project lp
        ON p.id_project = lp.id_project
      INNER JOIN log l
        ON lp.id_log = l.id_log
      INNER JOIN user u
        ON l.id_user = u.id_user
      WHERE g.id_user = ?
        AND g.is_draft = 0
      ORDER BY g.id_goal ASC, l.created_at DESC`,
      [idUser]
    );
  }

  static unlinkProject(idGoal, idProject) {
    return db.execute(
      `DELETE FROM goal_project
      WHERE id_goal = ? AND id_project = ?`,
      [idGoal, idProject]
    );
  }

  static delete(idGoal, idUser) {
    return db.execute(
      `DELETE FROM goal
      WHERE id_goal = ? AND id_user = ?`,
      [idGoal, idUser]
    );
  }
};