/**
 * Project Manager Controller
 */

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
  });
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    title: 'Profile',
    role: 'project-manager',
    currentPage: 'profile',
  });
};