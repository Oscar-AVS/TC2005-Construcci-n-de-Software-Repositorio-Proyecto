/**
 * Project Manager Routes
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const pmController = require('../controllers/project-manager.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many self-review generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', pmController.getDashboard);
router.get('/projects', pmController.getProjects);
router.get('/project/:id', pmController.getProjectDetail);
router.get('/reports', pmController.getReports);
router.get('/log', pmController.getLog);
router.get('/self-review', pmController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, pmController.generateSelfReview);
router.get('/profile', pmController.getProfile);
router.post('/profile/slack', pmController.postSlack);
router.post('/profile/password', pmController.postPassword);

module.exports = router;