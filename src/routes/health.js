const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const queueService = require('../services/queue');

/**
 * GET /health
 * Health check endpoint for monitoring
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {}
  };

  // Check MongoDB connection
  health.services.mongodb = {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState
  };

  // Check queue stats
  try {
    const stats = await queueService.getStats();
    health.services.queue = {
      status: 'ok',
      ...stats
    };
  } catch (error) {
    health.services.queue = {
      status: 'error',
      error: error.message
    };
  }

  // Overall status
  if (health.services.mongodb.status !== 'connected') {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (req, res) => {
  // Check if MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'not ready', reason: 'MongoDB not connected' });
  }

  res.status(200).json({ status: 'ready' });
});

module.exports = router;