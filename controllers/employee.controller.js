/**
 * Employee views controller.
 * Handles dashboard, log, achievements, self-review, projects and profile.
 */

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
  res.render('employee/projects', {
    currentPage: 'projects',
    role: 'employee',
  });
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'employee',
  });
};