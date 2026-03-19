/**
 * Team Leader module routes.
 * Protect with isAuth middleware when RBAC is implemented.
 */

const express = require('express');
const router = express.Router();

const teamLeaderController = require('../controllers/team-leader.controller');

router.get('/dashboard', teamLeaderController.getDashboard);
router.get('/team-log', teamLeaderController.getTeamLog);
router.get('/team-members', teamLeaderController.getTeamMembers);

module.exports = router;