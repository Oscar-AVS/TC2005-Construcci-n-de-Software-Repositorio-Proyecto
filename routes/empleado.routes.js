/**
 * Employee module routes.
 * Protect with isAuth middleware when RBAC is implemented.
 */

const express = require('express');
const router = express.Router();

const empleadoController = require('../controllers/empleado.controller');

router.get('/dashboard', empleadoController.getDashboard);

module.exports = router;