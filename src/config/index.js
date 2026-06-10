require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/instagle',

  // Instagram / Meta Graph API
  INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
  INSTAGRAM_PAGE_ACCESS_TOKEN: process.env.INSTAGRAM_PAGE_ACCESS_TOKEN,
  INSTAGRAM_BUSINESS_ACCOUNT_ID: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  INSTAGRAM_API_VERSION: process.env.INSTAGRAM_API_VERSION || 'v18.0',

  // Webhook
  WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || 'instagle_verify_token',
  APP_SECRET: process.env.APP_SECRET,

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  RATE_LIMIT_MAX_MESSAGES: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES) || 30,

  // Security
  BAN_DURATION_HOURS: parseInt(process.env.BAN_DURATION_HOURS) || 24,
  STRIKES_THRESHOLD: parseInt(process.env.STRIKES_THRESHOLD) || 3,
  STRIKES_WINDOW_HOURS: parseInt(process.env.STRIKES_WINDOW_HOURS) || 24,

  // Languages
  DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en']
};