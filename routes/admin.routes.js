/**
 * Admin module routes.
 * System administration: users, teams, roles and integrations.
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.createUser);
router.post('/users/edit', adminController.editUser);
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);
router.get('/teams', adminController.getTeams);
router.post('/teams/create', adminController.createTeam);
router.get('/roles', adminController.getRoles);
router.get('/integrations', adminController.getIntegrations);
router.get('/profile', adminController.getProfile);

module.exports = router;