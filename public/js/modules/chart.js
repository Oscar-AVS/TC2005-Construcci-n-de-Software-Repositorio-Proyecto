/**
 * Weekly activity chart module.
 * Handles Chart.js initialization, click events, and view switching.
 */

const ChartModule = (() => {
  let barChart = null;
  let currentView = 'personal';
  let selectedDayIndex = null;

  const byId = (id) => document.getElementById(id);

  // Sample data - will be replaced with real data from backend
  const personalData = [2, 4, 4, 7, 5, 1, 8];
  const organizationData = [12, 18, 15, 22, 19, 8, 25];

  // Day names for display
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get date for a day index (relative to current week)
  const getDateForDay = (dayIndex) => {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    
    return targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const buildBarColors = (data, selectedIndex = null) =>
    data.map((_, index) => {
      if (selectedIndex !== null && index === selectedIndex) {
        return '#f05a28'; // Selected day - accent color
      }
      if (index === data.length - 1 && selectedIndex === null) {
        return '#f05a28'; // Last day (today) when nothing selected
      }
      return '#f4c5b3'; // Default color
    });

  const updateSelectedDayIndicator = (dayIndex) => {
    const indicator = byId('selectedDayIndicator');
    const dayText = byId('selectedDayText');
    
    if (dayIndex !== null) {
      dayText.textContent = `${dayNames[dayIndex]}, ${getDateForDay(dayIndex)}`;
      indicator.style.display = 'flex';
    } else {
      indicator.style.display = 'none';
    }
  };

  const updateActivitiesDate = (dayIndex) => {
    const activitiesDate = byId('activitiesDate');
    const activitiesTitle = byId('activitiesTitle');
    const orgActivitiesDate = byId('orgActivitiesDate');
    const orgActivitiesTitle = byId('orgActivitiesTitle');
    
    if (dayIndex !== null) {
      const dateStr = getDateForDay(dayIndex);
      if (activitiesDate) activitiesDate.textContent = dateStr;
      if (activitiesTitle) activitiesTitle.textContent = `${dayNames[dayIndex]}'s Activities`;
      if (orgActivitiesDate) orgActivitiesDate.textContent = dateStr;
      if (orgActivitiesTitle) orgActivitiesTitle.textContent = `Organization Activity - ${dayNames[dayIndex]}`;
    } else {
      const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      if (activitiesDate) activitiesDate.textContent = today;
      if (activitiesTitle) activitiesTitle.textContent = "Today's Activities";
      if (orgActivitiesDate) orgActivitiesDate.textContent = today;
      if (orgActivitiesTitle) orgActivitiesTitle.textContent = 'Organization Activity';
    }
  };

  const handleBarClick = (event, elements) => {
    if (elements.length === 0) return;
    
    const clickedIndex = elements[0].index;
    
    // Toggle selection if clicking same bar
    if (selectedDayIndex === clickedIndex) {
      selectedDayIndex = null;
    } else {
      selectedDayIndex = clickedIndex;
    }
    
    // Update chart colors
    const data = currentView === 'personal' ? personalData : organizationData;
    barChart.data.datasets[0].backgroundColor = buildBarColors(data, selectedDayIndex);
    barChart.update();
    
    // Update UI
    updateSelectedDayIndicator(selectedDayIndex);
    updateActivitiesDate(selectedDayIndex);
  };

  const switchView = (view) => {
    currentView = view;
    selectedDayIndex = null;
    
    const data = view === 'personal' ? personalData : organizationData;
    const subtitle = byId('chartSubtitle');
    const personalSection = byId('personalActivities');
    const orgSection = byId('organizationActivities');
    
    // Update chart
    barChart.data.datasets[0].data = data;
    barChart.data.datasets[0].backgroundColor = buildBarColors(data);
    barChart.options.scales.y.max = view === 'personal' ? 10 : 30;
    barChart.update();
    
    // Update subtitle
    if (subtitle) {
      subtitle.textContent = view === 'personal' 
        ? 'Tasks completed per day' 
        : 'Organization-wide activities per day';
    }
    
    // Toggle sections visibility
    if (personalSection && orgSection) {
      personalSection.style.display = view === 'personal' ? 'block' : 'none';
      orgSection.style.display = view === 'organization' ? 'block' : 'none';
    }
    
    // Reset indicators
    updateSelectedDayIndicator(null);
    updateActivitiesDate(null);
  };

  const initEventListeners = () => {
    // View mode dropdown
    const viewSelect = byId('viewModeSelect');
    if (viewSelect) {
      viewSelect.addEventListener('change', (e) => switchView(e.target.value));
    }
    
    // Clear day selection button
    const clearBtn = byId('clearDaySelection');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        selectedDayIndex = null;
        const data = currentView === 'personal' ? personalData : organizationData;
        barChart.data.datasets[0].backgroundColor = buildBarColors(data);
        barChart.update();
        updateSelectedDayIndicator(null);
        updateActivitiesDate(null);
      });
    }
    
    // Team filter for organization view
    const teamFilter = byId('teamFilter');
    if (teamFilter) {
      teamFilter.addEventListener('change', (e) => {
        const selectedTeam = e.target.value;
        const groups = document.querySelectorAll('.team-activity-group');
        
        groups.forEach(group => {
          if (!selectedTeam || group.dataset.team === selectedTeam) {
            group.style.display = 'block';
          } else {
            group.style.display = 'none';
          }
        });
      });
    }
  };

  const init = (weeklyData = personalData) => {
    const canvas = byId('activityChart');

    if (!canvas) {
      console.warn('ChartModule: Canvas #activityChart not found');
      return;
    }

    if (typeof Chart === 'undefined') {
      console.warn('ChartModule: Chart.js not loaded');
      return;
    }

    if (barChart) {
      barChart.destroy();
    }

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [
          {
            data: weeklyData,
            backgroundColor: buildBarColors(weeklyData),
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
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
              label: (context) => `${context.raw} ${currentView === 'personal' ? 'tasks' : 'activities'}`,
            },
          },
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
        interaction: {
          intersect: true,
          mode: 'index',
        },
      },
    });

    initEventListeners();
  };

  const update = (weeklyData) => {
    if (!barChart) return;

    barChart.data.datasets[0].data = [...weeklyData];
    barChart.data.datasets[0].backgroundColor = buildBarColors(weeklyData, selectedDayIndex);
    barChart.update();
  };

  return { init, update, switchView };
})();