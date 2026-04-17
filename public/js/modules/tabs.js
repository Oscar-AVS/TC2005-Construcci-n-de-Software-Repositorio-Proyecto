const TabsModule = (() => {
  let personalChart = null;
  let orgChart = null;
  let selectedDayIndex = null;
  let selectedOrgDayIndex = null;

  const byId = (id) => document.getElementById(id);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Personal activities by day (0 = Monday, 6 = Sunday)
  const activitiesByDay = {
    0: [
      { text: 'Sprint planning meeting', completed: true },
      { text: 'Code review for PR #38', completed: true },
      { text: 'Update documentation', completed: false },
    ],
    1: [
      { text: 'Reviewed team weekly reports', completed: true },
      { text: 'Fixed authentication bug', completed: true },
      { text: 'Database migration prep', completed: true },
      { text: 'Team standup notes', completed: false },
    ],
    2: [
      { text: 'API endpoint implementation', completed: true },
      { text: 'Unit tests for user module', completed: true },
      { text: 'Design review meeting', completed: false },
      { text: 'Update project roadmap', completed: false },
    ],
    3: [
      { text: 'Deployed staging environment', completed: true },
      { text: 'Performance optimization', completed: true },
      { text: 'Client demo preparation', completed: true },
      { text: 'Bug triage session', completed: true },
      { text: 'Documentation updates', completed: true },
      { text: 'Code refactoring', completed: true },
      { text: 'Security audit review', completed: false },
    ],
    4: [
      { text: 'Weekly retrospective', completed: true },
      { text: 'Merge feature branch', completed: true },
      { text: 'Update CI/CD pipeline', completed: true },
      { text: 'Knowledge sharing session', completed: true },
      { text: 'Plan next sprint tasks', completed: false },
    ],
    5: [
      { text: 'Review pending PRs', completed: true },
    ],
    6: [
      { text: 'Reviewed team weekly reports', completed: true },
      { text: '1:1 meeting with Oscar', completed: true },
      { text: 'Prepare sprint planning for next week', completed: false },
      { text: 'Send status update to PM', completed: false },
    ],
  };

  // Organization activities by day and team
  const orgActivitiesByDay = {
    0: {
      mufasa: [
        { author: 'Francisco Arreola', desc: 'Set up project repository', time: '9:00 AM' },
        { author: 'Lakshmi Martinez', desc: 'Created initial wireframes', time: '11:30 AM' },
      ],
      phoenix: [
        { author: 'Carlos Mendez', desc: 'Database schema design', time: '10:00 AM' },
      ],
      delta: [
        { author: 'Juan Perez', desc: 'Requirements gathering meeting', time: '2:00 PM' },
      ],
    },
    1: {
      mufasa: [
        { author: 'Oscar Vilchis', desc: 'Implemented user authentication', time: '10:15 AM' },
        { author: 'Francisco Arreola', desc: 'Code review session', time: '3:00 PM' },
      ],
      phoenix: [
        { author: 'Sofia Torres', desc: 'API endpoints documentation', time: '11:00 AM' },
        { author: 'Carlos Mendez', desc: 'Unit tests for auth module', time: '4:00 PM' },
      ],
      delta: [
        { author: 'Ana García', desc: 'UI component library setup', time: '9:30 AM' },
      ],
    },
    2: {
      mufasa: [
        { author: 'Lakshmi Martinez', desc: 'Dashboard mockups v2', time: '10:00 AM' },
        { author: 'Oscar Vilchis', desc: 'Fixed login redirect bug', time: '2:30 PM' },
      ],
      phoenix: [
        { author: 'Víctor Esquivel', desc: 'CI/CD pipeline configuration', time: '9:00 AM' },
        { author: 'Sofia Torres', desc: 'Integration tests', time: '1:00 PM' },
      ],
      delta: [
        { author: 'Juan Perez', desc: 'Prototype review with stakeholders', time: '11:00 AM' },
        { author: 'Ana García', desc: 'Accessibility audit', time: '3:30 PM' },
      ],
    },
    3: {
      mufasa: [
        { author: 'Francisco Arreola', desc: 'Built MVC structure for SIGP', time: '9:30 AM' },
        { author: 'Oscar Vilchis', desc: 'Database migrations', time: '11:00 AM' },
        { author: 'Lakshmi Martinez', desc: 'User flow diagrams', time: '2:00 PM' },
        { author: 'Francisco Arreola', desc: 'Team sync meeting', time: '4:30 PM' },
      ],
      phoenix: [
        { author: 'Carlos Mendez', desc: 'Stripe API integration started', time: '10:00 AM' },
        { author: 'Sofia Torres', desc: 'OAuth flow implementation', time: '1:30 PM' },
        { author: 'Víctor Esquivel', desc: 'Load testing setup', time: '3:00 PM' },
      ],
      delta: [
        { author: 'Juan Perez', desc: 'Design system documentation', time: '9:00 AM' },
        { author: 'Ana García', desc: 'Component library v1 release', time: '4:00 PM' },
      ],
    },
    4: {
      mufasa: [
        { author: 'Oscar Vilchis', desc: 'Code refactoring session', time: '10:00 AM' },
        { author: 'Lakshmi Martinez', desc: 'Weekly design review', time: '2:00 PM' },
      ],
      phoenix: [
        { author: 'Carlos Mendez', desc: 'Payment flow testing', time: '11:00 AM' },
        { author: 'Víctor Esquivel', desc: 'Staging deployment', time: '3:30 PM' },
      ],
      delta: [
        { author: 'Ana García', desc: 'Sprint retrospective', time: '4:00 PM' },
      ],
    },
    5: {
      mufasa: [
        { author: 'Francisco Arreola', desc: 'Bug fixes batch', time: '10:00 AM' },
      ],
      phoenix: [],
      delta: [],
    },
    6: {
      mufasa: [
        { author: 'Francisco Arreola', desc: 'Built MVC structure for SIGP project', time: '2:30 PM' },
        { author: 'Lakshmi Martinez', desc: 'Designed new dashboard wireframes', time: '11:00 AM' },
        { author: 'Oscar Vilchis', desc: 'Blocker: Waiting for server access', time: '9:00 AM', blocker: true },
      ],
      phoenix: [
        { author: 'Carlos Mendez', desc: 'Integrated Stripe payment API', time: '3:45 PM' },
        { author: 'Sofia Torres', desc: 'Fixed authentication bug in OAuth flow', time: '1:20 PM' },
        { author: 'Víctor Esquivel', desc: 'Deployed staging environment', time: '9:30 AM' },
      ],
      delta: [
        { author: 'Juan Perez', desc: 'Completed dashboard redesign mockups', time: '4:00 PM' },
        { author: 'Ana García', desc: 'Wrote API documentation', time: '11:45 AM' },
      ],
    },
  };

  const getTeamMeta = (teamName) => {
    const teams = window.teamsData || [];
    const team = teams.find(t => t.team_name.toLowerCase() === teamName.toLowerCase());
    if (team) {
      return { name: team.team_name, project: team.description || 'General Project' };
    }
    return { name: teamName, project: 'General Project' };
  };

  const getDateForDay = (dayIndex, isOrg = false) => {
    const urlParams = new URLSearchParams(window.location.search);
    const offsetStr = isOrg ? urlParams.get('orgWeekOffset') : urlParams.get('weekOffset');
    const weeksAgo = parseInt(offsetStr) || 0;

    const today = new Date();
    today.setDate(today.getDate() - (weeksAgo * 7));

    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);

    return targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const buildBarColors = (data, selectedIndex, baseColor, accentColor) =>
    data.map((_, index) => {
      if (selectedIndex !== null) return index === selectedIndex ? accentColor : baseColor;
      const today = Math.min(window.todayWeekday !== undefined ? window.todayWeekday : 0, 4);
      return index === today ? accentColor : baseColor;
    });

  const buildOrgBarColors = (data, selectedIndex) =>
    data.map((_, index) => {
      if (selectedIndex !== null) return index === selectedIndex ? '#3b82f6' : '#93c5fd';
      const today = Math.min(window.todayWeekday !== undefined ? window.todayWeekday : 0, 4);
      return index === today ? '#3b82f6' : '#93c5fd';
    });

  const renderActivities = (dayIndex) => {
    const list = byId('personalActivityList');
    const titleEl = byId('personalActivitiesTitle') || byId('activitiesTitle');
    const dateEl = byId('personalActivitiesDate') || byId('activitiesDate');
    const countEl = byId('loggedCount');
    const completedEl = byId('personalCompletedCount');
    const pendingEl = byId('personalPendingCount');
    const statCompleted = byId('statCompletedPersonal');
    const statPending = byId('statPendingPersonal');

    if (!list) return;

    const logs = (window.logsByDay && window.logsByDay[dayIndex]) || [];

    if (titleEl) {
      titleEl.textContent = selectedDayIndex !== null
        ? `${dayNames[dayIndex]}'s Activities`
        : "Today's Activities";
    }
    if (dateEl) {
      dateEl.textContent = getDateForDay(dayIndex, false);
    }
    if (countEl) countEl.textContent = logs.length;

    if (logs.length > 0) {
      list.innerHTML = logs.map(
        (log) => `
        <li class="activity-item">
          <span class="activity-text">${log.completed}</span>
        </li>
      `
      ).join('');
    } else {
      list.innerHTML = `<li class="activity-item">
           <span class="activity-text" style="color: var(--text-muted);">No activities logged on ${dayNames[dayIndex]}.</span>
         </li>`;
    }

    const completed = logs.length;
    const pending = 0; // Assuming all logged are completed for now

    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = pending;
    if (statCompleted) statCompleted.textContent = completed;
    if (statPending) statPending.textContent = pending;
  };

  const renderOrgActivities = (dayIndex) => {
    const feed = byId('teamActivityFeed');
    const titleEl = byId('orgFeedTitle');
    const dateEl = byId('orgActivityDate');
    const teamFilter = byId('teamFilter');
    const selectedTeam = teamFilter ? teamFilter.value : '';

    if (!feed) return;

    if (titleEl) {
      titleEl.textContent = selectedOrgDayIndex !== null
        ? `${dayNames[dayIndex]}'s Activity`
        : 'Team Activity Feed';
    }
    if (dateEl) {
      dateEl.textContent = getDateForDay(dayIndex, true);
    }

    let html = '';
    
    // Group window.orgLogsByDay[dayIndex] by team
    const logs = (window.orgLogsByDay && window.orgLogsByDay[dayIndex]) || [];
    const orgLoggedCountEl = byId('orgLoggedCount');
    if (orgLoggedCountEl) orgLoggedCountEl.textContent = logs.length;
    const groupedData = {};
    logs.forEach(log => {
      // If no team, we can put them in an "Other" category or just skip.
      // Based on SQL query, `team_names` can be a comma string. Let's pick the first one, or "Other Team".
      const teamNamesArr = log.team_names ? log.team_names.split(', ') : ['Unassigned'];
      teamNamesArr.forEach(teamName => {
        if (!groupedData[teamName]) {
          const meta = getTeamMeta(teamName);
          groupedData[teamName] = { name: meta.name, project: meta.project, items: [] };
        }
        groupedData[teamName].items.push({
          author: log.full_name,
          desc: log.completed,
          blocker: false // Assuming false for logs without block info retrieved.
        });
      });
    });

    if (logs.length === 0 || Object.keys(groupedData).length === 0) {
      html = `
        <div class="team-activity-group">
          <ul class="team-activity-list">
            <li class="team-activity-item empty">
              <p class="no-activity-text">No activities found for this selection</p>
            </li>
          </ul>
        </div>
      `;
    } else {
      Object.keys(groupedData).forEach(teamKey => {
        const teamObj = groupedData[teamKey];
        // Ensure team match logic does not hide blindly
        const isHidden = selectedTeam !== '' && 
                         !teamKey.toLowerCase().includes(selectedTeam.toLowerCase());
        
        if (isHidden) return;

        html += `
          <div class="team-activity-group" data-team="${teamKey}">
            <div class="team-activity-header">
              <h3 class="team-name">
                <i class="fa-solid fa-people-group"></i> ${teamObj.name}
              </h3>
              <span class="team-project">${teamObj.project}</span>
            </div>
            <ul class="team-activity-list">
        `;

        teamObj.items.forEach(act => {
          const isBlocker = act.blocker === true;
          const authorName = act.author || 'User';
          const initial = authorName.charAt(0).toUpperCase();

          html += `
            <li class="team-activity-item${isBlocker ? ' blocker' : ''}">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #bfdbfe; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-weight: 700; font-size: 14px; flex-shrink: 0; margin-right: 12px;">
                ${initial}
              </div>
              <div class="activity-details">
                <p class="activity-author">${act.author}</p>
                <p class="activity-desc">${isBlocker ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}${act.desc}</p>
              </div>
            </li>
          `;
        });

        html += `
            </ul>
          </div>
        `;
      });
    }

    feed.innerHTML = html;
  };

  const handleActivityToggle = (e) => {
    if (e.target.type !== 'checkbox' || e.target.dataset.index === undefined) return;

    const dayIndex = parseInt(e.target.dataset.day, 10);
    const activityIndex = parseInt(e.target.dataset.index, 10);

    activitiesByDay[dayIndex][activityIndex].completed = e.target.checked;

    const item = e.target.closest('.activity-item');
    item.classList.toggle('completed', e.target.checked);

    const activities = activitiesByDay[dayIndex];
    const completed = activities.filter((a) => a.completed).length;
    const pending = activities.length - completed;

    const completedEl = byId('personalCompletedCount');
    const pendingEl = byId('personalPendingCount');
    const statCompleted = byId('statCompletedPersonal');
    const statPending = byId('statPendingPersonal');

    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = pending;
    if (statCompleted) statCompleted.textContent = completed;
    if (statPending) statPending.textContent = pending;
  };

  const handleBarClick = (event, elements) => {
    if (elements.length === 0) return;

    const clickedIndex = elements[0].index;

    if (selectedDayIndex === clickedIndex) {
      selectedDayIndex = null;
    } else {
      selectedDayIndex = clickedIndex;
    }

    const data = personalChart.data.datasets[0].data;
    personalChart.data.datasets[0].backgroundColor = buildBarColors(data, selectedDayIndex, '#f4c5b3', '#f05a28');
    personalChart.update();

    renderActivities(selectedDayIndex !== null ? selectedDayIndex : 6);
  };

  const handleOrgBarClick = (event, elements) => {
    if (elements.length === 0) return;

    const clickedIndex = elements[0].index;

    if (selectedOrgDayIndex === clickedIndex) {
      selectedOrgDayIndex = null;
    } else {
      selectedOrgDayIndex = clickedIndex;
    }

    const data = orgChart.data.datasets[0].data;
    orgChart.data.datasets[0].backgroundColor = buildOrgBarColors(data, selectedOrgDayIndex);
    orgChart.update();

    renderOrgActivities(selectedOrgDayIndex !== null ? selectedOrgDayIndex : 6);
  };

  const initPersonalChart = () => {
    const canvas = byId('personalActivityChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (personalChart) personalChart.destroy();

    const data = (window.personalWeeklyData || [0, 0, 0, 0, 0]).slice(0, 5);
    const personalMax = Math.max(...data, 4);

    personalChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          data: data,
          backgroundColor: buildBarColors(data, null, '#f4c5b3', '#f05a28'),
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
              label: (context) => `${context.raw} logs`,
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

    selectedDayIndex = null;
    renderActivities(Math.min(window.todayWeekday !== undefined ? window.todayWeekday : 6, 4));
  };

  const initOrgChart = () => {
    const canvas = byId('orgActivityChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (orgChart) orgChart.destroy();

    const data = (window.orgWeeklyData || [0, 0, 0, 0, 0]).slice(0, 5);
    const orgMax = Math.max(...data, 10);

    orgChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          data: data,
          backgroundColor: buildOrgBarColors(data, null),
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: handleOrgBarClick,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context) => dayNames[context[0].dataIndex],
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
            ticks: { stepSize: 1, color: '#9ca3af', font: { family: 'DM Sans', size: 11 } },
            grid: { color: '#f1f2f4' },
          },
        },
      },
    });

    selectedOrgDayIndex = null;
    renderOrgActivities(Math.min(window.todayWeekday !== undefined ? window.todayWeekday : 6, 4));
  };

  const switchTab = (tabId) => {
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    if (tabId === 'activity') {
      setTimeout(initPersonalChart, 100);
    }
  };

  const switchView = (viewId) => {
    const url = new URL(window.location);
    url.searchParams.set('view', viewId);
    window.history.pushState({}, '', url);

    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    document.querySelectorAll('.activity-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${viewId}`);
    });

    setTimeout(() => {
      if (viewId === 'personal') {
        initPersonalChart();
      } else {
        initOrgChart();
      }
    }, 100);
  };

  const initTeamFilter = () => {
    const teamFilter = byId('teamFilter');
    if (!teamFilter) return;

    teamFilter.addEventListener('change', () => {
      renderOrgActivities(selectedOrgDayIndex !== null ? selectedOrgDayIndex : 6);
    });
  };

  const init = () => {
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    const personalList = byId('personalActivityList');
    if (personalList) {
      personalList.addEventListener('change', handleActivityToggle);
    }

    initTeamFilter();

    // If NO tabs but YES view-mode-toggle, init personal chart immediately (Employee case)
    const hasTabs = document.querySelector('.dashboard-tabs');
    const hasViewToggle = document.querySelector('.view-mode-toggle');
    
    if (!hasTabs && hasViewToggle) {
      const urlParams = new URLSearchParams(window.location.search);
      const activeView = urlParams.get('view') || 'personal';
      if (activeView === 'organization') {
        setTimeout(initOrgChart, 100);
      } else {
        setTimeout(initPersonalChart, 100);
      }
    }
  };

  return { init };
})();