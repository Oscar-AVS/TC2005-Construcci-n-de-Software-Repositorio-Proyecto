// routes/report.routes.js
const express = require('express');
const router = express.Router();
const { exportPDF, generateAiSummary } = require('../controllers/report.controller');

router.get('/export-pdf', exportPDF);
router.get('/ai-summary', generateAiSummary);
module.exports = router;