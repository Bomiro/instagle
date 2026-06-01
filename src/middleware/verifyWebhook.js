const crypto = require('crypto');
const config = require('../config');

/**
 * Verify Meta webhook signature
 * Middleware to validate incoming webhook requests from Meta
 */
const verifyWebhook = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
  
  if (!signature) {
    console.log('❌ Missing webhook signature');
    return res.status(403).send('Missing signature');
  }

  // Parse signature (format: sha256=xxxxx)
  const [algo, hash] = signature.split('=');
  if (algo !== 'sha256') {
    console.log('❌ Invalid signature algorithm');
    return res.status(403).send('Invalid signature algorithm');
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', config.APP_SECRET || config.INSTAGRAM_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // Check length first before timing-safe comparison
  if (hash.length !== expectedSignature.length) {
    console.log('❌ Invalid signature length');
    return res.status(403).send('Invalid signature');
  }

  // Timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.log('❌ Invalid webhook signature');
    return res.status(403).send('Invalid signature');
  }

  next();
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