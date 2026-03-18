// Helper to access elements by id
const byId = (id) => document.getElementById(id);

// App state
const state = {
  completedItems: ['Completed homepage redesign', 'Fixed responsive issues'],
  plannedItems: ['Write unit tests for signup form', 'Review and merge PR #42'],
  blocker: {
    title: 'Database access issue',
    description: 'Cannot access the database due to an authentication error.',
    reportedToLeader: false,
  },
  weeklyData: [3, 5, 4, 7, 6, 2, 4],
};

// Chart.js instance
let barChart = null;

// Prevent duplicate listeners
let dashboardEventsReady = false;

/**
 * Splits multiline text into a trimmed array without empty lines.
 * @param {string} text
 * @returns {string[]}
 */
const parseLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/**
 * Updates the status message element with a type class.
 * @param {string} message
 * @param {'info'|'success'|'danger'|'warning'} type
 */
const setStatus = (message, type = 'info') => {
  const element = byId('statusMessage');

  if (!element) {
    return;
  }

  element.className = `status-message ${type}`;
  element.textContent = message;
};

/**
 * Renders a list of items inside a ul element.
 * @param {HTMLElement|null} element
 * @param {string[]} items
 */
const renderList = (element, items) => {
  if (!element) {
    return;
  }

  element.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
};

/**
 * Syncs all dashboard DOM elements with current state.
 */
const render = () => {
  const { completedItems, plannedItems, blocker } = state;

  renderList(byId('completedList'), completedItems);
  renderList(byId('plannedList'), plannedItems);

  if (byId('completedCount')) {
    byId('completedCount').textContent = completedItems.length;
  }

  if (byId('plannedCount')) {
    byId('plannedCount').textContent = plannedItems.length;
  }

  if (byId('statCompleted')) {
    byId('statCompleted').textContent = completedItems.length;
  }

  if (byId('statPlanned')) {
    byId('statPlanned').textContent = plannedItems.length;
  }

  if (byId('statBlockers')) {
    byId('statBlockers').textContent = blocker.description ? 1 : 0;
  }

  if (byId('completedHint')) {
    byId('completedHint').style.display = completedItems.length ? 'none' : 'block';
  }

  if (byId('blockerTitle')) {
    byId('blockerTitle').textContent = blocker.title;
  }

  if (byId('blockerDesc')) {
    byId('blockerDesc').textContent = blocker.description || 'No blockers reported.';
  }

  if (byId('reportedCheckbox')) {
    byId('reportedCheckbox').checked = blocker.reportedToLeader;
  }

  if (byId('completedInput')) {
    byId('completedInput').value = completedItems.join('\n');
  }

  if (byId('plannedInput')) {
    byId('plannedInput').value = plannedItems.join('\n');
  }

  if (byId('blockerInput')) {
    byId('blockerInput').value = blocker.description;
  }

  setStatus('Ready.', 'info');
};

/**
 * Builds bar colors for the weekly chart.
 * @param {number[]} data
 * @returns {string[]}
 */
const buildBarColors = (data) =>
  data.map((_, index) => (index === data.length - 1 ? '#f05a28' : '#f4c5b3'));

/**
 * Creates or recreates the activity chart.
 */
const initBarChart = () => {
  const canvas = byId('activityChart');

  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  if (barChart) {
    barChart.destroy();
  }

  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          data: state.weeklyData,
          backgroundColor: buildBarColors(state.weeklyData),
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: '#9ca3af',
            font: { family: 'DM Sans', size: 12 },
          },
        },
        y: {
          beginAtZero: true,
          max: 10,
          border: { display: false },
          ticks: {
            stepSize: 2,
            color: '#9ca3af',
            font: { family: 'DM Sans', size: 11 },
          },
          grid: { color: '#f1f2f4' },
        },
      },
    },
  });
};

/**
 * Updates the chart with the latest state values.
 */
const updateBarChart = () => {
  if (!barChart) {
    return;
  }

  barChart.data.datasets[0].data = [...state.weeklyData];
  barChart.data.datasets[0].backgroundColor = buildBarColors(state.weeklyData);
  barChart.update();
};

/**
 * Saves current textarea values into state without final validation.
 */
const handleSaveDraft = () => {
  const completedInput = byId('completedInput');
  const plannedInput = byId('plannedInput');
  const blockerInput = byId('blockerInput');

  state.completedItems = parseLines(completedInput ? completedInput.value : '');
  state.plannedItems = parseLines(plannedInput ? plannedInput.value : '');
  state.blocker.description = blockerInput ? blockerInput.value.trim() : '';

  render();
  updateBarChart();
  setStatus('Draft saved successfully.', 'success');
};

/**
 * Validates and submits the daily report.
 */
const handleSubmit = () => {
  const completedInput = byId('completedInput');
  const plannedInput = byId('plannedInput');
  const blockerInput = byId('blockerInput');

  const completedItems = parseLines(completedInput ? completedInput.value : '');
  const plannedItems = parseLines(plannedInput ? plannedInput.value : '');
  const blockerText = blockerInput ? blockerInput.value.trim() : '';

  if (!completedItems.length && !plannedItems.length && !blockerText) {
    setStatus('Please add at least one item before submitting.', 'danger');
    return;
  }

  state.completedItems = completedItems;
  state.plannedItems = plannedItems;
  state.blocker.description = blockerText;

  state.weeklyData[6] = completedItems.length;

  render();
  updateBarChart();
  setStatus('Report submitted successfully.', 'warning');
};

/**
 * Attaches dashboard listeners only once.
 */
const initDashboardEvents = () => {
  if (dashboardEventsReady) {
    return;
  }

  const saveDraftButton = byId('saveDraftBtn');
  const submitButton = byId('submitBtn');
  const reportedCheckbox = byId('reportedCheckbox');

  if (saveDraftButton) {
    saveDraftButton.addEventListener('click', handleSaveDraft);
  }

  if (submitButton) {
    submitButton.addEventListener('click', handleSubmit);
  }

  if (reportedCheckbox) {
    reportedCheckbox.addEventListener('change', ({ target }) => {
      state.blocker.reportedToLeader = target.checked;
    });
  }

  dashboardEventsReady = true;
};

/**
 * Initializes dashboard rendering and chart.
 */
const initDashboard = () => {
  initDashboardEvents();
  render();
  initBarChart();
};

/**
 * Initializes login-related frontend behavior only.
 * The actual authentication is handled by the backend.
 */
const initLogin = () => {
  const passwordInput = byId('loginPass');
  const togglePassButton = byId('togglePass');
  const eyeIcon = byId('eyeIcon');
  const userInput = byId('loginUser');

  if (!passwordInput || !togglePassButton || !eyeIcon) {
    return;
  }

  togglePassButton.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';

    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  });

  if (userInput) {
    userInput.addEventListener('keydown', ({ key }) => {
      if (key === 'Enter') {
        passwordInput.focus();
      }
    });
  }
};

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = byId('loginScreen');
  const activityChart = byId('activityChart');

  // Initialize login only if login screen exists
  if (loginScreen) {
    initLogin();
  }

  // Initialize dashboard only if chart canvas exists
  if (activityChart) {
    initDashboard();
  }
});