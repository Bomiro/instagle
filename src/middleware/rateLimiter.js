const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Default rate limiter for API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_MESSAGES,
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiter for webhook endpoints
 * More permissive as webhooks are validated by signature
 */
const webhookLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 1000, // Higher limit for webhooks
  message: {
    error: 'Webhook rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for message sending
 * Prevents spam by limiting messages per user
 */
const messageLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // Max 30 messages per minute
  keyGenerator: (req) => {
    // Use sender ID from webhook payload if available
    const sender = req.body?.entry?.[0]?.messaging?.[0]?.sender?.id;
    return sender || req.ip;
  },
  message: {
    error: 'Message rate limit exceeded. Please slow down.'
  },
  skip: (req) => {
    // Skip rate limiting for verification challenges
    return req.query?.['hub.mode'] === 'subscribe';
  }
});

module.exports = {
  apiLimiter,
  webhookLimiter,
  messageLimiter
};