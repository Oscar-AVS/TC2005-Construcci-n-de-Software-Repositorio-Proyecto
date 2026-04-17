/**
 * Slack Integration routes.
 * Webhook endpoints for receiving data from Slack workflows.
 */

const express = require('express');
const router = express.Router();
const slackController = require('../controllers/slack.controller.js');

// Validation middleware for Slack requests
router.use((req, res, next) => {
  const secret = process.env.SLACK_WEBHOOK_SECRET;

  if (!secret) return next();

  const provided = req.headers['x-slack-secret'] || req.query.secret;
  if (provided !== secret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid or missing webhook secret.',
    });
  }

  next();
});

router.post('/standup', slackController.receiveStandup);

module.exports = router;
