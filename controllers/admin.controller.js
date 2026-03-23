/**
 * Admin views controller.
 * Handles system administration: users, teams, roles, integrations and profile.
 */

/**
 * Renders the admin dashboard with system overview metrics.
 */
exports.getDashboard = (req, res) => {
  res.render('admin/dashboard', {
    currentPage: 'dashboard',
    role: 'admin',
  });
};

/**
 * Renders the users management view for CRUD operations.
 */
exports.getUsers = (req, res) => {
  res.render('admin/users', {
    currentPage: 'users',
    role: 'admin',
  });
};

/**
 * Renders the teams management view for CRUD and member assignment.
 */
exports.getTeams = (req, res) => {
  res.render('admin/teams', {
    currentPage: 'teams',
    role: 'admin',
  });
};

/**
 * Renders the roles and permissions management view (RBAC).
 */
exports.getRoles = (req, res) => {
  res.render('admin/roles', {
    currentPage: 'roles',
    role: 'admin',
  });
};

/**
 * Renders the integrations configuration view.
 */
exports.getIntegrations = (req, res) => {
  res.render('admin/integrations', {
    currentPage: 'integrations',
    role: 'admin',
  });
};

/**
 * Renders the admin's profile using shared view.
 */
exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'admin',
  });
};