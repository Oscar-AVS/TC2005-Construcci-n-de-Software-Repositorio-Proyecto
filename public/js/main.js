/**
 * Frontend entry point.
 * Initializes modules based on current page context.
 */

document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);

  // Login page
  if (byId('loginScreen')) {
    LoginModule.init();
  }

  // Dashboard chart (for pages WITHOUT tabs AND WITHOUT view-mode-toggle)
  // e.g., Admin dashboard
  const hasViewToggle = document.querySelector('.view-mode-toggle');
  if (byId('activityChart') && !hasViewToggle) {
    const weeklyData = [3, 5, 4, 7, 6, 2, 4];
    ChartModule.init(weeklyData);
  }

  // Activity list (dashboard without tabs/toggle)
  if (byId('activityList') && !hasViewToggle) {
    const initialActivities = [
      { text: 'Completed homepage redesign', completed: true },
      { text: 'Fixed responsive issues', completed: true },
      { text: 'Write unit tests for signup form', completed: false },
      { text: 'Review and merge PR #42', completed: false },
    ];

    ActivitiesModule.init(initialActivities);
  }

  // TabsModule maneja:
  // 1. Dashboards CON tabs (Team Leader, Manager, PM)
  // 2. Dashboards SIN tabs pero CON view-mode-toggle (Employee)
  if (typeof TabsModule !== 'undefined' && (document.querySelector('.dashboard-tabs') || hasViewToggle)) {
    TabsModule.init();
  }
});