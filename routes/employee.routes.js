/**
 * Employee module routes.
 * Protect with isAuth middleware when RBAC is implemented.
 */

const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employee.controller');

router.get('/dashboard', employeeController.getDashboard);
router.get('/log', employeeController.getLog);
router.get('/achievements', employeeController.getAchievements);
router.get('/self-review', employeeController.getSelfReview);
router.get('/projects', employeeController.getProjects);
router.get('/profile', employeeController.getProfile);

module.exports = router;