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

exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};

exports.getGoals = async (req, res) => {
  const activeUserId = req.session.userId;

  try {
    const [[goals], [projects]] = await Promise.all([
      Goal.fetchAllByManager(activeUserId),
      Project.fetchAvailableForGoalLink(),
    ]);

    res.render('manager/goals', {
      currentPage: 'goals',
      role: 'manager',
      goals,
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
      if (!title || !title.trim() || !description || !description.trim() || !startDate || !endDate || !priority || !status) {
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
        return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
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
    if (!title || !title.trim() || !description || !description.trim() || !startDate || !endDate || !priority || !status) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Start date cannot be later than end date.' });
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
      return res.status(400).json({ success: false, message: 'Goal could not be updated.' });
    }

    await Goal.createAuditLog({
      idUser: activeUserId,
      action: 'update',
      entityType: 'goal',
      entityId: id,
      success: 1,
      detail: 'Goal updated successfully.',
    });

    return res.status(200).json({ success: true, message: 'Goal updated successfully.' });
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

exports.getLog = (req, res) => {
  const activeUserId = req.session.userId;
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
          csrfToken: req.csrfToken(),
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

exports.getProfile = async (req, res) => {
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
};

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
  const bcrypt = require('bcrypt');
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
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};