/**
 * Team Leader views controller.
 * Handles dashboard, personal log, team log, team members, team report, self-review and profile.
 */

exports.getDashboard = (req, res) => {
  res.render('team-leader/dashboard', {
    currentPage: 'dashboard',
    role: 'team-leader',
  });
};

exports.getLog = (req, res) => {
  res.render('shared/log', {
    currentPage: 'log',
    role: 'team-leader',
  });
};

exports.getTeamLog = (req, res) => {
  res.render('team-leader/team-log', {
    currentPage: 'team-log',
    role: 'team-leader',
  });
};

exports.getTeamMembers = (req, res) => {
  res.render('team-leader/team-members', {
    currentPage: 'team-members',
    role: 'team-leader',
  });
};

exports.getTeamReport = (req, res) => {
  res.render('team-leader/team-report', {
    currentPage: 'team-report',
    role: 'team-leader',
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'team-leader',
  });
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'team-leader',
  });
};