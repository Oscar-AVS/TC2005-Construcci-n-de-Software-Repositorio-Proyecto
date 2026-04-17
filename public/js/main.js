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

  if (hasViewToggle && typeof TabsModule !== 'undefined') {
    TabsModule.init();
  } else if (byId('activityChart') || byId('personalActivityChart') || byId('orgActivityChart')) {
    if (typeof ChartModule !== 'undefined') {
      // For pages without tabs but with a chart, use ChartModule
      ChartModule.init();
    }
  }
});