/**
 * Employee views controller.
 * Handles dashboard, log, achievements and self-review.
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