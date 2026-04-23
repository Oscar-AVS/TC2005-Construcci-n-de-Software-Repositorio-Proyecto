document.addEventListener('DOMContentLoaded', () => {
  const highlightForm = document.getElementById('highlightForm');
  const formMessage = document.getElementById('highlightFormMessage');
  const highlightsGrid = document.getElementById('highlightsGrid');
  const emptyState = document.getElementById('highlightsEmptyState');
  const itemCount = document.querySelector('.item-count');

  if (!highlightForm) {
    return;
  }

  const titleInput = document.getElementById('highlightTitle');
  const projectInput = document.getElementById('highlightProject');
  const typeInput = document.getElementById('highlightType');
  const dateInput = document.getElementById('highlightDate');
  const descriptionInput = document.getElementById('highlightDesc');
  const impactInput = document.getElementById('highlightImpact');
  const csrfTokenInput = document.getElementById('csrfToken');
  const submitButton = highlightForm.querySelector('.btn-submit');
  const editingHighlightIdInput = document.getElementById('editingHighlightId');
  const highlightFormModeInput = document.getElementById('highlightFormMode');
  const cancelEditButton = document.getElementById('cancelHighlightEdit');

  const deleteModal = document.getElementById('deleteModal');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  const cancelDeleteBtn = document.getElementById('cancelDelete');

  let highlightToDelete = null;
  let cardToDelete = null;

  const requiredInputs = [
    titleInput,
    typeInput,
    dateInput,
    descriptionInput,
  ];

  const showFormMessage = (message, isError = false) => {
    formMessage.textContent = message;
    formMessage.style.display = 'block';
    formMessage.style.color = isError ? '#b42318' : '#027a48';
  };

  const clearFormMessage = () => {
    formMessage.textContent = '';
    formMessage.style.display = 'none';
  };

  const clearValidationStyles = () => {
    requiredInputs.forEach((input) => {
      input.style.border = '';
    });
  };

  const markInvalidFields = () => {
    if (!titleInput.value.trim()) {
      titleInput.style.border = '1px solid #f04438';
    }

    if (!typeInput.value) {
      typeInput.style.border = '1px solid #f04438';
    }

    if (!dateInput.value) {
      dateInput.style.border = '1px solid #f04438';
    }

    if (!descriptionInput.value.trim()) {
      descriptionInput.style.border = '1px solid #f04438';
    }
  };

  const formatHighlightDate = (dateString) => {
    const parsedDate = new Date(`${dateString}T00:00:00`);

    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const normalizeLabel = (highlight) => {
    if (highlight.project_name) {
      return highlight.project_name;
    }

    if (highlight.team_name) {
      return highlight.team_name;
    }

    if (highlight.highlight_type) {
      return highlight.highlight_type.charAt(0).toUpperCase() + highlight.highlight_type.slice(1);
    }

    return 'Highlight';
  };

  const updateItemCount = () => {
    const totalHighlights = highlightsGrid
      ? highlightsGrid.querySelectorAll('.highlight-card').length
      : 0;

    if (!itemCount) {
      return;
    }

    itemCount.textContent = `${totalHighlights} highlight${totalHighlights === 1 ? '' : 's'}`;
  };

  const ensureEmptyStateVisibility = () => {
    const totalHighlights = highlightsGrid
      ? highlightsGrid.querySelectorAll('.highlight-card').length
      : 0;

    if (totalHighlights === 0) {
      if (highlightsGrid) {
        highlightsGrid.style.display = 'none';
      }

      if (emptyState) {
        emptyState.style.display = 'block';
      }
    } else {
      if (highlightsGrid) {
        highlightsGrid.style.display = 'grid';
      }

      if (emptyState) {
        emptyState.style.display = 'none';
      }
    }
  };

  const buildEditButtonHtml = (highlight) => {
    const safeTitle = String(highlight.title || '').replace(/"/g, '&quot;');
    const safeDescription = String(highlight.description || '').replace(/"/g, '&quot;');
    const safeImpact = String(highlight.impact || '').replace(/"/g, '&quot;');
    const safeType = String(highlight.highlight_type || '').replace(/"/g, '&quot;');
    const safeDate = String(highlight.highlight_date || '').replace(/"/g, '&quot;');
    const safeProject = String(highlight.id_project || '').replace(/"/g, '&quot;');

    return `
      <button
        class="btn-icon edit-highlight-btn"
        type="button"
        title="Edit"
        data-id="${highlight.id_highlight}"
        data-title="${safeTitle}"
        data-description="${safeDescription}"
        data-impact="${safeImpact}"
        data-type="${safeType}"
        data-date="${safeDate}"
        data-project="${safeProject}"
      >
        <i class="fa-solid fa-pen"></i>
      </button>
    `;
  };

  const createHighlightCard = (highlight) => {
    const card = document.createElement('div');
    card.className = 'highlight-card';
    card.setAttribute('data-id', highlight.id_highlight);

    const impactHtml = highlight.impact
      ? `
        <p class="highlight-desc">
          <strong>Impact:</strong> ${highlight.impact}
        </p>
      `
      : '';

    card.innerHTML = `
      <div class="highlight-header">
        <div class="highlight-icon">
          <i class="fa-solid fa-trophy"></i>
        </div>

        <span class="highlight-date">
          ${formatHighlightDate(highlight.highlight_date)}
        </span>
      </div>

      <h3 class="highlight-title">${highlight.title}</h3>

      <p class="highlight-desc">${highlight.description}</p>

      ${impactHtml}

      <div class="highlight-footer">
        <div class="highlight-tags">
          <span class="highlight-tag">${normalizeLabel(highlight)}</span>
        </div>

        <div class="highlight-actions">
          ${buildEditButtonHtml(highlight)}
          <button class="btn-icon btn-danger delete-highlight-btn" type="button" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    return card;
  };

  const updateHighlightCard = (highlight) => {
    const existingCard = document.querySelector(`.highlight-card[data-id="${highlight.id_highlight}"]`);

    if (!existingCard) {
      return;
    }

    const newCard = createHighlightCard(highlight);
    existingCard.replaceWith(newCard);
  };

  const insertNewHighlight = (highlight) => {
    if (!highlightsGrid) {
      return;
    }

    const newCard = createHighlightCard(highlight);
    highlightsGrid.insertAdjacentElement('afterbegin', newCard);

    updateItemCount();
    ensureEmptyStateVisibility();
  };

  const deleteHighlightCard = (cardElement) => {
    if (!cardElement) {
      return;
    }

    cardElement.remove();
    updateItemCount();
    ensureEmptyStateVisibility();
  };

  const resetFormToCreateMode = () => {
    highlightForm.reset();
    editingHighlightIdInput.value = '';
    highlightFormModeInput.value = 'create';
    submitButton.textContent = 'Add Highlight';
    cancelEditButton.style.display = 'none';
    clearValidationStyles();
    clearFormMessage();
  };

  const setFormToEditMode = (button) => {
    editingHighlightIdInput.value = button.dataset.id || '';
    highlightFormModeInput.value = 'edit';

    titleInput.value = button.dataset.title || '';
    descriptionInput.value = button.dataset.description || '';
    impactInput.value = button.dataset.impact || '';
    typeInput.value = button.dataset.type || '';
    dateInput.value = button.dataset.date || '';
    projectInput.value = button.dataset.project || '';

    submitButton.textContent = 'Save Changes';
    cancelEditButton.style.display = 'inline-flex';

    clearValidationStyles();
    clearFormMessage();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  requiredInputs.forEach((input) => {
    input.addEventListener('input', () => {
      input.style.border = '';
      clearFormMessage();
    });

    input.addEventListener('change', () => {
      input.style.border = '';
      clearFormMessage();
    });
  });

  cancelEditButton.addEventListener('click', () => {
    resetFormToCreateMode();
  });

  highlightForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormMessage();
    clearValidationStyles();

    const formData = {
      title: titleInput.value.trim(),
      id_project: projectInput.value,
      highlight_type: typeInput.value,
      highlight_date: dateInput.value,
      description: descriptionInput.value.trim(),
      impact: impactInput.value.trim(),
    };

    const requiredFieldsMissing =
      !formData.title ||
      !formData.description ||
      !formData.highlight_type ||
      !formData.highlight_date;

    if (requiredFieldsMissing) {
      markInvalidFields();
      showFormMessage(
        'Before adding this highlight, please complete all required fields.',
        true
      );
      return;
    }

    const isEditMode = highlightFormModeInput.value === 'edit';
    const editingId = editingHighlightIdInput.value;

    submitButton.disabled = true;
    submitButton.textContent = isEditMode ? 'Saving...' : 'Saving...';

    try {
      const endpoint = isEditMode
        ? `/manager/highlights/${editingId}`
        : '/manager/highlights';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfTokenInput.value,
        },
        body: JSON.stringify(formData),
      });

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(responseText || 'Unexpected server response.');
      }

      if (!response.ok) {
        showFormMessage(
          data.message || (isEditMode ? 'Could not update highlight.' : 'Could not save highlight.'),
          true
        );
        return;
      }

      showFormMessage(
        data.message || (isEditMode ? 'Highlight updated successfully.' : 'Highlight registered successfully.')
      );

      if (data.highlight) {
        if (isEditMode) {
          updateHighlightCard(data.highlight);
        } else {
          insertNewHighlight(data.highlight);
        }
      }

      resetFormToCreateMode();
      showFormMessage(
        data.message || (isEditMode ? 'Highlight updated successfully.' : 'Highlight registered successfully.')
      );
    } catch (error) {
      console.error(error);
      showFormMessage(error.message || 'Unexpected error while saving highlight.', true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = highlightFormModeInput.value === 'edit'
        ? 'Save Changes'
        : 'Add Highlight';
    }
  });

  document.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.edit-highlight-btn');

    if (editButton) {
      setFormToEditMode(editButton);
      return;
    }

    const deleteButton = event.target.closest('.delete-highlight-btn');

    if (!deleteButton) {
      return;
    }

    const highlightCard = deleteButton.closest('.highlight-card');

    if (!highlightCard) {
      return;
    }

    const highlightId = highlightCard.getAttribute('data-id');

    if (!highlightId) {
      return;
    }

    highlightToDelete = highlightId;
    cardToDelete = highlightCard;

    deleteModal.style.display = 'flex';
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!highlightToDelete) {
      return;
    }

    try {
      const response = await fetch(`/manager/highlights/${highlightToDelete}`, {
        method: 'DELETE',
        headers: {
          'CSRF-Token': csrfTokenInput.value,
        },
      });

      const responseText = await response.text();
      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(responseText || 'Unexpected server response.');
      }

      if (!response.ok) {
        showFormMessage(data.message || 'Could not delete highlight.', true);
        return;
      }

      deleteHighlightCard(cardToDelete);
      showFormMessage(data.message || 'Highlight deleted successfully.');
    } catch (error) {
      console.error(error);
      showFormMessage(error.message || 'Unexpected error while deleting highlight.', true);
    } finally {
      deleteModal.style.display = 'none';
      highlightToDelete = null;
      cardToDelete = null;
    }
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    highlightToDelete = null;
    cardToDelete = null;
  });

  ensureEmptyStateVisibility();
});