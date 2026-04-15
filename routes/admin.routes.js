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
router.post('/users/approve', adminController.approveUser);
router.post('/users/reject', adminController.rejectUser);
router.post('/users/delete', adminController.deleteUser);
router.get('/teams', adminController.getTeams);
router.post('/teams/create', adminController.createTeam);
router.post('/teams/edit', adminController.editTeam);
router.post('/teams/delete', adminController.deleteTeam);
router.get('/roles', adminController.getRoles);
router.get('/profile', adminController.getProfile);

module.exports = router;