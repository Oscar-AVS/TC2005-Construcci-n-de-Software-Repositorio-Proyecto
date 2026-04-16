/**
 * Team model.
 * Handles database operations for the team table.
 */

const db = require('../util/database');

module.exports = class Team {
static fetchAll() {
    return db.execute(
    `SELECT t.id_team, t.team_name, t.description, t.created_at,
    u.id_user AS leader_id, u.full_name AS leader_name,
    m.full_name AS member_name, m.email AS member_email
    FROM team t
    LEFT JOIN user u ON t.id_leader = u.id_user
    LEFT JOIN user_team ut ON t.id_team = ut.id_team
    LEFT JOIN user m ON ut.id_user = m.id_user
    ORDER BY t.id_team DESC`
    );
}

static create(team_name, description, id_leader) {
    return db.execute(
    `INSERT INTO team (team_name, description, id_leader) VALUES (?, ?, ?)`,
    [team_name, description, id_leader]
    );
}

static update(id_team, team_name, description, id_leader) {
    return db.execute(
    `UPDATE team SET team_name = ?, description = ?, id_leader = ? WHERE id_team = ?`,
    [team_name, description, id_leader, id_team]
    );
}
static delete(id_team) {
    return db.execute(
    'DELETE FROM team WHERE id_team = ?',
    [id_team]
    );
}
};