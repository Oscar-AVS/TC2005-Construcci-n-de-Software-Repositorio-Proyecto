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

  const showFormMessage = (message, isError = false) => {
    formMessage.textContent = message;
    formMessage.style.display = 'block';
    formMessage.style.color = isError ? '#b42318' : '#027a48';
  };

  const clearFormMessage = () => {
    formMessage.textContent = '';
    formMessage.style.display = 'none';
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
          <button class="btn-icon" type="button" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon btn-danger" type="button" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    return card;
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

  const insertNewHighlight = (highlight) => {
    if (!highlightsGrid) {
      return;
    }

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    highlightsGrid.style.display = 'grid';

    const newCard = createHighlightCard(highlight);
    highlightsGrid.insertAdjacentElement('afterbegin', newCard);

    updateItemCount();
  };

  highlightForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormMessage();

    const formData = {
      title: titleInput.value.trim(),
      id_project: projectInput.value,
      highlight_type: typeInput.value,
      highlight_date: dateInput.value,
      description: descriptionInput.value.trim(),
      impact: impactInput.value.trim(),
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
      const response = await fetch('/manager/highlights', {
        method: 'POST',
       headers: {
  'Content-Type': 'application/json',
  'CSRF-Token': csrfTokenInput.value,
},
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        showFormMessage(data.message || 'Could not save highlight.', true);
        return;
      }

      showFormMessage(data.message || 'Highlight registered successfully.');

      if (data.highlight) {
        insertNewHighlight(data.highlight);
      }

      highlightForm.reset();
    } catch (error) {
      console.error(error);
      showFormMessage('Unexpected error while saving highlight.', true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Add Highlight';
    }
  });
});