/**
 * Admin module routes.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { requirePrivilege } = require('../util/is-auth');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many self-review generation requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', adminController.getDashboard);

router.get('/users', requirePrivilege('manage_users'), adminController.getUsers);
router.post('/users/create', requirePrivilege('manage_users'), adminController.createUser);
router.post('/users/edit', requirePrivilege('manage_users'), adminController.editUser);
router.patch('/users/:id/toggle-status', requirePrivilege('manage_users'), adminController.toggleUserStatus);
router.post('/users/approve', requirePrivilege('manage_users'), adminController.approveUser);
router.post('/users/reject', requirePrivilege('manage_users'), adminController.rejectUser);
router.post('/users/delete', requirePrivilege('manage_users'), adminController.deleteUser);

router.get('/teams', requirePrivilege('manage_teams'), adminController.getTeams);
router.post('/teams/create', requirePrivilege('manage_teams'), adminController.createTeam);
router.post('/teams/edit', requirePrivilege('manage_teams'), adminController.editTeam);
router.post('/teams/delete', requirePrivilege('manage_teams'), adminController.deleteTeam);

router.get('/roles', requirePrivilege('manage_roles'), adminController.getRoles);
router.post('/roles/create', requirePrivilege('manage_roles'), adminController.createRole);
router.post('/roles/edit', requirePrivilege('manage_roles'), adminController.editRole);
router.post('/roles/delete', requirePrivilege('manage_roles'), adminController.deleteRole);

router.get('/log', adminController.getLog);
router.post('/log', adminController.postLog);
router.post('/log/edit', adminController.putLog);
router.post('/log/delete', adminController.deleteLog);

router.get('/achievements', adminController.getAchievements);
router.post('/achievements', adminController.postAchievement);
router.post('/achievements/delete', adminController.deleteAchievement);
router.post('/achievements/edit', adminController.editAchievement);

router.get('/projects', adminController.getProjects);

router.get('/self-review', adminController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, adminController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, adminController.exportSelfReviewPDF);

router.get('/profile', adminController.getProfile);
router.post('/profile/slack', adminController.postSlack);
router.post('/profile/password', adminController.postPassword);

module.exports = router;