/**
 * Manager module routes.
 * Includes personal log, self-review and profile since managers are also employees.
 * Protect with isAuth middleware when RBAC is implemented.
 */

const express = require('express');
const router = express.Router();

const managerController = require('../controllers/manager.controller');

// Dashboard - high level metrics and summaries
router.get('/dashboard', managerController.getDashboard);

// Goals - CRUD for strategic goals
router.get('/goals', managerController.getGoals);
router.post('/goals', managerController.createGoal);
router.get('/goals/:id', managerController.getGoalById);
router.put('/goals/:id', managerController.updateGoal);

// Highlights - important achievements management
router.get('/highlights', managerController.getHighlights);

// History - contribution history with advanced filters
router.get('/history', managerController.getHistory);

// Reports - PDF export and AI summaries
router.get('/reports', managerController.getReports);

// Personal log - uses shared view
router.get('/log', managerController.getLog);

// Self-review - uses shared view
router.get('/self-review', managerController.getSelfReview);

// Profile - uses shared view
router.get('/profile', managerController.getProfile);

module.exports = router;