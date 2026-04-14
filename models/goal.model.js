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

};