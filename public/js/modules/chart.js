/**
 * Weekly activity chart module.
 * Handles Chart.js initialization for personal and organization charts.
 */

const ChartModule = (() => {
  const byId = (id) => document.getElementById(id);

  const organizationData = [12, 18, 15, 22, 19];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  let personalChart = null;
  let selectedDay = null;

  const buildBarColors = (data, selected) =>
    data.map((_, i) => {
      if (selected !== null) return i === selected ? '#f05a28' : '#f4c5b3';
      const today = Math.min(window.todayWeekday, 4);
      return i === today ? '#f05a28' : '#f4c5b3';
    });

  const renderActivities = (dayIndex) => {
    const list = byId('personalActivityList');
    const title = byId('activitiesTitle');
    const date = byId('activitiesDate');
    const count = byId('loggedCount');

    if (!list) return;

    const logs = (window.logsByDay && window.logsByDay[dayIndex]) || [];

    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    const dateStr = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (title) title.textContent = `${dayNames[dayIndex]}'s Activities`;
    if (date) date.textContent = dateStr;
    if (count) count.textContent = logs.length;

    list.innerHTML = logs.length > 0
      ? logs.map((log) => `
          <li class="activity-item">
            <span class="activity-text">${log.completed}</span>
          </li>
        `).join('')
      : `<li class="activity-item">
           <span class="activity-text" style="color: var(--text-muted);">No activities logged on ${dayNames[dayIndex]}.</span>
         </li>`;
  };

  const handleBarClick = (event, elements) => {
    if (!elements || !elements.length) return;

    const clickedIndex = elements[0].index;

    if (selectedDay === clickedIndex) {
      selectedDay = null;
      const today = Math.min(window.todayWeekday, 4);
      renderActivities(today);
      const title = byId('activitiesTitle');
      const date = byId('activitiesDate');
      if (title) title.textContent = "Today's Activities";
      if (date) date.textContent = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
      selectedDay = clickedIndex;
      renderActivities(clickedIndex);
    }

    personalChart.data.datasets[0].backgroundColor = buildBarColors(personalChart.data.datasets[0].data, selectedDay);
    personalChart.update();
  };

  const init = () => {
    const personalData = (window.personalWeeklyData || [0, 0, 0, 0, 0]).slice(0, 5);
    const personalMax = Math.max(...personalData, 4);
    const orgMax = Math.max(...organizationData, 10);

    const personalCanvas = byId('personalActivityChart');
    if (personalCanvas && typeof Chart !== 'undefined') {
      personalChart = new Chart(personalCanvas, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [{
            data: personalData,
            backgroundColor: buildBarColors(personalData, null),
            borderRadius: 8,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: handleBarClick,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) => dayNames[context[0].dataIndex],
                label: (context) => `${context.raw} log${context.raw !== 1 ? 's' : ''}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'DM Sans', size: 12 } },
            },
            y: {
              beginAtZero: true,
              max: personalMax,
              border: { display: false },
              ticks: { stepSize: 1, color: '#9ca3af', font: { family: 'DM Sans', size: 11 } },
              grid: { color: '#f1f2f4' },
            },
          },
        },
      });
    }

    const orgCanvas = byId('orgActivityChart');
    if (orgCanvas && typeof Chart !== 'undefined') {
      new Chart(orgCanvas, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [{
            data: organizationData,
            backgroundColor: buildBarColors(organizationData, null),
            borderRadius: 8,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `${context.raw} activities`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#9ca3af', font: { family: 'DM Sans', size: 12 } },
            },
            y: {
              beginAtZero: true,
              max: orgMax,
              border: { display: false },
              ticks: { stepSize: 2, color: '#9ca3af', font: { family: 'DM Sans', size: 11 } },
              grid: { color: '#f1f2f4' },
            },
          },
        },
      });
    }
  };

  return { init };
})();