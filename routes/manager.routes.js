/**
 * Manager module routes.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const managerController = require('../controllers/manager.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many self-review generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
 
router.get('/dashboard', managerController.getDashboard);
router.get('/goals', managerController.getGoals);
router.post('/goals', managerController.createGoal);
router.get('/goals/:id', managerController.getGoalById);
router.put('/goals/:id', managerController.updateGoal);
router.get('/highlights', managerController.getHighlights);
router.post('/highlights', managerController.createHighlight);
router.get('/history', managerController.getHistory);
router.get('/reports', managerController.getReports);
router.get('/log', managerController.getLog);
router.get('/self-review', managerController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, managerController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, managerController.exportSelfReviewPDF);
router.get('/profile', managerController.getProfile);
router.post('/profile/slack', managerController.postSlack);
router.post('/profile/password', managerController.postPassword);
router.post('/goals/:id/link-project', managerController.linkProjectToGoal);
router.post('/goals/:id/unlink-project', managerController.unlinkProjectFromGoal);
router.delete('/goals/:id', managerController.deleteGoal);


module.exports = router;