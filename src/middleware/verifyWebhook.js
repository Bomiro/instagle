const config = require('../config');

/**
 * Verify Meta webhook
 * Middleware to validate incoming webhook requests from Meta
 */
const verifyWebhook = (req, res, next) => {
  const body = req.body;

  // Verify it's an Instagram webhook
  if (body.object === 'instagram') {
    return next();
  }

  console.log('❌ Invalid webhook object');
  return res.status(403).send('Invalid webhook');
};

/**
 * Verify webhook verification challenge (GET request)
 * Used during webhook setup in Meta Developer Portal
 */
const verifyChallenge = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.log('❌ Webhook verification failed');
  return res.status(403).send('Verification failed');
};

module.exports = {
  verifyWebhook,
  verifyChallenge
};