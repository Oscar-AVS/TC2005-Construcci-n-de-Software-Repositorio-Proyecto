/**
 * Authentication routes.
 * Public: no active session required.
 */

const express = require('express');
const router = express.Router();

const usersController = require('../controllers/users.controller');

router.get('/login', usersController.getLogin);
router.post('/login', usersController.postLogin);
router.get('/logout', usersController.getLogout);
router.get('/signup', usersController.getSignup);
router.post('/signup', usersController.postSignup);

module.exports = router;