/**
 * Frontend entry point.
 * Initializes modules based on current page context.
 */

document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);

  if (byId('loginScreen')) {
    LoginModule.init();
  }

  const hasViewToggle = document.querySelector('.view-mode-toggle');

  if (byId('activityChart') && !hasViewToggle) {
    const weeklyData = [3, 5, 4, 7, 6, 2, 4];
    ChartModule.init(weeklyData);
  }

  if (hasViewToggle && typeof ChartModule !== 'undefined') {
    ChartModule.init();
  }

  if (typeof TabsModule !== 'undefined' && (document.querySelector('.dashboard-tabs') || hasViewToggle)) {
    TabsModule.init();
  }
});