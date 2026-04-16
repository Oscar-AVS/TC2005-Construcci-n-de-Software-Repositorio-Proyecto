/**
 * Project Manager Controller
 */

const User = require('../models/user.model');
const bcrypt = require('bcrypt');

exports.getDashboard = (req, res) => {
  res.render('project-manager/dashboard', {
    title: 'PM Dashboard',
    role: 'project-manager',
    currentPage: 'dashboard',
  });
};

exports.getProjects = (req, res) => {
  res.render('project-manager/projects', {
    title: 'Projects',
    role: 'project-manager',
    currentPage: 'projects',
  });
};

exports.getProjectDetail = (req, res) => {
  res.render('project-manager/project-detail', {
    title: 'Project Detail',
    role: 'project-manager',
    currentPage: 'projects',
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
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.generateSelfReview(req, res);
};

exports.exportSelfReviewPDF = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.exportSelfReviewPDF(req, res);
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    title: 'Profile',
    role: 'project-manager',
    currentPage: 'profile',
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

exports.postSlack = async (req, res) => {
  const { slack_user } = req.body;
  try {
    await User.updateSlack(req.session.userId, slack_user);
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'project-manager',
      user,
      error: '',
      success: 'Slack username updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postPassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'project-manager',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'project-manager',
        user,
        error: 'New passwords do not match.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updatePassword(req.session.userId, hashed);
    const [[updatedUser]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'project-manager',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};