/**
 * Team Leader module routes.
 * Includes personal log and self-review since team leaders are also employees.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const teamLeaderController = require('../controllers/team-leader.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many self-review generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', teamLeaderController.getDashboard);

router.get('/log', teamLeaderController.getLog);
router.post('/log', teamLeaderController.postLog);
router.post('/log/edit', teamLeaderController.postEditLog);
router.post('/log/delete', teamLeaderController.postDeleteLog);

router.get('/team-log', teamLeaderController.getTeamLog);

router.get('/team-members', teamLeaderController.getTeamMembers);
router.get('/team-members/search', teamLeaderController.searchAvailableUsers);
router.get('/team-members/find', teamLeaderController.findTeamMembers);
router.post('/team-members/add', teamLeaderController.addTeamMember);
router.post('/team-members/remove', teamLeaderController.removeTeamMember);

router.post('/blockers/resolve', teamLeaderController.resolveBlocker);

router.post('/achievements/approve', teamLeaderController.approveAchievement);
router.post('/achievements/reject', teamLeaderController.rejectAchievement);

router.get('/team-report', teamLeaderController.getTeamReport);

router.get('/self-review', teamLeaderController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, teamLeaderController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, teamLeaderController.exportSelfReviewPDF);

router.get('/profile', teamLeaderController.getProfile);
router.post('/profile/slack', teamLeaderController.postSlack);
router.post('/profile/password', teamLeaderController.postPassword);

module.exports = router;