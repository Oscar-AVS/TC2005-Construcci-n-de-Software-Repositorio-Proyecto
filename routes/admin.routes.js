/**
 * Admin module routes.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const adminController = require('../controllers/admin.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many self-review generation requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.createUser);
router.post('/users/edit', adminController.editUser);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.post('/users/approve', adminController.approveUser);
router.post('/users/reject', adminController.rejectUser);
router.post('/users/delete', adminController.deleteUser);
router.get('/teams', adminController.getTeams);
router.post('/teams/create', adminController.createTeam);
router.post('/teams/edit', adminController.editTeam);
router.post('/teams/delete', adminController.deleteTeam);
router.get('/roles', adminController.getRoles);
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