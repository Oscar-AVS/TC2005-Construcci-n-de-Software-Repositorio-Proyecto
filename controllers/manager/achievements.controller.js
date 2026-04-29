/**
 * Manager achievements controller.
 * Handles achievement list view and delegates create/edit/delete actions.
 */

const Achievement = require('../../models/achievement.model');
const Project = require('../../models/project.model');

exports.getAchievements = async (req, res) => {
  const activeUserId = req.session.userId;

  const filters = {
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // Count records first to calculate pagination.
    const [[countResult]] = await Achievement.countAllByUser(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Fetch current page achievements and available projects.
    const [achievements] = await Achievement.fetchAllByUser(
      activeUserId,
      filters,
      limit,
      offset
    );

    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    res.render('employee/achievements', {
      currentPage: 'achievements',
      role: 'manager',
      achievementsBase: '/manager',
      achievements,
      projects,
      filters,
      totalRecords,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postAchievement = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.postAchievement(req, res);
};

exports.deleteAchievement = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.deleteAchievement(req, res);
};

exports.editAchievement = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.editAchievement(req, res);
};