const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// @route   GET /api/health
// @desc    Health check endpoint
// @access  Public
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'Unknown'
    };

    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthCheck.database = 'Connected';
      
      // Optional: Check database response time
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      healthCheck.databaseResponseTime = `${Date.now() - startTime}ms`;
    } else {
      healthCheck.database = 'Disconnected';
      healthCheck.status = 'Degraded';
    }

    // Check Redis connection if available
    if (process.env.REDIS_URL) {
      try {
        const redis = require('redis');
        const client = redis.createClient({ url: process.env.REDIS_URL });
        await client.connect();
        healthCheck.redis = 'Connected';
        await client.quit();
      } catch (error) {
        healthCheck.redis = 'Disconnected';
        healthCheck.status = 'Degraded';
      }
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// @route   GET /api/health/version
// @desc    Get API version information
// @access  Public
router.get('/version', (req, res) => {
  res.json({
    name: 'Expense Management API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;