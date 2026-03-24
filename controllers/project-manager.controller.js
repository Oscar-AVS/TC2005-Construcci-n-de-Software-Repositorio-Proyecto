/**
 * Project Manager Controller
 * Handles all PM-related view rendering
 * RF covered: Project CRUD, scheduling, team assignment, activity tracking, reports
 */

// GET /project-manager/dashboard
exports.getDashboard = (req, res) => {
  res.render('project-manager/dashboard', {
    title: 'PM Dashboard',
    role: 'project-manager',
    currentPage: 'dashboard',
  });
};

// GET /project-manager/projects
exports.getProjects = (req, res) => {
  res.render('project-manager/projects', {
    title: 'Projects',
    role: 'project-manager',
    currentPage: 'projects',
  });
};

// GET /project-manager/project/:id
exports.getProjectDetail = (req, res) => {
  res.render('project-manager/project-detail', {
    title: 'Project Detail',
    role: 'project-manager',
    currentPage: 'projects',
  });
};

// GET /project-manager/reports
exports.getReports = (req, res) => {
  res.render('project-manager/reports', {
    title: 'Reports',
    role: 'project-manager',
    currentPage: 'reports',
  });
};

// GET /project-manager/log (personal log - uses shared view)
exports.getLog = (req, res) => {
  res.render('shared/log', {
    title: 'My Log',
    role: 'project-manager',
    currentPage: 'log',
  });
};

// GET /project-manager/self-review (uses shared view)
exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    title: 'Self Review',
    role: 'project-manager',
    currentPage: 'self-review',
  });
};

// GET /project-manager/profile (uses shared view)
exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    title: 'Profile',
    role: 'project-manager',
    currentPage: 'profile',
  });
};
