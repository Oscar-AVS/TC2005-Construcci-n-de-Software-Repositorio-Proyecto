/**
 * Manager controller bridge.
 * Exports all manager controller modules from smaller files.
 */

module.exports = {
  ...require('./manager/dashboard.controller'),
  ...require('./manager/goals.controller'),
  ...require('./manager/highlights.controller'),
  ...require('./manager/history.controller'),
  ...require('./manager/reports.controller'),
  ...require('./manager/log.controller'),
  ...require('./manager/selfReview.controller'),
  ...require('./manager/profile.controller'),
  ...require('./manager/goalImpact.controller'),
  ...require('./manager/achievements.controller'),
  ...require('./manager/projects.controller'),
};