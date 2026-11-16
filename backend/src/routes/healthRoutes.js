const express = require('express');
const { testConnection, query } = require('../config/db');
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

/**
 * @route   GET /api/health/db/stats
 * @desc    Fetch live table counts and schema summary metrics
 * @access  Public
 */
router.get('/db/stats', async (req, res) => {
  try {
    const [
      productsCount,
      categoriesCount,
      warehousesCount,
      suppliersCount,
      usersCount,
      inventorySummary,
      migrationsCount,
    ] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM products'),
      query('SELECT COUNT(*)::int as count FROM categories'),
      query('SELECT COUNT(*)::int as count FROM warehouses'),
      query('SELECT COUNT(*)::int as count FROM suppliers'),
      query('SELECT COUNT(*)::int as count FROM users'),
      query(`
        SELECT 
          COALESCE(SUM(i.quantity), 0)::int as total_units,
          COALESCE(SUM(i.quantity * p.purchase_price), 0)::numeric(14,2) as total_valuation,
          COUNT(CASE WHEN i.quantity <= p.min_stock_level THEN 1 END)::int as low_stock_count
        FROM inventory i
        JOIN products p ON i.product_id = p.id
      `),
      query('SELECT COUNT(*)::int as count FROM schema_migrations'),
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Database live statistics retrieved successfully',
      data: {
        tables: {
          products: productsCount.rows[0].count,
          categories: categoriesCount.rows[0].count,
          warehouses: warehousesCount.rows[0].count,
          suppliers: suppliersCount.rows[0].count,
          users: usersCount.rows[0].count,
          migrationsApplied: migrationsCount.rows[0].count,
        },
        inventory: {
          totalUnits: inventorySummary.rows[0].total_units,
          totalValuation: `$${Number(inventorySummary.rows[0].total_valuation).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          lowStockCount: inventorySummary.rows[0].low_stock_count,
        },
      },
    });
  } catch (err) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Failed to fetch database statistics',
      errors: [err.message],
    });
  }
});

module.exports = router;
