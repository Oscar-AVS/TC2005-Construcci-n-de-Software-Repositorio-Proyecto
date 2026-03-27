/**
 * Blocker model.
 * Handles database operations for the blocker table.
 */

const db = require('../util/database');

module.exports = class Blocker {
static fetchByLog(id_log) {
    return db.execute(
      'SELECT * FROM blocker WHERE id_log = ?',
    [id_log]
    );
}

static create(id_log, description) {
    return db.execute(
    'INSERT INTO blocker (id_log, description) VALUES (?, ?)',
    [id_log, description]
    );
}

static updateStatus(id_blocker, resolution_status) {
    return db.execute(
    'UPDATE blocker SET resolution_status = ? WHERE id_blocker = ?',
    [resolution_status, id_blocker]
    );
}

static update(id_blocker, description, resolution_status) {
    return db.execute(
    'UPDATE blocker SET description = ?, resolution_status = ? WHERE id_blocker = ?',
    [description, resolution_status, id_blocker]
    );
  }

  static deleteByLog(id_log) {
    return db.execute(
    'DELETE FROM blocker WHERE id_log = ?',
    [id_log]
    );
  }
};