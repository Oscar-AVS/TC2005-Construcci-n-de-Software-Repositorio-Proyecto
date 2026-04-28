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
router.get('/achievements', managerController.getAchievements);
router.post('/achievements', managerController.postAchievement);
router.post('/achievements/delete', managerController.deleteAchievement);
router.post('/achievements/edit', managerController.editAchievement);
router.get('/projects', managerController.getProjects);
router.get('/goals', managerController.getGoals);
router.post('/goals', managerController.createGoal);
router.get('/goals/:id', managerController.getGoalById);
router.put('/goals/:id', managerController.updateGoal);
router.get('/highlights', managerController.getHighlights);
router.post('/highlights', managerController.createHighlight);
router.delete('/highlights/:id', managerController.deleteHighlight);
router.put('/highlights/:id', managerController.updateHighlight);
router.get('/history', managerController.getHistory);
router.get('/reports', managerController.getReports);
// Endpoint para comparar actividad entre periodos
router.get('/reports/compare-periods', managerController.comparePeriods);
router.get('/log', managerController.getLog);
router.get('/self-review', managerController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, managerController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, managerController.exportSelfReviewPDF);
router.get('/profile', managerController.getProfile);
router.post('/profile/slack', managerController.postSlack);
router.post('/profile/password', managerController.postPassword);
router.post('/goals/:id/link-project', managerController.linkProjectToGoal);
router.post('/goals/:id/unlink-project', managerController.unlinkProjectFromGoal);
router.post('/goals/:id/delete', managerController.deleteGoal);
router.post('/goals/:id/impact-summary', managerController.generateGoalImpactSummary);
router.post('/goals/:id/export-pdf', managerController.exportGoalImpactPDF);

module.exports = router;