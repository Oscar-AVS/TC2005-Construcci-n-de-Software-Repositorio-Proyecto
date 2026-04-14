const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { exportPDF, generateAiSummary } = require('../controllers/report.controller');

const aiSummaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many AI summary requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pdfExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many PDF export requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/export-pdf', pdfExportLimiter, exportPDF);
router.get('/ai-summary', aiSummaryLimiter, generateAiSummary);

module.exports = router;