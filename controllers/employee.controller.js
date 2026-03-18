/**
 * Employee views controller.
 * Handles dashboard, log, achievements, self-review, projects and profile.
 */

exports.getDashboard = (req, res) => {
  res.render('employee/dashboard', {
    currentPage: 'dashboard',
  });
};

exports.getLog = (req, res) => {
  res.render('employee/log', {
    currentPage: 'log',
  });
};

exports.getAchievements = (req, res) => {
  res.render('employee/achievements', {
    currentPage: 'achievements',
  });
};

exports.getSelfReview = (req, res) => {
  res.render('employee/self-review', {
    currentPage: 'self-review',
  });
};

exports.getProjects = (req, res) => {
  res.render('employee/projects', {
    currentPage: 'projects',
  });
};

exports.getProfile = (req, res) => {
  res.render('employee/profile', {
    currentPage: 'profile',
  });
};