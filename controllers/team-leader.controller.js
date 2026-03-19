/**
 * Team Leader views controller.
 * Handles dashboard, team log and team members.
 */

exports.getDashboard = (req, res) => {
  res.render('team-leader/dashboard', {
    currentPage: 'dashboard',
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