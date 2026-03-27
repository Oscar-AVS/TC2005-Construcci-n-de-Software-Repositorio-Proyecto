/**
 * Admin module routes.
 * System administration: users, teams, roles and integrations.
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Dashboard - system overview
router.get('/dashboard', adminController.getDashboard);

// Users - CRUD and credential management
router.get('/users', adminController.getUsers);

// Deactivate / activate a user account
router.patch('/users/:id/toggle-status', adminController.toggleUserStatus);

// Teams - CRUD and member assignment
router.get('/teams', adminController.getTeams);

// Roles - RBAC management
router.get('/roles', adminController.getRoles);

// Integrations - external services configuration
router.get('/integrations', adminController.getIntegrations);

// Profile - uses shared view
router.get('/profile', adminController.getProfile);

module.exports = router;