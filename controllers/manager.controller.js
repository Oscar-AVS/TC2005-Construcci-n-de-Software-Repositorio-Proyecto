/**
 * Manager views controller.
 * Handles dashboard, goals, highlights, history, reports, log, self-review and profile.
 */


const Log = require('../models/log.model');
const Blocker = require('../models/blocker.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const Goal = require('../models/goal.model');

exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};

exports.getGoals = (req, res) => {
  const activeUserId = 1;

  Goal.fetchAllByManager(activeUserId)
    .then(([goals]) => {
      res.render('manager/goals', {
        currentPage: 'goals',
        role: 'manager',
        goals,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getHighlights = (req, res) => {
  res.render('manager/highlights', {
    currentPage: 'highlights',
    role: 'manager',
  });
};

exports.getHistory = (req, res) => {
  res.render('manager/history', {
    currentPage: 'history',
    role: 'manager',
  });
};

exports.getReports = (req, res) => {
  res.render('manager/reports', {
    currentPage: 'reports',
    role: 'manager',
  });
};

exports.getLog = (req, res) => {
  const activeUserId = 1;
  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };

  Promise.all([
    Log.fetchAllByEmployee(activeUserId, filters),
    Project.fetchAllByEmployee(activeUserId),
  ])
    .then(([[logs], [projects]]) => {
      return Promise.all(
        logs.map((log) =>
          Blocker.fetchByLog(log.id_log).then(([blockers]) => ({
            ...log,
            blockers,
          }))
        )
      ).then((logsWithBlockers) => {
        res.render('shared/log', {
          currentPage: 'log',
          role: 'manager',
          logs: logsWithBlockers,
          projects,
          filters,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'manager',
  });
};

exports.getProfile = (req, res) => {
  const activeUserId = 1;

  User.fetchOne(activeUserId)
    .then(([rows]) => {
      if (rows.length > 0) {
        res.render('shared/profile', {
          currentPage: 'profile',
          role: 'manager',
          user: rows[0],
        });
      } else {
        res.status(404).send('User not found');
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};