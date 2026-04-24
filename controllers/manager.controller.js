/**
 * Manager views controller.
 * Handles dashboard, goals, highlights, history, reports, log, self-review and profile.
 */

const Log = require('../models/log.model');
const Blocker = require('../models/blocker.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const Goal = require('../models/goal.model');
const Team = require('../models/team.model');
const bcrypt = require('bcrypt');
const Highlight = require('../models/highlight.model');
const Achievement = require('../models/achievement.model');
const { generateText, Output } = require('ai');
const PDFDocument = require('pdfkit');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');


exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};

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

    const goalsWithProjects = goals.map((goal) => {
      const linkedProjects = goalProjectLinks.filter(
        (link) => link.id_goal === goal.id_goal && link.id_project
      );

      return {
        ...goal,
        linkedProjects,
      };
    });

    const createdGoalsWithProjects = createdGoals.map((goal) => {
      const linkedProjects = goalProjectLinks.filter(
        (link) => link.id_goal === goal.id_goal && link.id_project
      );

      return {
        ...goal,
        linkedProjects,
      };
    });

    const goalImpactMap = createdGoals.reduce((accumulator, goal) => {
      const relatedProjects = goalImpactProjects.filter(
        (project) => project.id_goal === goal.id_goal
      );

      const relatedTeams = goalImpactTeams.filter(
        (team) => team.id_goal === goal.id_goal
      );

      const relatedLogs = goalImpactLogs.filter(
        (log) => log.id_goal === goal.id_goal
      );

      const relatedHighlights = goalImpactHighlights.filter(
        (highlight) => highlight.id_goal === goal.id_goal
      );

      accumulator[goal.id_goal] = {
        projects: relatedProjects,
        teams: relatedTeams,
        logs: relatedLogs,
        highlights: relatedHighlights,
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
        !title || !title.trim() ||
        !description || !description.trim() ||
        !startDate ||
        !endDate ||
        !priority ||
        !status
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
        return res.status(400).json({ success: false, message: 'Invalid priority value.' });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value.' });
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

    return res.status(500).json({ success: false, message: 'Internal Server Error' });
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
      !title || !title.trim() ||
      !description || !description.trim() ||
      !startDate ||
      !endDate ||
      !priority ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date.',
      });
    }

    const [existingRows] = await Goal.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
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
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getGoalById = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [rows] = await Goal.fetchOneById(id, activeUserId);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }

    return res.status(200).json({ success: true, goal: rows[0] });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
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
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'link',
        entityType: 'goal_project',
        entityId: id,
        success: 0,
        detail: 'Goal-project link failed: no projects selected.',
      });

      return res.status(400).json({
        success: false,
        message: 'Please select at least one project.',
      });
    }

    const [goalRows] = await Goal.fetchOneById(id, activeUserId);

    if (goalRows.length === 0) {
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'link',
        entityType: 'goal_project',
        entityId: id,
        success: 0,
        detail: 'Goal-project link failed: goal not found.',
      });

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
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'link',
        entityType: 'goal_project',
        entityId: id,
        success: 0,
        detail: `Goal-project link failed: all selected projects were already linked to goal ${id}.`,
      });

      return res.status(409).json({
        success: false,
        message: 'All selected projects are already linked to this goal.',
      });
    }

    const successMessage = skippedProjects.length > 0
      ? `${linkedProjects.length} project(s) linked successfully. ${skippedProjects.length} already linked project(s) were skipped.`
      : `${linkedProjects.length} project(s) linked successfully.`;

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'link',
      entityType: 'goal_project',
      entityId: id,
      success: 1,
      detail: `Linked ${linkedProjects.length} project(s) to goal ${id}. Skipped ${skippedProjects.length} already linked project(s).`,
    });

    return res.status(200).json({
      success: true,
      message: successMessage,
    });
  } catch (err) {
    console.log(err);

    try {
      await Goal.createAuditLog({
        idUser: activeUserId,
        action: 'link',
        entityType: 'goal_project',
        entityId: id,
        success: 0,
        detail: `Technical error while linking projects to goal: ${err.message}`,
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

exports.getHighlights = async (req, res) => {
  const activeUserId = req.session.userId;

  try {
    const [[highlights], [projects]] = await Promise.all([
      Highlight.fetchAllByManager(activeUserId),
      Project.fetchAvailableForGoalLink(),
    ]);

    res.render('manager/highlights', {
      currentPage: 'highlights',
      role: 'manager',
      highlights,
      availableProjects: projects,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.createHighlight = async (req, res) => {
  const activeUserId = req.session.userId;

  const {
    title,
    description,
    impact,
    highlight_type: highlightType,
    highlight_date: highlightDate,
    id_project: idProject,
    id_team: idTeam,
  } = req.body;

  const validHighlightTypes = ['technical', 'business', 'team', 'product'];
  const verificationStatus = 'pending';

  try {
    if (
      !title || !title.trim() ||
      !description || !description.trim() ||
      !highlightType ||
      !highlightDate
    ) {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'create',
        entityType: 'highlight',
        entityId: null,
        success: 0,
        detail: 'Highlight creation failed: missing required fields.',
      });

      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validHighlightTypes.includes(highlightType)) {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'create',
        entityType: 'highlight',
        entityId: null,
        success: 0,
        detail: 'Highlight creation failed: invalid highlight type.',
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid highlight type.',
      });
    }

    const normalizedProjectId = idProject && idProject !== '' ? Number(idProject) : null;
    const normalizedTeamId = idTeam && idTeam !== '' ? Number(idTeam) : null;

    const [result] = await Highlight.create({
      idUser: activeUserId,
      idProject: normalizedProjectId,
      idTeam: normalizedTeamId,
      title: title.trim(),
      description: description.trim(),
      impact: impact && impact.trim() ? impact.trim() : null,
      highlightType,
      verificationStatus,
      highlightDate,
    });

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'create',
      entityType: 'highlight',
      entityId: result.insertId,
      success: 1,
      detail: 'Highlight created successfully.',
    });

    const [createdRows] = await Highlight.fetchOneById(result.insertId, activeUserId);

    return res.status(201).json({
      success: true,
      message: 'Highlight registered successfully.',
      highlight: createdRows[0],
    });
  } catch (err) {
    console.log(err);

    try {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'create',
        entityType: 'highlight',
        entityId: null,
        success: 0,
        detail: `Technical error while creating highlight: ${err.message}`,
      });
    } catch (auditErr) {
      console.log(auditErr);
    }

    return res.status(500).json({
      success: false,
      message: 'Error while registering the highlight.',
    });
  }
};

exports.updateHighlight = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  const {
    title,
    description,
    impact,
    highlight_type: highlightType,
    highlight_date: highlightDate,
    id_project: idProject,
    id_team: idTeam,
  } = req.body;

  const validHighlightTypes = ['technical', 'business', 'team', 'product'];

  try {
    if (
      !title || !title.trim() ||
      !description || !description.trim() ||
      !highlightType ||
      !highlightDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validHighlightTypes.includes(highlightType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid highlight type.',
      });
    }

    const [existingRows] = await Highlight.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found.',
      });
    }

    const normalizedProjectId = idProject && idProject !== '' ? Number(idProject) : null;
    const normalizedTeamId = idTeam && idTeam !== '' ? Number(idTeam) : null;

    const [result] = await Highlight.update({
      idHighlight: id,
      idUser: activeUserId,
      idProject: normalizedProjectId,
      idTeam: normalizedTeamId,
      title: title.trim(),
      description: description.trim(),
      impact: impact && impact.trim() ? impact.trim() : null,
      highlightType,
      highlightDate,
    });

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Highlight could not be updated.',
      });
    }

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'update',
      entityType: 'highlight',
      entityId: id,
      success: 1,
      detail: 'Highlight updated successfully.',
    });

    const [updatedRows] = await Highlight.fetchOneById(id, activeUserId);

    return res.status(200).json({
      success: true,
      message: 'Highlight updated successfully.',
      highlight: updatedRows[0],
    });
  } catch (err) {
    console.log(err);

    try {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'update',
        entityType: 'highlight',
        entityId: id,
        success: 0,
        detail: `Technical error while updating highlight: ${err.message}`,
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

exports.deleteHighlight = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [existingRows] = await Highlight.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found.',
      });
    }

    const [result] = await Highlight.delete(id, activeUserId);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Highlight could not be deleted.',
      });
    }

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'delete',
      entityType: 'highlight',
      entityId: id,
      success: 1,
      detail: 'Highlight deleted successfully.',
    });

    return res.status(200).json({
      success: true,
      message: 'Highlight deleted successfully.',
    });
  } catch (err) {
    console.log(err);

    try {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'delete',
        entityType: 'highlight',
        entityId: id,
        success: 0,
        detail: `Technical error while deleting highlight: ${err.message}`,
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

exports.getHistory = async (req, res) => {
  try {
    // Lee los filtros que vienen desde la URL
    const filters = {
      id_user: req.query.id_user || '',
      id_project: req.query.id_project || '',
      id_team: req.query.id_team || '',
      date_from: req.query.date_from || '',
      date_to: req.query.date_to || '',
    };

    // Trae  los datos necesarios para filtros y resultados
    const [
      [historyLogs],
      [historyCountRows],
      [users],
      [projects],
      [teams],
    ] = await Promise.all([
      Log.fetchHistoryByManagerFilters(filters),
      Log.countHistoryByManagerFilters(filters),
      User.fetchUsersForHistory(),
      Project.fetchAll(),
      Team.fetchAllForSelect(),
    ]);

    // Toma el total de resultados filtrados
    const totalEntries = historyCountRows.length > 0 ? historyCountRows[0].total : 0;

    res.render('manager/history', {
      currentPage: 'history',
      role: 'manager',
      logs: historyLogs,
      totalEntries,
      users,
      projects,
      teams,
      filters,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getReports = (req, res) => {
  Team.fetchAllForSelect()
    .then(([teams]) => {
      res.render('manager/reports', {
        currentPage: 'reports',
        role: 'manager',
        teams,
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getLog = async (req, res) => {
  const activeUserId = req.session.userId;
  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Log.countAllByEmployee(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const [logs] = await Log.fetchAllByEmployee(activeUserId, filters, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    const logsWithBlockers = await Promise.all(
      logs.map(async (log) => {
        const [blockers] = await Blocker.fetchByLog(log.id_log);
        return { ...log, blockers };
      })
    );

    res.render('shared/log', {
      currentPage: 'log',
      role: 'manager',
      logBase: '/manager',
      logs: logsWithBlockers,
      projects,
      filters,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'manager',
    selfReviewBase: '/manager',
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.generateSelfReview(req, res);
};

exports.exportSelfReviewPDF = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.exportSelfReviewPDF(req, res);
};

exports.getProfile = (req, res) => {
  const activeUserId = req.session.userId;

  User.fetchOne(activeUserId)
    .then(([rows]) => {
      if (rows.length > 0) {
        res.render('shared/profile', {
          currentPage: 'profile',
          role: 'manager',
          user: rows[0],
        });
      } else {
        res.status(404).send('User not found');
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

/*exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    if (!user) return res.status(404).send('User not found');
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
      user,
      error: '',
      success: '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};*/

exports.postSlack = async (req, res) => {
  const { slack_user } = req.body;

  try {
    await User.updateSlack(req.session.userId, slack_user);
    const [[user]] = await User.fetchOne(req.session.userId);

    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
      user,
      error: '',
      success: 'Slack username updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postPassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'manager',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'manager',
        user,
        error: 'New passwords do not match.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updatePassword(req.session.userId, hashed);
    const [[updatedUser]] = await User.fetchOne(req.session.userId);

    return res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};

exports.generateGoalImpactSummary = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [
      [goalRows],
      [projects],
      [teams],
      [logs],
      [highlights],
    ] = await Promise.all([
      Goal.fetchOneById(id, activeUserId),
      Goal.fetchGoalImpactProjectsByManager(activeUserId),
      Goal.fetchGoalImpactTeamsByManager(activeUserId),
      Goal.fetchGoalImpactLogsByManager(activeUserId),
      Goal.fetchGoalImpactHighlightsByManager(activeUserId),
    ]);

    if (goalRows.length === 0) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const goal = goalRows[0];

    const goalProjects = projects.filter((project) => project.id_goal == id);
    const goalTeams = teams.filter((team) => team.id_goal == id);
    const goalLogs = logs.filter((log) => log.id_goal == id);
    const goalHighlights = highlights.filter((highlight) => highlight.id_goal == id);

    const logsText = goalLogs.map((log) =>
      `- ${log.full_name}: completed "${log.completed}" planned "${log.planned}"`
    ).join('\n') || 'No logs';

    const highlightsText = goalHighlights.map((highlight) =>
      `- ${highlight.title}: ${highlight.impact || 'no impact'}`
    ).join('\n') || 'No highlights';

    const projectsText = goalProjects.map((project) => project.project_name).join(', ') || 'No projects';
    const teamsText = goalTeams.map((team) => team.team_name).join(', ') || 'No teams';

    const prompt = `
You are a senior product manager generating a structured impact summary.

Analyze the following goal data and return a structured JSON response.

GOAL: ${goal.title}
DESCRIPTION: ${goal.description || 'No description'}

PROJECTS: ${projectsText}
TEAMS: ${teamsText}

LOGS:
${logsText}

HIGHLIGHTS:
${highlightsText}

Instructions:

1. overallImpact:
Short executive summary of how strong the goal impact is.

2. projectsDrivingGoal:
List the most relevant projects contributing to this goal.

3. teamParticipation:
Describe how teams are contributing (strong, weak, missing collaboration, etc).

4. keyContributions:
List key contributions detected from logs.

5. relevantHighlights:
List important highlights related to the goal.

6. risksOrGaps:
List risks, missing contributions, or weak areas.

7. recommendations:
Give actionable recommendations for the manager.
`.trim();

    const schema = z.object({
      overallImpact: z.string(),
      projectsDrivingGoal: z.array(z.string()),
      teamParticipation: z.string(),
      keyContributions: z.array(z.string()),
      relevantHighlights: z.array(z.string()),
      risksOrGaps: z.array(z.string()),
      recommendations: z.array(z.string()),
    });

    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({ schema }),
      prompt,
    });

    return res.status(200).json(output);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error generating summary.' });
  }
};
exports.exportGoalImpactPDF = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [
      [goalRows],
      [projects],
      [teams],
      [logs],
      [highlights],
    ] = await Promise.all([
      Goal.fetchOneById(id, activeUserId),
      Goal.fetchGoalImpactProjectsByManager(activeUserId),
      Goal.fetchGoalImpactTeamsByManager(activeUserId),
      Goal.fetchGoalImpactLogsByManager(activeUserId),
      Goal.fetchGoalImpactHighlightsByManager(activeUserId),
    ]);

    if (goalRows.length === 0) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const goal = goalRows[0];

    const goalProjects = projects.filter((project) => project.id_goal == id);
    const goalTeams = teams.filter((team) => team.id_goal == id);
    const goalLogs = logs.filter((log) => log.id_goal == id);
    const goalHighlights = highlights.filter((highlight) => highlight.id_goal == id);

    const logsText = goalLogs.map((log) =>
      `- ${log.full_name}: completed "${log.completed}" planned "${log.planned}"`
    ).join('\n') || 'No logs';

    const highlightsText = goalHighlights.map((highlight) =>
      `- ${highlight.title}: ${highlight.impact || 'no impact'}`
    ).join('\n') || 'No highlights';

    const projectsText = goalProjects.map((project) => project.project_name).join(', ') || 'No projects';
    const teamsText = goalTeams.map((team) => team.team_name).join(', ') || 'No teams';

    const prompt = `
You are a senior product manager generating a structured impact summary.

Analyze the following goal data and return a structured JSON response.

GOAL: ${goal.title}
DESCRIPTION: ${goal.description || 'No description'}

PROJECTS: ${projectsText}
TEAMS: ${teamsText}

LOGS:
${logsText}

HIGHLIGHTS:
${highlightsText}

Instructions:

1. overallImpact:
Short executive summary of how strong the goal impact is.

2. projectsDrivingGoal:
List the most relevant projects contributing to this goal.

3. teamParticipation:
Describe how teams are contributing (strong, weak, missing collaboration, etc).

4. keyContributions:
List key contributions detected from logs.

5. relevantHighlights:
List important highlights related to the goal.

6. risksOrGaps:
List risks, missing contributions, or weak areas.

7. recommendations:
Give actionable recommendations for the manager.
    `.trim();

    const schema = z.object({
      overallImpact: z.string(),
      projectsDrivingGoal: z.array(z.string()),
      teamParticipation: z.string(),
      keyContributions: z.array(z.string()),
      relevantHighlights: z.array(z.string()),
      risksOrGaps: z.array(z.string()),
      recommendations: z.array(z.string()),
    });

    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({ schema }),
      prompt,
    });

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="goal_impact_${goal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`
    );

    doc.pipe(res);

    doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke('#FFF4ED', '#E84C1E');

    doc.fillColor('#E84C1E')
      .fontSize(20)
      .text('Goal Impact Report', 60, 50, { align: 'center', width: 475 });

    doc.fillColor('#444444')
      .fontSize(10)
      .text('Change.org Goal Impact Summary', 60, 80, { align: 'center', width: 475 });

    doc.fillColor('#000000').fontSize(10);
    doc.text(`Goal: ${goal.title}`, 60, 105, { width: 180 });
    doc.text(`Status: ${goal.status}`, 250, 105, { width: 120 });
    doc.text(
      `Period: ${goal.start_date ? new Date(goal.start_date).toLocaleDateString('en-US') : 'Not set'} — ${goal.end_date ? new Date(goal.end_date).toLocaleDateString('en-US') : 'Not set'}`,
      360,
      105,
      { width: 170 }
    );

    doc.y = 150;
    doc.moveDown(1.2);

    doc.fontSize(15).fillColor('#E84C1E').text('AI Goal Impact Summary', { align: 'center' });
    doc.moveDown(0.6);

    const summaryBoxY = doc.y;

    doc.roundedRect(50, summaryBoxY, 495, 85, 8).fillAndStroke('#FFF8F3', '#F1C6A8');

    doc.fillColor('#333333')
      .fontSize(10)
      .text(output.overallImpact, 65, summaryBoxY + 15, {
        width: 465,
        align: 'justify',
      });

    doc.y = summaryBoxY + 105;

    doc.fontSize(12).fillColor('#E84C1E').text('Projects Driving This Goal');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.projectsDrivingGoal.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Team Participation');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    doc.text(output.teamParticipation, { width: 470 });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Key Contributions');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.keyContributions.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Relevant Highlights');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.relevantHighlights.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Risks / Gaps');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.risksOrGaps.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Recommendations');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.recommendations.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });
    doc.moveDown(0.8);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown(0.8);

    doc.fontSize(13).fillColor('#E84C1E').text('Goal Details');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    doc.text(`Description: ${goal.description || 'No description provided.'}`);
    doc.text(`Priority: ${goal.priority || 'Not set'}`);
    doc.text(`Status: ${goal.status || 'Not set'}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Linked Projects');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (goalProjects.length === 0) {
      doc.text('No linked projects found.');
    } else {
      goalProjects.forEach((project) => {
        doc.text(`• ${project.project_name} — ${project.status}`);
      });
    }
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Participating Teams');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (goalTeams.length === 0) {
      doc.text('No participating teams found.');
    } else {
      goalTeams.forEach((team) => {
        doc.text(`• ${team.team_name}`);
      });
    }
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Related Highlights');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (goalHighlights.length === 0) {
      doc.text('No related highlights found.');
    } else {
      goalHighlights.forEach((highlight) => {
        doc.text(`• ${highlight.title}`);
        doc.fontSize(9).fillColor('#555555').text(
          `  ${highlight.description || 'No description provided.'}`,
          { indent: 10 }
        );
        doc.fontSize(10).fillColor('#000000');
      });
    }
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Contributions / Logs');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (goalLogs.length === 0) {
      doc.text('No contributions found.');
    } else {
      goalLogs.forEach((log) => {
        doc.text(`• [${new Date(log.created_at).toLocaleDateString('en-US')}] ${log.full_name}`);
        if (log.completed) {
          doc.fontSize(9).fillColor('#555555').text(`  Completed: ${log.completed}`, { indent: 10 });
        }
        if (log.planned) {
          doc.fontSize(9).fillColor('#555555').text(`  Planned: ${log.planned}`, { indent: 10 });
        }
        doc.fontSize(10).fillColor('#000000');
        doc.moveDown(0.3);
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#999999').text(
      `Report generated on ${new Date().toLocaleDateString('en-US')}`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error generating PDF.' });
    }
  }
};

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

exports.getAchievements = async (req, res) => {
  const activeUserId = req.session.userId;
  const filters = {
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Achievement.countAllByUser(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const [achievements] = await Achievement.fetchAllByUser(activeUserId, filters, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    res.render('employee/achievements', {
      currentPage: 'achievements',
      role: 'manager',
      achievementsBase: '/manager',
      achievements,
      projects,
      filters,
      totalRecords,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.postAchievement(req, res);
};

exports.deleteAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.deleteAchievement(req, res);
};

exports.editAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.editAchievement(req, res);
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

exports.getProjects = (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.getProjects(req, res);
};

exports.comparePeriods = async (req, res) => {
  try {
    // Lee las fechas de ambos periodos desde la URL
    const {
      periodAFrom,
      periodATo,
      periodBFrom,
      periodBTo,
    } = req.query;

    // Valida que todas las fechas existan
    if (!periodAFrom || !periodATo || !periodBFrom || !periodBTo) {
      return res.status(400).json({
        success: false,
        message: 'Please select valid dates for both periods.',
      });
    }

    // Valida que cada periodo tenga fechas coherentes
    if (periodAFrom > periodATo || periodBFrom > periodBTo) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date.',
      });
    }

    // Valida que los periodos sean válidos 
    const periodsOverlap = periodAFrom <= periodBTo && periodBFrom <= periodATo;

    if (periodsOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Periods cannot overlap. Please select separate date ranges.',
      });
    }

    // Construye los objetos de periodo para reutilizarlos en las consultas
    const periodA = {
      date_from: periodAFrom,
      date_to: periodATo,
    };

    const periodB = {
      date_from: periodBFrom,
      date_to: periodBTo,
    };

    // Trae metricas de logs, blockers y highlights para ambos periodos
    const [
      [[periodALogMetrics]],
      [[periodBLogMetrics]],
      [[periodABlockerMetrics]],
      [[periodBBlockerMetrics]],
      [[periodAHighlightMetrics]],
      [[periodBHighlightMetrics]],
    ] = await Promise.all([
      Log.fetchMetricsByPeriod(periodA),
      Log.fetchMetricsByPeriod(periodB),
      Log.fetchBlockersByPeriod(periodA),
      Log.fetchBlockersByPeriod(periodB),
      Log.fetchHighlightsByPeriod(periodA),
      Log.fetchHighlightsByPeriod(periodB),
    ]);

    // Respuesta limpia para el frontend
    return res.status(200).json({
      success: true,
      periodA: {
        from: periodAFrom,
        to: periodATo,
        totalLogs: periodALogMetrics.total_logs || 0,
        totalActivities: periodALogMetrics.total_activities || 0,
        totalBlockers: periodABlockerMetrics.total_blockers || 0,
        totalHighlights: periodAHighlightMetrics.total_highlights || 0,
      },
      periodB: {
        from: periodBFrom,
        to: periodBTo,
        totalLogs: periodBLogMetrics.total_logs || 0,
        totalActivities: periodBLogMetrics.total_activities || 0,
        totalBlockers: periodBBlockerMetrics.total_blockers || 0,
        totalHighlights: periodBHighlightMetrics.total_highlights || 0,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};