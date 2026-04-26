/**
 * Manager history controller.
 * Handles filtered history logs for managers.
 */

const Log = require('../../models/log.model');
const Project = require('../../models/project.model');
const User = require('../../models/user.model');
const Team = require('../../models/team.model');

exports.getHistory = async (req, res) => {
  try {
    const filters = {
      id_user: req.query.id_user || '',
      id_project: req.query.id_project || '',
      id_team: req.query.id_team || '',
      date_from: req.query.date_from || '',
      date_to: req.query.date_to || '',
    };

    const [
      [historyLogs],
      [historyCountRows],
      [users],
      [projects],
      [teams],
    ] = await Promise.all([
      Log.fetchHistoryByManagerFilters(filters),
      Log.countHistoryByManagerFilters(filters),
      User.fetchUsersForHistory(),
      Project.fetchAll(),
      Team.fetchAllForSelect(),
    ]);

    const totalEntries = historyCountRows.length > 0 ? historyCountRows[0].total : 0;

    res.render('manager/history', {
      currentPage: 'history',
      role: 'manager',
      logs: historyLogs,
      totalEntries,
      users,
      projects,
      teams,
      filters,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};