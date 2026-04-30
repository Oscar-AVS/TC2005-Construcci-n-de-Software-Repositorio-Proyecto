/**
 * Manager module routes.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const managerController = require('../controllers/manager.controller');
const { requirePrivilege } = require('../util/is-auth');

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

router.get('/goals', requirePrivilege('manage_goals'), managerController.getGoals);
router.post('/goals', requirePrivilege('manage_goals'), managerController.createGoal);
router.get('/goals/:id', requirePrivilege('manage_goals'), managerController.getGoalById);
router.put('/goals/:id', requirePrivilege('manage_goals'), managerController.updateGoal);
router.post('/goals/:id/link-project', requirePrivilege('manage_goals'), managerController.linkProjectToGoal);
router.post('/goals/:id/unlink-project', requirePrivilege('manage_goals'), managerController.unlinkProjectFromGoal);
router.post('/goals/:id/delete', requirePrivilege('manage_goals'), managerController.deleteGoal);
router.post('/goals/:id/impact-summary', requirePrivilege('manage_goals'), managerController.generateGoalImpactSummary);
router.post('/goals/:id/export-pdf', requirePrivilege('manage_goals'), managerController.exportGoalImpactPDF);

router.get('/highlights', requirePrivilege('manage_goals'), managerController.getHighlights);
router.post('/highlights', requirePrivilege('manage_goals'), managerController.createHighlight);
router.delete('/highlights/:id', requirePrivilege('manage_goals'), managerController.deleteHighlight);
router.put('/highlights/:id', requirePrivilege('manage_goals'), managerController.updateHighlight);

router.get('/history', requirePrivilege('manage_goals'), managerController.getHistory);

router.get('/reports', requirePrivilege('generate_reports'), managerController.getReports);
router.get('/reports/compare-periods', requirePrivilege('generate_reports'), managerController.comparePeriods);

router.get('/log', managerController.getLog);
router.post('/log', managerController.postLog);
router.post('/log/edit', managerController.postEditLog);
router.post('/log/delete', managerController.postDeleteLog);

router.get('/self-review', managerController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, managerController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, managerController.exportSelfReviewPDF);

router.get('/profile', managerController.getProfile);
router.post('/profile/slack', managerController.postSlack);
router.post('/profile/password', managerController.postPassword);

module.exports = router;