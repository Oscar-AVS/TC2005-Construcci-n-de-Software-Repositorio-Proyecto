/**
 * Project Manager Controller
 */
const User    = require('../models/user.model');
const Project = require('../models/project.model');
const bcrypt  = require('bcrypt');

exports.getDashboard = (req, res) => {
  res.render('project-manager/dashboard', {
    title: 'PM Dashboard',
    role: 'project-manager',
    currentPage: 'dashboard',
  });
};

exports.getReports = (req, res) => {
  res.render('project-manager/reports', {
    title: 'Reports',
    role: 'project-manager',
    currentPage: 'reports',
  });
};

exports.getLog = (req, res) => {
  res.render('shared/log', {
    title: 'My Log',
    role: 'project-manager',
    currentPage: 'log',
    logs: [],
    projects: [],
    filters: {},
    csrfToken: req.csrfToken(),
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    title: 'Self Review',
    role: 'project-manager',
    currentPage: 'self-review',
  });
};

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    if (!user) return res.status(404).send('User not found');

    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'project-manager',
      user,
      error: '',
      success: '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};