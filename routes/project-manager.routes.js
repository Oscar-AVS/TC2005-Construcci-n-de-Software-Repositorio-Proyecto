/**
 * Project Manager Routes
 */

const express = require('express');
const router = express.Router();
const pmController = require('../controllers/project-manager.controller');

router.get('/dashboard', pmController.getDashboard);
router.get('/projects', pmController.getProjects);
router.get('/project/:id', pmController.getProjectDetail);
router.get('/reports', pmController.getReports);
router.get('/log', pmController.getLog);
router.get('/self-review', pmController.getSelfReview);
router.get('/profile', pmController.getProfile);
router.post('/profile/slack', pmController.postSlack);
router.post('/profile/password', pmController.postPassword);

module.exports = router;