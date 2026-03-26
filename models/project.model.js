/**
 * Project model.
 * Handles database operations for project assignments.
 */

const db = require('../util/database');

module.exports = class Project {
static fetchAllByEmployee(id_user) {
    return db.execute(
        `SELECT p.*, t.team_name 
        FROM project p
        JOIN user_assignment ua ON p.id_project = ua.id_project
        JOIN team t ON ua.id_team = t.id_team
        WHERE ua.id_user = ?`,
    [id_user]
    );
}
};