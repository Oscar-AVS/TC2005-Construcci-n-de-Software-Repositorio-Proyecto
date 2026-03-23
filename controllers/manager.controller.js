/**
 * Manager views controller.
 * Handles dashboard, goals, highlights, history, reports, log, self-review and profile.
 */

/**
 * Renders the manager dashboard with high-level metrics and summaries.
 */
exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};

/**
 * Renders the goals management view for creating and editing strategic goals.
 */
exports.getGoals = (req, res) => {
  res.render('manager/goals', {
    currentPage: 'goals',
    role: 'manager',
  });
};

/**
 * Renders the highlights view for managing important achievements.
 */
exports.getHighlights = (req, res) => {
  res.render('manager/highlights', {
    currentPage: 'highlights',
    role: 'manager',
  });
};

/**
 * Renders the history view with advanced filtering by user, project, team and date.
 */
exports.getHistory = (req, res) => {
  res.render('manager/history', {
    currentPage: 'history',
    role: 'manager',
  });
};

/**
 * Renders the reports view with PDF/Excel export and AI summaries.
 */
exports.getReports = (req, res) => {
  res.render('manager/reports', {
    currentPage: 'reports',
    role: 'manager',
  });
};

/**
 * Renders the manager's personal log using shared view.
 */
exports.getLog = (req, res) => {
  res.render('shared/log', {
    currentPage: 'log',
    role: 'manager',
  });
};

/**
 * Renders the manager's self-review using shared view.
 */
exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'manager',
  });
};

/**
 * Renders the manager's profile using shared view.
 */
exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'manager',
  });
};