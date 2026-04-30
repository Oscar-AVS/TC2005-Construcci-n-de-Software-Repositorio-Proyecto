const CSRF = document.querySelector('meta[name="csrf-token"]')?.content || '';

// ── Utilidades ────────────────────────────────────────────────────────────────

function showMsg(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message ' + (isError ? 'error' : 'success');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function api(url, method, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'CSRF-Token': CSRF },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.goals-tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.goals-tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.goals-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tabTarget)?.classList.add('active');
  });
});

// ── Formulario (solo crear) ───────────────────────────────────────────────────

const goalForm  = document.getElementById('goalForm');
const formMsg   = document.getElementById('goalFormMessage');
const createBtn = document.getElementById('createGoalButton');
const draftBtn  = document.getElementById('saveDraftButton');
const listMsg   = document.getElementById('goalsListMessage');

async function submitGoal(saveMode) {
  const body = {
    title:       goalForm.title.value,
    description: goalForm.description.value,
    start_date:  goalForm.start_date.value,
    end_date:    goalForm.end_date.value,
    priority:    goalForm.priority.value,
    status:      goalForm.status.value,
    save_mode:   saveMode,
  };
  const data = await api('/manager/goals', 'POST', body);
  showMsg(formMsg, data.message, !data.success);
  if (data.success) { goalForm.reset(); setTimeout(() => location.reload(), 800); }
}

createBtn.addEventListener('click', () => submitGoal('create'));
draftBtn.addEventListener('click',  () => submitGoal('draft'));

// ── Modal de edición ──────────────────────────────────────────────────────────

const editModal   = document.getElementById('editGoalModal');
const editFormMsg = document.getElementById('editGoalFormMessage');
let editingId     = null;

function openEditModal()  { editModal.classList.add('active'); }
function closeEditModal() { editModal.classList.remove('active'); editingId = null; }

document.getElementById('closeEditGoalModalBtn').addEventListener('click', closeEditModal);
document.getElementById('cancelEditGoalModalBtn').addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

// ── Proyectos en el modal ─────────────────────────────────────────────────────

function renderLinkedProjects(linked) {
  const container = document.getElementById('editLinkedProjects');
  const noMsg     = document.getElementById('editNoLinkedMsg');

  container.querySelectorAll('.edit-linked-tag').forEach(t => t.remove());

  if (!linked.length) {
    noMsg.style.display = '';
    return;
  }

  noMsg.style.display = 'none';
  linked.forEach(p => addLinkedTag(p));
}

function addLinkedTag(p) {
  const container = document.getElementById('editLinkedProjects');
  const noMsg     = document.getElementById('editNoLinkedMsg');

  noMsg.style.display = 'none';

  const tag = document.createElement('span');
  tag.className = 'linked-project-tag edit-linked-tag';
  tag.dataset.projectId = p.id_project;
  tag.innerHTML = `<span class="linked-project-name">${p.project_name}</span>
    <button type="button" class="unlink-in-modal" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:1rem;line-height:1;padding:0 0 0 4px;" title="Unlink">×</button>`;

  tag.querySelector('.unlink-in-modal').addEventListener('click', async () => {
    const data = await api(`/manager/goals/${editingId}/unlink-project`, 'POST', { id_project: p.id_project });
    if (!data.success) { showMsg(editFormMsg, data.message, true); return; }

    tag.remove();
    if (!document.querySelector('.edit-linked-tag')) {
      document.getElementById('editNoLinkedMsg').style.display = '';
    }
    addProjectCheckbox(p);
  });

  container.appendChild(tag);
}

function renderUnlinkedProjects(unlinked) {
  const container = document.getElementById('editProjectCheckboxes');
  const noMsg     = document.getElementById('editNoAvailableMsg');
  const linkBtn   = document.getElementById('editLinkProjectsBtn');

  container.querySelectorAll('.edit-proj-row').forEach(r => r.remove());

  if (!unlinked.length) {
    noMsg.style.display = '';
    linkBtn.style.display = 'none';
    return;
  }

  noMsg.style.display = 'none';
  linkBtn.style.display = '';
  unlinked.forEach(p => addProjectCheckbox(p));
}

function addProjectCheckbox(p) {
  const container = document.getElementById('editProjectCheckboxes');
  const noMsg     = document.getElementById('editNoAvailableMsg');
  const linkBtn   = document.getElementById('editLinkProjectsBtn');

  noMsg.style.display = 'none';
  linkBtn.style.display = '';

  const row = document.createElement('label');
  row.className = 'project-option edit-proj-row';
  row.dataset.projectId = p.id_project;
  row.innerHTML = `<input type="checkbox" class="edit-link-cb" value="${p.id_project}"> <span>${p.project_name}</span>`;
  container.appendChild(row);
}

document.getElementById('editLinkProjectsBtn').addEventListener('click', async () => {
  if (!editingId) return;
  const checked = [...document.querySelectorAll('.edit-link-cb:checked')];
  if (!checked.length) { showMsg(editFormMsg, 'Select at least one project.', true); return; }

  const data = await api(`/manager/goals/${editingId}/link-project`, 'POST', { id_projects: checked.map(c => c.value) });
  showMsg(editFormMsg, data.message, !data.success);
  if (!data.success) return;

  checked.forEach(cb => {
    const row  = cb.closest('.edit-proj-row');
    const name = row.querySelector('span').textContent;
    row.remove();
    addLinkedTag({ id_project: cb.value, project_name: name });
  });

  if (!document.querySelector('.edit-proj-row')) {
    document.getElementById('editNoAvailableMsg').style.display = '';
    document.getElementById('editLinkProjectsBtn').style.display = 'none';
  }
});

// ── Abrir modal de edición ────────────────────────────────────────────────────

document.querySelectorAll('.edit-goal-button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const data = await api(`/manager/goals/${btn.dataset.goalId}`, 'GET');
    if (!data.success) return;
    const g = data.goal;
    editingId = btn.dataset.goalId;

    document.getElementById('editTitle').value       = g.title       || '';
    document.getElementById('editDescription').value = g.description || '';
    document.getElementById('editStartDate').value   = g.start_date  ? g.start_date.slice(0, 10) : '';
    document.getElementById('editEndDate').value     = g.end_date    ? g.end_date.slice(0, 10)   : '';
    document.getElementById('editPriority').value    = g.priority    || '';
    document.getElementById('editStatus').value      = g.status      || '';

    renderLinkedProjects(data.linkedProjects   || []);
    renderUnlinkedProjects(data.unlinkedProjects || []);

    openEditModal();
  });
});

document.getElementById('saveEditGoalBtn').addEventListener('click', async () => {
  if (!editingId) return;
  const body = {
    title:       document.getElementById('editTitle').value,
    description: document.getElementById('editDescription').value,
    start_date:  document.getElementById('editStartDate').value,
    end_date:    document.getElementById('editEndDate').value,
    priority:    document.getElementById('editPriority').value,
    status:      document.getElementById('editStatus').value,
    save_mode:   'create',
  };
  const data = await api(`/manager/goals/${editingId}`, 'PUT', body);
  showMsg(editFormMsg, data.message, !data.success);
  if (data.success) { closeEditModal(); setTimeout(() => location.reload(), 800); }
});

// ── Eliminar ──────────────────────────────────────────────────────────────────

const deleteModal   = document.getElementById('deleteGoalModal');
const cancelDelBtn  = document.getElementById('cancelDeleteBtn');
const confirmDelBtn = document.getElementById('confirmDeleteBtn');
let pendingDeleteId = null;

document.querySelectorAll('.delete-goal-button').forEach(btn => {
  btn.addEventListener('click', () => {
    pendingDeleteId = btn.dataset.goalId;
    deleteModal.classList.remove('hidden');
  });
});

cancelDelBtn.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});

document.querySelector('.custom-modal-backdrop')?.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  pendingDeleteId = null;
});

confirmDelBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  deleteModal.classList.add('hidden');
  const data = await api(`/manager/goals/${pendingDeleteId}/delete`, 'POST', {});
  showMsg(listMsg, data.message, !data.success);
  if (data.success) setTimeout(() => location.reload(), 800);
  pendingDeleteId = null;
});

// ── Panel de impacto ──────────────────────────────────────────────────────────

const impactEmpty   = document.getElementById('impactEmptyState');
const impactDetails = document.getElementById('impactGoalDetails');
let currentImpactId = null;

function renderTags(containerId, items, key) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.length
    ? items.map(i => `<span class="linked-project-tag"><span class="linked-project-name">${i[key] || '—'}</span></span>`).join('')
    : '<p class="goal-impact-empty-text">None found.</p>';
}

function renderLogs(containerId, logs) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = logs.length
    ? logs.map(l => `<div class="log-entry-compact"><span class="log-completed">${l.completed || '—'}</span><span class="log-date">${l.log_date ? new Date(l.log_date).toLocaleDateString('en-US') : ''}</span></div>`).join('')
    : '<p class="goal-impact-empty-text">No contributions found.</p>';
}

document.querySelectorAll('.impact-goal-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.impact-goal-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentImpactId = btn.dataset.impactGoalId;

    impactEmpty.classList.add('hidden');
    impactDetails.classList.remove('hidden');

    document.getElementById('impactGoalTitle').textContent       = btn.dataset.impactGoalTitle;
    document.getElementById('impactGoalDescription').textContent = btn.dataset.impactGoalDescription;
    document.getElementById('impactGoalPriority').textContent    = btn.dataset.impactGoalPriority;
    document.getElementById('impactGoalStart').textContent       = btn.dataset.impactGoalStart;
    document.getElementById('impactGoalEnd').textContent         = btn.dataset.impactGoalEnd;

    const status   = btn.dataset.impactGoalStatus;
    const statusEl = document.getElementById('impactGoalStatus');
    statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusEl.className   = `goal-status ${status}`;

    renderTags('impactProjectsList',   JSON.parse(btn.dataset.impactProjects   || '[]'), 'project_name');
    renderTags('impactTeamsList',      JSON.parse(btn.dataset.impactTeams      || '[]'), 'team_name');
    renderTags('impactHighlightsList', JSON.parse(btn.dataset.impactHighlights || '[]'), 'title');
    renderLogs('impactLogsList',       JSON.parse(btn.dataset.impactLogs       || '[]'));

    document.getElementById('impactSummaryEmpty').classList.remove('hidden');
    document.getElementById('impactSummaryContent').classList.add('hidden');
  });
});

// ── Generar resumen ───────────────────────────────────────────────────────────

document.getElementById('generateSummaryBtn')?.addEventListener('click', async () => {
  if (!currentImpactId) return;
  const btn = document.getElementById('generateSummaryBtn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  const data = await api(`/manager/goals/${currentImpactId}/impact-summary`, 'POST', {});
  btn.disabled = false;
  btn.textContent = 'Generate Summary';

  if (!data.success) { alert(data.message || 'Failed to generate summary.'); return; }

  const s = data.summary;
  document.getElementById('impactSummaryEmpty').classList.add('hidden');
  document.getElementById('impactSummaryContent').classList.remove('hidden');
  document.getElementById('impactSummaryOverall').textContent           = s.overall_impact     || '—';
  document.getElementById('impactSummaryTeamParticipation').textContent = s.team_participation || '—';

  const fillList = (id, items) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = (items || []).map(i => `<li>${i}</li>`).join('') || '<li>—</li>';
  };
  fillList('impactSummaryProjects',        s.projects_driving_goal);
  fillList('impactSummaryContributions',   s.key_contributions);
  fillList('impactSummaryHighlights',      s.relevant_highlights);
  fillList('impactSummaryRisks',           s.risks_gaps);
  fillList('impactSummaryRecommendations', s.recommendations);
});

// ── Exportar PDF ──────────────────────────────────────────────────────────────

document.getElementById('exportGoalPdfBtn')?.addEventListener('click', async () => {
  if (!currentImpactId) return;
  const btn = document.getElementById('exportGoalPdfBtn');
  btn.disabled = true;
  btn.textContent = 'Exporting...';

  const res = await fetch(`/manager/goals/${currentImpactId}/export-pdf`, {
    method: 'POST',
    headers: { 'CSRF-Token': CSRF, 'Content-Type': 'application/json' },
  });

  btn.disabled = false;
  btn.textContent = 'Export PDF';

  if (!res.ok) { alert('Failed to export PDF.'); return; }

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `goal-impact-${currentImpactId}.pdf` });
  a.click();
  URL.revokeObjectURL(url);
});
