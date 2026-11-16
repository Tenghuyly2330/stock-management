const express = require('express');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

// Mount modules
router.use('/health', healthRoutes);

// Root API welcome
router.get('/', (req, res) => {
  res.json({
    name: 'Stock & Inventory Management API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      databaseHealth: '/api/health/db',
    },
  });
});

module.exports = router;
