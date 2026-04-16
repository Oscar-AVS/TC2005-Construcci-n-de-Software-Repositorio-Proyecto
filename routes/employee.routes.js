/**
 * Employee module routes.
 * Protect with isAuth middleware when RBAC is implemented.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const employeeController = require('../controllers/employee.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many self-review generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/dashboard', employeeController.getDashboard);
router.get('/log', employeeController.getLog);
router.post('/log', employeeController.postLog);
router.post('/log/edit', employeeController.putLog);
router.post('/log/delete', employeeController.deleteLog);
router.get('/achievements', employeeController.getAchievements);
router.post('/achievements', employeeController.postAchievement);
router.post('/achievements/delete', employeeController.deleteAchievement);
router.get('/self-review', employeeController.getSelfReview);
router.get('/self-review/generate', selfReviewLimiter, employeeController.generateSelfReview);
router.post('/self-review/export-pdf', selfReviewLimiter, employeeController.exportSelfReviewPDF);
router.get('/projects', employeeController.getProjects);
router.get('/profile', employeeController.getProfile);
router.post('/profile/slack', employeeController.postSlack);
router.post('/profile/password', employeeController.postPassword);

module.exports = router;