/**
 * Manager views controller.
 * Handles dashboard, goals, highlights, history, reports, log, self-review and profile.
 */


const Log = require('../models/log.model');
const Blocker = require('../models/blocker.model');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const Goal = require('../models/goal.model');

exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};

exports.getGoals = (req, res) => {
  const activeUserId = 1;

  Goal.fetchAllByManager(activeUserId)
    .then(([goals]) => {
      res.render('manager/goals', {
        currentPage: 'goals',
        role: 'manager',
        goals,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.createGoal = async (req, res) => {
  const activeUserId = 1;

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
        !title ||
        !title.trim() ||
        !description ||
        !description.trim() ||
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
        await Goal.createAuditLog({
          idUser: activeUserId,
          action: 'create',
          entityType: 'goal',
          entityId: null,
          success: 0,
          detail: 'Goal creation failed: invalid priority value.',
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid priority value.',
        });
      }

      if (!validStatuses.includes(status)) {
        await Goal.createAuditLog({
          idUser: activeUserId,
          action: 'create',
          entityType: 'goal',
          entityId: null,
          success: 0,
          detail: 'Goal creation failed: invalid status value.',
        });

        return res.status(400).json({
          success: false,
          message: 'Invalid status value.',
        });
      }

      if (new Date(startDate) > new Date(endDate)) {
        await Goal.createAuditLog({
          idUser: activeUserId,
          action: 'create',
          entityType: 'goal',
          entityId: null,
          success: 0,
          detail: 'Goal creation failed: start date is later than end date.',
        });

        return res.status(400).json({
          success: false,
          message: 'Start date cannot be later than end date.',
        });
      }
    }

    const normalizedDescription = description && description.trim()
      ? description.trim()
      : null;

    const normalizedStartDate = startDate || null;
    const normalizedEndDate = endDate || null;
    const normalizedPriority = priority || 'medium';
    const normalizedStatus = status || 'active';

    const [result] = await Goal.create({
      title: title.trim(),
      description: normalizedDescription,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      priority: normalizedPriority,
      status: normalizedStatus,
      isDraft,
      idUser: activeUserId,
    });

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'create',
      entityType: 'goal',
      entityId: result.insertId,
      success: 1,
      detail: isDraft
        ? 'Goal draft saved successfully.'
        : 'Goal created successfully.',
    });

    return res.status(201).json({
      success: true,
      message: isDraft
        ? 'Draft saved successfully.'
        : 'Goal created successfully.',
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

exports.getHighlights = (req, res) => {
  res.render('manager/highlights', {
    currentPage: 'highlights',
    role: 'manager',
  });
};

exports.getHistory = (req, res) => {
  res.render('manager/history', {
    currentPage: 'history',
    role: 'manager',
  });
};

exports.getReports = (req, res) => {
  res.render('manager/reports', {
    currentPage: 'reports',
    role: 'manager',
  });
};

exports.getLog = (req, res) => {
  const activeUserId = 1;
  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };

  Promise.all([
    Log.fetchAllByEmployee(activeUserId, filters),
    Project.fetchAllByEmployee(activeUserId),
  ])
    .then(([[logs], [projects]]) => {
      return Promise.all(
        logs.map((log) =>
          Blocker.fetchByLog(log.id_log).then(([blockers]) => ({
            ...log,
            blockers,
          }))
        )
      ).then((logsWithBlockers) => {
        res.render('shared/log', {
          currentPage: 'log',
          role: 'manager',
          logs: logsWithBlockers,
          projects,
          filters,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'manager',
  });
};

exports.getProfile = (req, res) => {
  const activeUserId = 1;

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