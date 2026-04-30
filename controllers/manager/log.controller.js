/**
 * Manager log controller.
 * Handles manager log history with filters and pagination.
 */

const Log = require('../../models/log.model');
const Blocker = require('../../models/blocker.model');
const Project = require('../../models/project.model');

exports.getLog = async (req, res) => {
  const activeUserId = req.session.userId;

  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Log.countAllByEmployee(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const [logs] = await Log.fetchAllByEmployee(activeUserId, filters, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    const logsWithBlockers = await Promise.all(
      logs.map(async (log) => {
        const [blockers] = await Blocker.fetchByLog(log.id_log);
        return { ...log, blockers };
      })
    );

    res.render('shared/log', {
      currentPage: 'log',
      role: 'manager',
      logBase: '/manager',
      logs: logsWithBlockers,
      projects,
      filters,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postLog = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.postLog(req, res);
};

exports.postEditLog = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.putLog(req, res);
};

exports.postDeleteLog = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.deleteLog(req, res);
};