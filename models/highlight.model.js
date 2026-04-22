/**
 * Highlight model.
 * Handles database operations for manager highlights.
 */

const db = require('../util/database');

module.exports = class Highlight {
  static fetchAllByManager(idUser) {
    return db.execute(
      `SELECT
        h.id_highlight,
        h.id_user,
        h.id_project,
        h.id_team,
        h.title,
        h.description,
        h.impact,
        h.highlight_type,
        h.verification_status,
        h.highlight_date,
        h.created_at,
        h.updated_at,
        p.project_name,
        t.team_name
      FROM highlight h
      LEFT JOIN project p
        ON h.id_project = p.id_project
      LEFT JOIN team t
        ON h.id_team = t.id_team
      WHERE h.id_user = ?
      ORDER BY h.highlight_date DESC, h.created_at DESC`,
      [idUser]
    );
  }

  static create({
    idUser,
    idProject,
    idTeam,
    title,
    description,
    impact,
    highlightType,
    verificationStatus,
    highlightDate,
  }) {
    return db.execute(
      `INSERT INTO highlight (
        id_user,
        id_project,
        id_team,
        title,
        description,
        impact,
        highlight_type,
        verification_status,
        highlight_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        idUser,
        idProject,
        idTeam,
        title,
        description,
        impact,
        highlightType,
        verificationStatus,
        highlightDate,
      ]
    );
  }

  static fetchOneById(idHighlight, idUser) {
    return db.execute(
      `SELECT
        h.id_highlight,
        h.id_user,
        h.id_project,
        h.id_team,
        h.title,
        h.description,
        h.impact,
        h.highlight_type,
        h.verification_status,
        h.highlight_date,
        h.created_at,
        h.updated_at,
        p.project_name,
        t.team_name
      FROM highlight h
      LEFT JOIN project p
        ON h.id_project = p.id_project
      LEFT JOIN team t
        ON h.id_team = t.id_team
      WHERE h.id_highlight = ? AND h.id_user = ?
      LIMIT 1`,
      [idHighlight, idUser]
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
    static delete(idHighlight, idUser) {
    return db.execute(
      `DELETE FROM highlight
      WHERE id_highlight = ? AND id_user = ?`,
      [idHighlight, idUser]
    );
  }
};