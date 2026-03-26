/**
 * Employee views controller.
 * Handles dashboard, log, achievements, self-review, projects and profile.
 */

const User = require('../models/user.model.js');
const Project = require('../models/project.model.js');

exports.getDashboard = (req, res) => {
  res.render('employee/dashboard', {
    currentPage: 'dashboard',
    role: 'employee',
  });
};

exports.getLog = (req, res) => {
  res.render('shared/log', {
    currentPage: 'log',
    role: 'employee',
  });
};

exports.getAchievements = (req, res) => {
  res.render('employee/achievements', {
    currentPage: 'achievements',
    role: 'employee',
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'employee',
  });
};

exports.getProjects = (req, res) => {
  const activeUserId = 1;

  Project.fetchAllByEmployee(activeUserId)
    .then(([rows]) => {
      res.render('employee/projects', {
        currentPage: 'projects',
        role: 'employee',
        projects: rows,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getProfile = (req, res) => {
  const activeUserId = 1;

  User.fetchOne(activeUserId)
    .then(([rows]) => {
      if (rows.length > 0) {
        res.render('shared/profile', {
          currentPage: 'profile',
          role: 'employee',
          user: rows[0]
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