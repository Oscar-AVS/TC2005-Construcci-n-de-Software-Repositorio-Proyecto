  const goalForm = document.getElementById('goalForm');
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  const goalFormMessage = document.getElementById('goalFormMessage');
  const goalsListMessage = document.getElementById('goalsListMessage');
  const goalFormTitle = document.getElementById('goalFormTitle');
  const saveDraftButton = document.getElementById('saveDraftButton');
  const createGoalButton = document.getElementById('createGoalButton');
  const cancelEditButton = document.getElementById('cancelEditButton');
  const editGoalButtons = document.querySelectorAll('.edit-goal-button');
  const deleteGoalButtons = document.querySelectorAll('.delete-goal-button');
  const linkProjectButtons = document.querySelectorAll('.link-project-button');
  const unlinkProjectButtons = document.querySelectorAll('.unlink-project-button');
  const projectDropdownToggles = document.querySelectorAll('.project-dropdown-toggle');
  const projectDropdownMenus = document.querySelectorAll('.project-dropdown-menu');
  const deleteModal = document.getElementById('deleteGoalModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

  const goalsTabButtons = document.querySelectorAll('.goals-tab-button');
  const goalsTabPanels = document.querySelectorAll('.goals-tab-panel');
  const impactGoalItems = document.querySelectorAll('.impact-goal-item');
  const impactEmptyState = document.getElementById('impactEmptyState');
  const impactGoalDetails = document.getElementById('impactGoalDetails');
  const impactGoalTitle = document.getElementById('impactGoalTitle');
  const impactGoalStatus = document.getElementById('impactGoalStatus');
  const impactGoalDescription = document.getElementById('impactGoalDescription');
  const impactGoalPriority = document.getElementById('impactGoalPriority');
  const impactGoalStart = document.getElementById('impactGoalStart');
  const impactGoalEnd = document.getElementById('impactGoalEnd');
  const impactProjectsList = document.getElementById('impactProjectsList');
  const impactTeamsList = document.getElementById('impactTeamsList');
  const impactLogsList = document.getElementById('impactLogsList');
  const impactHighlightsList = document.getElementById('impactHighlightsList');
  const generateSummaryBtn = document.getElementById('generateSummaryBtn');
  const exportGoalPdfBtn = document.getElementById('exportGoalPdfBtn');
  const impactSummaryEmpty = document.getElementById('impactSummaryEmpty');
  const impactSummaryContent = document.getElementById('impactSummaryContent');
  const impactSummaryOverall = document.getElementById('impactSummaryOverall');
  const impactSummaryProjects = document.getElementById('impactSummaryProjects');
  const impactSummaryTeamParticipation = document.getElementById('impactSummaryTeamParticipation');
  const impactSummaryContributions = document.getElementById('impactSummaryContributions');
  const impactSummaryHighlights = document.getElementById('impactSummaryHighlights');
  const impactSummaryRisks = document.getElementById('impactSummaryRisks');
  const impactSummaryRecommendations = document.getElementById('impactSummaryRecommendations');

  let currentGoalId = null;
  let goalToDelete = null;
  let isEditMode = false;
  let editingGoalId = null;

  const titleInput = document.getElementById('title');
  const descriptionInput = document.getElementById('description');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const priorityInput = document.getElementById('priority');
  const statusInput = document.getElementById('status');

  const showFormMessage = (message, type) => {
    goalFormMessage.textContent = message;
    goalFormMessage.className = `form-message ${type}`;
  };

  const showGoalsListMessage = (message, type) => {
    goalsListMessage.textContent = message;
    goalsListMessage.className = `form-message ${type}`;
  };

  const clearGoalsListMessage = () => {
    goalsListMessage.textContent = '';
    goalsListMessage.className = 'form-message';
  };

  const clearFormMessage = () => {
    goalFormMessage.textContent = '';
    goalFormMessage.className = 'form-message';
  };

  const setButtonsDisabled = (disabled) => {
    saveDraftButton.disabled = disabled;
    createGoalButton.disabled = disabled;
  };

  const resetGoalForm = () => {
    goalForm.reset();
  };

  const enableEditMode = (goal) => {
    isEditMode = true;
    editingGoalId = goal.id_goal;

    goalFormTitle.textContent = 'Edit Goal';
    createGoalButton.textContent = 'Save Changes';
    saveDraftButton.style.display = 'none';
    cancelEditButton.style.display = 'inline-flex';

    titleInput.value = goal.title || '';
    descriptionInput.value = goal.description || '';
    startDateInput.value = goal.start_date ? goal.start_date.split('T')[0] : '';
    endDateInput.value = goal.end_date ? goal.end_date.split('T')[0] : '';
    priorityInput.value = goal.priority || '';
    statusInput.value = goal.status || '';

    clearFormMessage();
    clearGoalsListMessage();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const disableEditMode = () => {
    isEditMode = false;
    editingGoalId = null;

    goalFormTitle.textContent = 'Create New Goal';
    createGoalButton.textContent = 'Create Goal';
    saveDraftButton.style.display = 'inline-flex';
    cancelEditButton.style.display = 'none';

    resetGoalForm();
    clearFormMessage();
  };

  const getGoalPayload = (saveMode) => ({
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    start_date: startDateInput.value,
    end_date: endDateInput.value,
    priority: priorityInput.value,
    status: statusInput.value,
    save_mode: saveMode,
  });

  const loadGoalForEdit = async (goalId) => {
    clearFormMessage();
    clearGoalsListMessage();

    try {
      const response = await fetch(`/manager/goals/${goalId}`);
      const data = await response.json();

      if (!response.ok) {
        showFormMessage(data.message || 'Could not load goal.', 'error');
        return;
      }

      enableEditMode(data.goal);
    } catch (err) {
      console.log(err);
      showFormMessage('Unexpected error while loading the goal.', 'error');
    }
  };

  const linkProjectToGoal = async (goalId) => {
    clearGoalsListMessage();

    const selectedProjectIds = Array.from(
      document.querySelectorAll(`.link-project-checkbox[data-goal-id="${goalId}"]:checked`)
    ).map((checkbox) => checkbox.value);

    if (selectedProjectIds.length === 0) {
      showGoalsListMessage('Please select at least one project.', 'error');
      return;
    }

    try {
      const response = await fetch(`/manager/goals/${goalId}/link-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          id_projects: selectedProjectIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showGoalsListMessage(data.message || 'Could not link project.', 'error');
        return;
      }

      showGoalsListMessage(data.message || 'Projects linked successfully.', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.log(err);
      showGoalsListMessage('Unexpected error while linking projects.', 'error');
    }
  };

  const unlinkProjectFromGoal = async (goalId, projectId) => {
    clearGoalsListMessage();

    try {
      const response = await fetch(`/manager/goals/${goalId}/unlink-project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          id_project: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showGoalsListMessage(data.message || 'Could not unlink project.', 'error');
        return;
      }

      showGoalsListMessage(data.message || 'Project unlinked successfully.', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.log(err);
      showGoalsListMessage('Unexpected error while unlinking project.', 'error');
    }
  };


  const deleteGoal = async (goalId) => {
  clearGoalsListMessage();
  clearFormMessage();

  try {
    const response = await fetch(`/manager/goals/${goalId}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      showGoalsListMessage(data.message || 'Could not delete goal.', 'error');
      return;
    }

    showGoalsListMessage(data.message || 'Goal deleted successfully.', 'success');

    setTimeout(() => {
      window.location.reload();
    }, 900);

  } catch (err) {
    console.log(err);
    showGoalsListMessage('Unexpected error while deleting goal.', 'error');
  }
};

  const submitGoal = async (saveMode) => {
    clearFormMessage();
    clearGoalsListMessage();

    if (!validateForm(saveMode)) {
      return;
    }

    setButtonsDisabled(true);

    try {
      const payload = getGoalPayload(saveMode);

      const endpoint = isEditMode
        ? `/manager/goals/${editingGoalId}`
        : '/manager/goals';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        showFormMessage(data.message || 'Something went wrong.', 'error');
        setButtonsDisabled(false);
        return;
      }

      showFormMessage(data.message || 'Operation completed successfully.', 'success');
      resetGoalForm();

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.log(err);
      showFormMessage('Unexpected error while sending the form.', 'error');
      setButtonsDisabled(false);
    }
  };

  const activateGoalsTab = (targetId) => {
    goalsTabButtons.forEach((button) => {
      const isActive = button.dataset.tabTarget === targetId;
      button.classList.toggle('active', isActive);
    });

    goalsTabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === targetId);
    });
  };

  const renderImpactTags = (container, items, type, emptyMessage) => {
    if (!items || items.length === 0) {
      container.innerHTML = `<p class="goal-impact-empty-text">${emptyMessage}</p>`;
      return;
    }

    container.innerHTML = items.map((item) => {
      const label = type === 'project' ? item.project_name : item.team_name;
      return `<span class="goal-impact-tag ${type}">${label}</span>`;
    }).join('');
  };

  const renderImpactLogs = (container, logs) => {
    if (!logs || logs.length === 0) {
      container.innerHTML = '<p class="goal-impact-empty-text">No contributions found.</p>';
      return;
    }

    container.innerHTML = logs.map((log) => {
      const date = new Date(log.created_at).toLocaleDateString('en-US');

      return `
        <div class="goal-impact-log-card">
          <div class="goal-impact-log-header">
            <span class="goal-impact-log-user">${log.full_name}</span>
            <span>${date}</span>
          </div>

          <div class="goal-impact-log-project">${log.project_name}</div>

          <div class="goal-impact-log-text">
            <strong>Completed:</strong> ${log.completed || '—'}
          </div>

          <div class="goal-impact-log-text">
            <strong>Planned:</strong> ${log.planned || '—'}
          </div>
        </div>
      `;
    }).join('');
  };

  const renderImpactHighlights = (container, highlights) => {
    if (!highlights || highlights.length === 0) {
      container.innerHTML = '<p class="goal-impact-empty-text">No related highlights found.</p>';
      return;
    }

    container.innerHTML = highlights.map((highlight) => {
      const date = highlight.highlight_date
        ? new Date(highlight.highlight_date).toLocaleDateString('en-US')
        : 'No date';

      const projectName = highlight.project_name || 'No project';
      const teamName = highlight.team_name || 'No team';
      const ownerName = highlight.full_name || 'Unknown user';
      const impactText = highlight.impact || 'No impact description provided.';

      return `
        <div class="goal-impact-highlight-card">
          <div class="goal-impact-highlight-header">
            <span class="goal-impact-highlight-title">${highlight.title}</span>
            <span class="goal-impact-highlight-type">${highlight.highlight_type}</span>
          </div>

          <div class="goal-impact-highlight-meta">
            ${ownerName} · ${date} · ${projectName} · ${teamName}
          </div>

          <div class="goal-impact-highlight-text">
            ${highlight.description || 'No description provided.'}
          </div>

          <div class="goal-impact-highlight-impact">
            <strong>Impact:</strong> ${impactText}
          </div>
        </div>
      `;
    }).join('');
  };

  const renderSummaryList = (container, items, emptyMessage) => {
  if (!items || items.length === 0) {
    container.innerHTML = `<li>${emptyMessage}</li>`;
    return;
  }

  container.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
};

const resetImpactSummaryUI = () => {
  impactSummaryOverall.textContent = '—';
  impactSummaryProjects.innerHTML = '';
  impactSummaryTeamParticipation.textContent = '—';
  impactSummaryContributions.innerHTML = '';
  impactSummaryHighlights.innerHTML = '';
  impactSummaryRisks.innerHTML = '';
  impactSummaryRecommendations.innerHTML = '';
  impactSummaryEmpty.classList.remove('hidden');
  impactSummaryContent.classList.add('hidden');
};

const showImpactSummaryUI = (summary) => {
  impactSummaryOverall.textContent = summary.overallImpact || 'No summary available.';
  impactSummaryTeamParticipation.textContent = summary.teamParticipation || 'No participation summary available.';

  renderSummaryList(
    impactSummaryProjects,
    summary.projectsDrivingGoal,
    'No relevant projects found.'
  );

  renderSummaryList(
    impactSummaryContributions,
    summary.keyContributions,
    'No key contributions found.'
  );

  renderSummaryList(
    impactSummaryHighlights,
    summary.relevantHighlights,
    'No relevant highlights found.'
  );

  renderSummaryList(
    impactSummaryRisks,
    summary.risksOrGaps,
    'No risks or gaps found.'
  );

  renderSummaryList(
    impactSummaryRecommendations,
    summary.recommendations,
    'No recommendations found.'
  );

  impactSummaryEmpty.classList.add('hidden');
  impactSummaryContent.classList.remove('hidden');
};



  const showImpactGoalDetails = (button) => {
    currentGoalId = button.dataset.impactGoalId;

    impactGoalItems.forEach((item) => {
      item.classList.remove('active');
    });

    button.classList.add('active');

    const impactProjects = JSON.parse(button.dataset.impactProjects || '[]');
    const impactTeams = JSON.parse(button.dataset.impactTeams || '[]');
    const impactLogs = JSON.parse(button.dataset.impactLogs || '[]');
    const impactHighlights = JSON.parse(button.dataset.impactHighlights || '[]');

    impactGoalTitle.textContent = button.dataset.impactGoalTitle || 'Goal title';
    impactGoalDescription.textContent = button.dataset.impactGoalDescription || 'No description provided.';
    impactGoalPriority.textContent = button.dataset.impactGoalPriority || 'Not set';
    impactGoalStart.textContent = button.dataset.impactGoalStart || 'Not set';
    impactGoalEnd.textContent = button.dataset.impactGoalEnd || 'Not set';

    impactGoalStatus.textContent = button.dataset.impactGoalStatus
      ? button.dataset.impactGoalStatus.charAt(0).toUpperCase() + button.dataset.impactGoalStatus.slice(1)
      : 'Active';

    impactGoalStatus.className = `goal-status ${button.dataset.impactGoalStatus || 'active'}`;

    renderImpactTags(
      impactProjectsList,
      impactProjects,
      'project',
      'No linked projects found.'
    );

    renderImpactTags(
      impactTeamsList,
      impactTeams,
      'team',
      'No participating teams found.'
    );

    renderImpactLogs(impactLogsList, impactLogs);
    renderImpactHighlights(impactHighlightsList, impactHighlights);
    resetImpactSummaryUI();
    impactEmptyState.classList.add('hidden');
    impactGoalDetails.classList.remove('hidden');
  };

     generateSummaryBtn.addEventListener('click', async () => {
        if (!currentGoalId) {
          return;
        }

          generateSummaryBtn.textContent = 'Generating...';
          generateSummaryBtn.disabled = true;

          try {
            const response = await fetch(`/manager/goals/${currentGoalId}/impact-summary`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
              },
            });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || 'Error generating summary');
          return;
        }

        showImpactSummaryUI(data);
      } catch (err) {
        console.log(err);
        alert('Unexpected error generating summary.');
      }

      generateSummaryBtn.textContent = 'Generate Summary';
      generateSummaryBtn.disabled = false;
    });

    exportGoalPdfBtn.addEventListener('click', async () => {
  if (!currentGoalId) {
    return;
  }

  exportGoalPdfBtn.textContent = 'Exporting...';
  exportGoalPdfBtn.disabled = true;

  try {
    const response = await fetch(`/manager/goals/${currentGoalId}/export-pdf`, {
      method: 'POST',
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });

    if (!response.ok) {
      let errorMessage = 'Error exporting PDF.';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonError) {
        console.log(jsonError);
      }
      alert(errorMessage);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `goal_impact_${currentGoalId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.log(err);
    alert('Unexpected error exporting PDF.');
  }

  exportGoalPdfBtn.textContent = 'Export PDF';
  exportGoalPdfBtn.disabled = false;
});

  saveDraftButton.addEventListener('click', () => {
    submitGoal('draft');
  });

  createGoalButton.addEventListener('click', () => {
    submitGoal('final');
  });

  editGoalButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const goalId = button.dataset.goalId;
      activateGoalsTab('manageGoalsPanel');
      loadGoalForEdit(goalId);
    });
  });

document.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-goal-button');

  if (!deleteButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  goalToDelete = deleteButton.dataset.goalId;
  deleteModal.classList.remove('hidden');
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  goalToDelete = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!goalToDelete) {
    return;
  }

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  await deleteGoal(goalToDelete);

  confirmDeleteBtn.disabled = false;
  confirmDeleteBtn.textContent = 'Delete';
  deleteModal.classList.add('hidden');
  goalToDelete = null;
});

deleteModal.addEventListener('click', (event) => {
  const clickedBackdrop = event.target.classList.contains('custom-modal-backdrop');

  if (clickedBackdrop) {
    deleteModal.classList.add('hidden');
    goalToDelete = null;
  }
});

  linkProjectButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const goalId = button.dataset.goalId;
      linkProjectToGoal(goalId);
    });
  });

  unlinkProjectButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const goalId = button.dataset.goalId;
      const projectId = button.dataset.projectId;
      unlinkProjectFromGoal(goalId, projectId);
    });
  });

  projectDropdownToggles.forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();

      const goalId = toggle.dataset.goalId;
      const currentMenu = document.querySelector(
        `.project-dropdown-menu[data-goal-id="${goalId}"]`
      );

      projectDropdownMenus.forEach((menu) => {
        if (menu !== currentMenu) {
          menu.classList.remove('open');
        }
      });

      currentMenu.classList.toggle('open');
    });
  });

  document.addEventListener('click', (event) => {
    const clickedInsideDropdown = event.target.closest('.project-dropdown');

    if (!clickedInsideDropdown) {
      projectDropdownMenus.forEach((menu) => {
        menu.classList.remove('open');
      });
    }
  });

  cancelEditButton.addEventListener('click', () => {
    disableEditMode();
  });

  goalsTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activateGoalsTab(button.dataset.tabTarget);
    });
  });

  impactGoalItems.forEach((button) => {
    button.addEventListener('click', () => {
      showImpactGoalDetails(button);
    });
  });

  const markInvalid = (input) => {
    input.classList.add('input-error');
  };

  const clearInvalid = (input) => {
    input.classList.remove('input-error');
  };

  const validateForm = (mode) => {
    let isValid = true;

    [titleInput, descriptionInput, priorityInput, statusInput, startDateInput, endDateInput].forEach(clearInvalid);

    if (!titleInput.value.trim()) {
      markInvalid(titleInput);
      showFormMessage('Title is required.', 'error');
      isValid = false;
    }

    if (!descriptionInput.value.trim()) {
      markInvalid(descriptionInput);
      showFormMessage('Description is required.', 'error');
      isValid = false;
    }

    if (mode === 'final') {
      if (!priorityInput.value) {
        markInvalid(priorityInput);
        showFormMessage('Priority is required.', 'error');
        isValid = false;
      }

      if (!statusInput.value) {
        markInvalid(statusInput);
        showFormMessage('Status is required.', 'error');
        isValid = false;
      }

      if (!startDateInput.value || !endDateInput.value) {
        markInvalid(startDateInput);
        markInvalid(endDateInput);
        showFormMessage('Start and End dates are required.', 'error');
        isValid = false;
      }

      if (startDateInput.value && endDateInput.value) {
        if (new Date(startDateInput.value) > new Date(endDateInput.value)) {
          markInvalid(startDateInput);
          markInvalid(endDateInput);
          showFormMessage('Start date cannot be after End date.', 'error');
          isValid = false;
        }
      }
    }

    return isValid;
  };