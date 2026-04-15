/**
 * Manager module routes.
 */

const express = require('express');
const router = express.Router();

const managerController = require('../controllers/manager.controller');

router.get('/dashboard', managerController.getDashboard);
router.get('/goals', managerController.getGoals);
router.post('/goals', managerController.createGoal);
router.get('/goals/:id', managerController.getGoalById);
router.put('/goals/:id', managerController.updateGoal);
router.get('/highlights', managerController.getHighlights);
router.get('/history', managerController.getHistory);
router.get('/reports', managerController.getReports);
router.get('/log', managerController.getLog);
router.get('/self-review', managerController.getSelfReview);
router.get('/profile', managerController.getProfile);
router.post('/profile/slack', managerController.postSlack);
router.post('/profile/password', managerController.postPassword);

module.exports = router;