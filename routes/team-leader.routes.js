/**
 * Team Leader module routes.
 * Includes personal log and self-review since team leaders are also employees.
 */

const express = require('express');
const router = express.Router();

const teamLeaderController = require('../controllers/team-leader.controller');

router.get('/dashboard', teamLeaderController.getDashboard);
router.get('/log', teamLeaderController.getLog);
router.get('/team-log', teamLeaderController.getTeamLog);
router.get('/team-members', teamLeaderController.getTeamMembers);
router.post('/team-members/add', teamLeaderController.addTeamMember);
router.post('/team-members/remove', teamLeaderController.removeTeamMember);
router.get('/team-report', teamLeaderController.getTeamReport);
router.get('/self-review', teamLeaderController.getSelfReview);
router.get('/profile', teamLeaderController.getProfile);

module.exports = router;