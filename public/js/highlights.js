document.addEventListener('DOMContentLoaded', () => {
  const CSRF         = document.getElementById('csrfToken')?.value || '';
  const highlightForm  = document.getElementById('highlightForm');
  const formMessage    = document.getElementById('highlightFormMessage');
  const highlightsGrid = document.getElementById('highlightsGrid');
  const emptyState     = document.getElementById('highlightsEmptyState');
  const itemCount      = document.querySelector('.item-count');

  if (!highlightForm) return;

  // ── Utilidades ──────────────────────────────────────────────────────────────

  const showMsg = (el, text, isError = false) => {
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? '#b42318' : '#027a48';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  };

  const formatDate = (dateString) =>
    new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const normalizeLabel = (h) =>
    h.project_name || h.team_name ||
    (h.highlight_type ? h.highlight_type.charAt(0).toUpperCase() + h.highlight_type.slice(1) : 'Highlight');

  const updateItemCount = () => {
    if (!itemCount) return;
    const n = highlightsGrid ? highlightsGrid.querySelectorAll('.highlight-card').length : 0;
    itemCount.textContent = `${n} highlight${n === 1 ? '' : 's'}`;
  };

  const syncEmptyState = () => {
    const n = highlightsGrid ? highlightsGrid.querySelectorAll('.highlight-card').length : 0;
    if (highlightsGrid) highlightsGrid.style.display = n ? 'grid' : 'none';
    if (emptyState)     emptyState.style.display     = n ? 'none' : 'block';
  };

  // ── Crear card en DOM ────────────────────────────────────────────────────────

  const buildEditAttrs = (h) => {
    const esc = (v) => String(v || '').replace(/"/g, '&quot;');
    return `data-id="${h.id_highlight}" data-title="${esc(h.title)}"
      data-description="${esc(h.description)}" data-impact="${esc(h.impact)}"
      data-type="${esc(h.highlight_type)}" data-date="${esc(h.highlight_date)}"
      data-project="${esc(h.id_project)}"`;
  };

  const createCard = (h) => {
    const card = document.createElement('div');
    card.className = 'highlight-card';
    card.setAttribute('data-id', h.id_highlight);
    card.innerHTML = `
      <div class="highlight-header">
        <div class="highlight-icon"><i class="fa-solid fa-trophy"></i></div>
        <span class="highlight-date">${formatDate(h.highlight_date)}</span>
      </div>
      <h3 class="highlight-title">${h.title}</h3>
      <p class="highlight-desc">${h.description}</p>
      ${h.impact ? `<p class="highlight-impact"><span>Impact:</span> ${h.impact}</p>` : ''}
      <div class="highlight-footer">
        <div class="highlight-tags"><span class="highlight-tag">${normalizeLabel(h)}</span></div>
        <div class="highlight-actions">
          <button class="btn-icon edit-highlight-btn" type="button" title="Edit" ${buildEditAttrs(h)}>
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon btn-danger delete-highlight-btn" type="button" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
    return card;
  };

  // ── Formulario de crear ──────────────────────────────────────────────────────

  const titleInput       = document.getElementById('highlightTitle');
  const projectInput     = document.getElementById('highlightProject');
  const typeInput        = document.getElementById('highlightType');
  const dateInput        = document.getElementById('highlightDate');
  const descriptionInput = document.getElementById('highlightDesc');
  const impactInput      = document.getElementById('highlightImpact');
  const submitBtn        = highlightForm.querySelector('.btn-submit');

  const requiredInputs = [titleInput, typeInput, dateInput, descriptionInput];

  requiredInputs.forEach(inp => {
    inp.addEventListener('input',  () => { inp.style.border = ''; });
    inp.addEventListener('change', () => { inp.style.border = ''; });
  });

  highlightForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const missing = !titleInput.value.trim() || !typeInput.value ||
                    !dateInput.value || !descriptionInput.value.trim();
    if (missing) {
      requiredInputs.forEach(inp => { if (!inp.value.trim()) inp.style.border = '1px solid #f04438'; });
      showMsg(formMessage, 'Please complete all required fields.', true);
      return;
    }

    const body = {
      title:          titleInput.value.trim(),
      id_project:     projectInput.value,
      highlight_type: typeInput.value,
      highlight_date: dateInput.value,
      description:    descriptionInput.value.trim(),
      impact:         impactInput.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const res  = await fetch('/manager/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': CSRF },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { showMsg(formMessage, data.message || 'Could not save highlight.', true); return; }

      showMsg(formMessage, data.message || 'Highlight registered successfully.');
      if (data.highlight) {
        highlightsGrid.insertAdjacentElement('afterbegin', createCard(data.highlight));
        updateItemCount();
        syncEmptyState();
      }
      highlightForm.reset();
      requiredInputs.forEach(inp => { inp.style.border = ''; });
    } catch (err) {
      showMsg(formMessage, err.message || 'Unexpected error.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Highlight';
    }
  });

  // ── Modal de edición ─────────────────────────────────────────────────────────

  const editModal   = document.getElementById('editHighlightModal');
  const editMsg     = document.getElementById('editHighlightMessage');
  let   editingId   = null;

  const openEditModal  = () => editModal.classList.add('active');
  const closeEditModal = () => { editModal.classList.remove('active'); editingId = null; };

  document.getElementById('closeEditHighlightModal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditHighlightModal').addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-highlight-btn');
    if (!btn) return;

    editingId = btn.dataset.id;
    document.getElementById('editHighlightTitle').value   = btn.dataset.title       || '';
    document.getElementById('editHighlightDesc').value    = btn.dataset.description || '';
    document.getElementById('editHighlightImpact').value  = btn.dataset.impact      || '';
    document.getElementById('editHighlightType').value    = btn.dataset.type        || '';
    document.getElementById('editHighlightDate').value    = btn.dataset.date        || '';
    document.getElementById('editHighlightProject').value = btn.dataset.project     || '';

    editMsg.style.display = 'none';
    openEditModal();
  });

  document.getElementById('saveEditHighlightBtn').addEventListener('click', async () => {
    if (!editingId) return;

    const body = {
      title:          document.getElementById('editHighlightTitle').value.trim(),
      id_project:     document.getElementById('editHighlightProject').value,
      highlight_type: document.getElementById('editHighlightType').value,
      highlight_date: document.getElementById('editHighlightDate').value,
      description:    document.getElementById('editHighlightDesc').value.trim(),
      impact:         document.getElementById('editHighlightImpact').value.trim(),
    };

    if (!body.title || !body.highlight_type || !body.highlight_date || !body.description) {
      showMsg(editMsg, 'Please complete all required fields.', true);
      return;
    }

    const saveBtn = document.getElementById('saveEditHighlightBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res  = await fetch(`/manager/highlights/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'CSRF-Token': CSRF },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { showMsg(editMsg, data.message || 'Could not update highlight.', true); return; }

      if (data.highlight) {
        const existing = document.querySelector(`.highlight-card[data-id="${editingId}"]`);
        if (existing) existing.replaceWith(createCard(data.highlight));
      }

      closeEditModal();
      showMsg(formMessage, data.message || 'Highlight updated successfully.');
    } catch (err) {
      showMsg(editMsg, err.message || 'Unexpected error.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  // ── Modal de eliminar ────────────────────────────────────────────────────────

  const deleteModal    = document.getElementById('deleteHighlightModal');
  const confirmDelBtn  = document.getElementById('confirmDeleteHighlight');
  const cancelDelBtn   = document.getElementById('cancelDeleteHighlight');
  let   highlightToDelete = null;
  let   cardToDelete      = null;

  const openDeleteModal  = () => deleteModal.classList.add('active');
  const closeDeleteModal = () => { deleteModal.classList.remove('active'); highlightToDelete = null; cardToDelete = null; };

  cancelDelBtn.addEventListener('click', closeDeleteModal);
  deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

  document.addEventListener('click', (e) => {
    const btn  = e.target.closest('.delete-highlight-btn');
    if (!btn) return;
    const card = btn.closest('.highlight-card');
    if (!card) return;
    highlightToDelete = card.getAttribute('data-id');
    cardToDelete      = card;
    openDeleteModal();
  });

  confirmDelBtn.addEventListener('click', async () => {
    if (!highlightToDelete) return;

    try {
      const res  = await fetch(`/manager/highlights/${highlightToDelete}`, {
        method: 'DELETE',
        headers: { 'CSRF-Token': CSRF },
      });
      const data = await res.json();

      if (!res.ok) { showMsg(formMessage, data.message || 'Could not delete highlight.', true); return; }

      if (cardToDelete) cardToDelete.remove();
      updateItemCount();
      syncEmptyState();
      showMsg(formMessage, data.message || 'Highlight deleted successfully.');
    } catch (err) {
      showMsg(formMessage, err.message || 'Unexpected error.', true);
    } finally {
      closeDeleteModal();
    }
  });

  syncEmptyState();
});
