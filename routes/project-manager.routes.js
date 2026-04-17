/**
 * Project Manager Routes
 */
const express      = require('express');
const router       = express.Router();
const pmController = require('../controllers/project-manager.controller');

// Generales
router.get('/dashboard',   pmController.getDashboard);
router.get('/reports',     pmController.getReports);
router.get('/log',         pmController.getLog);
router.get('/self-review', pmController.getSelfReview);