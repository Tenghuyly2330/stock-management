const express = require('express');
const { testConnection } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Get API server health status
 * @access  Public
 */
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  return successResponse(res, {
    statusCode: 200,
    message: 'Stock Management API is running healthy',
    data: {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)} seconds`,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      },
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

/**
 * @route   GET /api/health/db
 * @desc    Verify PostgreSQL database connectivity and latency
 * @access  Public
 */
router.get('/db', async (req, res) => {
  try {
    const dbInfo = await testConnection();
    return successResponse(res, {
      statusCode: 200,
      message: 'PostgreSQL database connection is healthy',
      data: {
        database: 'Connected',
        latency: `${dbInfo.latencyMs}ms`,
        serverTime: dbInfo.timestamp,
        engine: dbInfo.version,
      },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 503,
      message: 'PostgreSQL database connection failed',
      errors: [err.message],
      code: 'DATABASE_UNAVAILABLE',
    });
  }
});

module.exports = router;
