/**
 * Activities module.
 * Handles activity list rendering and checkbox toggles.
 */

const ActivitiesModule = (() => {
  const byId = (id) => document.getElementById(id);

  let activities = [];

  const updateCounts = () => {
    const completed = activities.filter((a) => a.completed).length;
    const pending = activities.length - completed;

    const completedEl = byId('completedCount');
    const pendingEl = byId('pendingCount');
    const statCompleted = byId('statCompleted');
    const statPlanned = byId('statPlanned');

    if (completedEl) completedEl.textContent = completed;
    if (pendingEl) pendingEl.textContent = pending;
    if (statCompleted) statCompleted.textContent = completed;
    if (statPlanned) statPlanned.textContent = pending;
  };

  const render = () => {
    const list = byId('activityList');

    if (!list) {
      return;
    }

    list.innerHTML = activities
      .map(
        (activity, index) => `
        <li class="activity-item${activity.completed ? ' completed' : ''}">
          <label class="activity-check">
            <input type="checkbox" data-index="${index}"${activity.completed ? ' checked' : ''} />
            <span class="checkmark"></span>
          </label>
          <span class="activity-text">${activity.text}</span>
        </li>
      `
      )
      .join('');

    updateCounts();
  };

  const handleToggle = (e) => {
    if (e.target.type !== 'checkbox' || e.target.dataset.index === undefined) {
      return;
    }

    const index = parseInt(e.target.dataset.index, 10);
    activities[index].completed = e.target.checked;

    const item = e.target.closest('.activity-item');

    if (e.target.checked) {
      item.classList.add('completed');
    } else {
      item.classList.remove('completed');
    }

    updateCounts();
  };

  const init = (initialActivities) => {
    activities = initialActivities;

    const list = byId('activityList');

    if (list) {
      list.addEventListener('change', handleToggle);
    }

    render();
  };

  return { init, render };
})();