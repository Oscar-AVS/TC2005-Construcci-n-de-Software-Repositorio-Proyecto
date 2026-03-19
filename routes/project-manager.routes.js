/**
 * Project Manager Routes
 * All routes prefixed with /project-manager
 * TODO: Protect with isAuth middleware when RBAC is implemented
 */

const express = require('express');
const router = express.Router();
const pmController = require('../controllers/project-manager.controller');

// Dashboard
router.get('/dashboard', pmController.getDashboard);

// Projects management
router.get('/projects', pmController.getProjects);
router.get('/project/:id', pmController.getProjectDetail);

// Reports
router.get('/reports', pmController.getReports);

// Personal tools (shared views)
router.get('/log', pmController.getLog);
router.get('/self-review', pmController.getSelfReview);
router.get('/profile', pmController.getProfile);

module.exports = router;