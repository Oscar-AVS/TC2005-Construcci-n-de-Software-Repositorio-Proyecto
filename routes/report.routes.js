// routes/report.routes.js
const express = require('express');
const router = express.Router();
const { exportPDF } = require('../controllers/report.controller');

router.get('/export-pdf', exportPDF);

module.exports = router;