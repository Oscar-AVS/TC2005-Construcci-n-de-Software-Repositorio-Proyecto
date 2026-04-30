/**
 * Manager goals controller.
 * Handles goal listing, creation, update, deletion and project linking.
 */

const Goal = require('../../models/goal.model');
const Project = require('../../models/project.model');

exports.getGoals = async (req, res) => {
  const activeUserId = req.session.userId;

  try {
    const [
      [goals],
      [createdGoals],
      [projects],
      [goalProjectLinks],
      [goalImpactProjects],
      [goalImpactTeams],
      [goalImpactLogs],
      [goalImpactHighlights],
    ] = await Promise.all([
      Goal.fetchAllByManager(activeUserId),
      Goal.fetchCreatedByManager(activeUserId),
      Project.fetchAvailableForGoalLink(),
      Goal.fetchAllLinkedProjectsByManager(activeUserId),
      Goal.fetchGoalImpactProjectsByManager(activeUserId),
      Goal.fetchGoalImpactTeamsByManager(activeUserId),
      Goal.fetchGoalImpactLogsByManager(activeUserId),
      Goal.fetchGoalImpactHighlightsByManager(activeUserId),
    ]);

    const goalsWithProjects = goals.map((goal) => ({
      ...goal,
      linkedProjects: goalProjectLinks.filter(
        (link) => link.id_goal === goal.id_goal && link.id_project
      ),
    }));

    const createdGoalsWithProjects = createdGoals.map((goal) => ({
      ...goal,
      linkedProjects: goalProjectLinks.filter(
        (link) => link.id_goal === goal.id_goal && link.id_project
      ),
    }));

    const goalImpactMap = createdGoals.reduce((accumulator, goal) => {
      accumulator[goal.id_goal] = {
        projects: goalImpactProjects.filter((project) => project.id_goal === goal.id_goal),
        teams: goalImpactTeams.filter((team) => team.id_goal === goal.id_goal),
        logs: goalImpactLogs.filter((log) => log.id_goal === goal.id_goal),
        highlights: goalImpactHighlights.filter(
          (highlight) => highlight.id_goal === goal.id_goal
        ),
      };

      return accumulator;
    }, {});

    res.render('manager/goals', {
      currentPage: 'goals',
      role: 'manager',
      goals: goalsWithProjects,
      createdGoals: createdGoalsWithProjects,
      goalImpactMap,
      availableProjects: projects,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.createGoal = async (req, res) => {
  const activeUserId = req.session.userId;

  const {
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    priority,
    status,
    save_mode: saveMode,
  } = req.body;

  const isDraft = saveMode === 'draft' ? 1 : 0;
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const validStatuses = ['active', 'paused', 'completed', 'cancelled'];

  try {
    if (isDraft) {
      if (!title || !title.trim()) {
        await Goal.createAuditLog({
          idUser: activeUserId,
          action: 'create',
          entityType: 'goal',
          entityId: null,
          success: 0,
          detail: 'Draft goal creation failed: title is required.',
        });

        return res.status(400).json({
          success: false,
          message: 'Title is required to save a draft.',
        });
      }
    } else {
      if (
        !title || !title.trim()
        || !description || !description.trim()
        || !startDate
        || !endDate
        || !priority
        || !status
      ) {
        await Goal.createAuditLog({
          idUser: activeUserId,
          action: 'create',
          entityType: 'goal',
          entityId: null,
          success: 0,
          detail: 'Goal creation failed: missing required fields.',
        });

        return res.status(400).json({
          success: false,
          message: 'Please complete all required fields.',
        });
      }

      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid priority value.',
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value.',
        });
      }

      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be later than end date.',
        });
      }
    }

    const [result] = await Goal.create({
      title: title.trim(),
      description: description && description.trim() ? description.trim() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      priority: priority || 'medium',
      status: status || 'active',
      isDraft,
      idUser: activeUserId,
    });

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'create',
      entityType: 'goal',
      entityId: result.insertId,
      success: 1,
      detail: isDraft ? 'Goal draft saved successfully.' : 'Goal created successfully.',
    });

    return res.status(201).json({
      success: true,
      message: isDraft ? 'Draft saved successfully.' : 'Goal created successfully.',
    });
  } catch (err) {
    console.log(err);

    try {
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'create',
        entityType: 'goal',
        entityId: null,
        success: 0,
        detail: `Technical error while creating goal: ${err.message}`,
      });
    } catch (auditErr) {
      console.log(auditErr);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.getGoalById = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [[rows], [linkedProjects], [allProjects]] = await Promise.all([
      Goal.fetchOneById(id, activeUserId),
      Goal.fetchLinkedProjectsByGoal(id),
      Project.fetchAvailableForGoalLink(),
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    const linkedIds = new Set(linkedProjects.map((p) => p.id_project));
    const unlinkedProjects = allProjects.filter((p) => !linkedIds.has(p.id_project));

    return res.status(200).json({
      success: true,
      goal: rows[0],
      linkedProjects,
      unlinkedProjects,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.updateGoal = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  const {
    title,
    description,
    start_date: startDate,
    end_date: endDate,
    priority,
    status,
  } = req.body;

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const validStatuses = ['active', 'paused', 'completed', 'cancelled'];

  try {
    if (
      !title || !title.trim()
      || !description || !description.trim()
      || !startDate
      || !endDate
      || !priority
      || !status
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value.',
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.',
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date.',
      });
    }

    const [existingRows] = await Goal.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    const [result] = await Goal.update({
      idGoal: id,
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      priority,
      status,
      idUser: activeUserId,
    });

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Goal could not be updated.',
      });
    }

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'update',
      entityType: 'goal',
      entityId: id,
      success: 1,
      detail: 'Goal updated successfully.',
    });

    return res.status(200).json({
      success: true,
      message: 'Goal updated successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.deleteGoal = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [existingRows] = await Goal.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    const [result] = await Goal.delete(id, activeUserId);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Goal could not be deleted.',
      });
    }

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'delete',
      entityType: 'goal',
      entityId: id,
      success: 1,
      detail: 'Goal deleted successfully.',
    });

    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully.',
    });
  } catch (err) {
    console.log(err);

    try {
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'delete',
        entityType: 'goal',
        entityId: id,
        success: 0,
        detail: `Technical error while deleting goal: ${err.message}`,
      });
    } catch (auditErr) {
      console.log(auditErr);
    }

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.linkProjectToGoal = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;
  const { id_projects: idProjects } = req.body;

  try {
    const selectedProjectIds = Array.isArray(idProjects)
      ? idProjects.filter((projectId) => projectId)
      : [];

    if (selectedProjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one project.',
      });
    }

    const [goalRows] = await Goal.fetchOneById(id, activeUserId);

    if (goalRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    const linkedProjects = [];
    const skippedProjects = [];

    for (const idProject of selectedProjectIds) {
      const [existingLinkRows] = await Goal.checkProjectLink(id, idProject);

      if (existingLinkRows.length > 0) {
        skippedProjects.push(idProject);
      } else {
        await Goal.linkProject(id, idProject, activeUserId);
        linkedProjects.push(idProject);
      }
    }

    if (linkedProjects.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'All selected projects are already linked to this goal.',
      });
    }

    const successMessage = skippedProjects.length > 0
      ? `${linkedProjects.length} project(s) linked successfully. ${skippedProjects.length} already linked project(s) were skipped.`
      : `${linkedProjects.length} project(s) linked successfully.`;

    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.unlinkProjectFromGoal = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;
  const { id_project: idProject } = req.body;

  try {
    if (!idProject) {
      return res.status(400).json({
        success: false,
        message: 'Project id is required.',
      });
    }

    const [goalRows] = await Goal.fetchOneById(id, activeUserId);

    if (goalRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found.',
      });
    }

    const [existingLinkRows] = await Goal.checkProjectLink(id, idProject);

    if (existingLinkRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'This project is not linked to the selected goal.',
      });
    }

    await Goal.unlinkProject(id, idProject);

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'delete',
      entityType: 'goal_project',
      entityId: id,
      success: 1,
      detail: `Project ${idProject} unlinked successfully from goal ${id}.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Project unlinked successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};