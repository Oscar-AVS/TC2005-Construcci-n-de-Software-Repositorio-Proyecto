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

  // Dashboard chart
  if (byId('activityChart')) {
    const weeklyData = [3, 5, 4, 7, 6, 2, 4];
    ChartModule.init(weeklyData);
  }

  // Activity list (dashboard)
  if (byId('activityList')) {
    const initialActivities = [
      { text: 'Completed homepage redesign', completed: false },
      { text: 'Fixed responsive issues', completed: false },
      { text: 'Write unit tests for signup form', completed: false },
      { text: 'Review and merge PR #42', completed: false },
    ];

    ActivitiesModule.init(initialActivities);
  }
});