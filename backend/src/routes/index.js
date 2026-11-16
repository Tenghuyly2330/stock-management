const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const warehouseRoutes = require('./warehouseRoutes');
const supplierRoutes = require('./supplierRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const historyRoutes = require('./historyRoutes');
const settingsRoutes = require('./settingsRoutes');

const router = express.Router();

// Mount system routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/history', historyRoutes);
router.use('/settings', settingsRoutes);

// Root API welcome
router.get('/', (req, res) => {
  res.json({
    name: 'Stock & Inventory Management API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      databaseHealth: '/api/health/db',
      databaseStats: '/api/health/db/stats',
      auth: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        changePassword: 'PUT /api/auth/change-password',
      },
      users: {
        list: 'GET /api/users',
        roles: 'GET /api/users/roles',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
      },
      categories: {
        list: 'GET /api/categories',
        get: 'GET /api/categories/:id',
        create: 'POST /api/categories',
        update: 'PUT /api/categories/:id',
        delete: 'DELETE /api/categories/:id',
      },
      products: {
        list: 'GET /api/products',
        get: 'GET /api/products/:id',
        create: 'POST /api/products',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id',
      },
      warehouses: {
        list: 'GET /api/warehouses',
        get: 'GET /api/warehouses/:id',
        create: 'POST /api/warehouses',
        update: 'PUT /api/warehouses/:id',
        delete: 'DELETE /api/warehouses/:id',
      },
      suppliers: {
        list: 'GET /api/suppliers',
        get: 'GET /api/suppliers/:id',
        create: 'POST /api/suppliers',
        update: 'PUT /api/suppliers/:id',
        delete: 'DELETE /api/suppliers/:id',
      },
      inventory: {
        list: 'GET /api/inventory',
        lowStock: 'GET /api/inventory/low-stock',
        movements: 'GET /api/inventory/movements',
        stockIn: 'POST /api/inventory/stock-in',
        stockOut: 'POST /api/inventory/stock-out',
        adjust: 'POST /api/inventory/adjust',
        transfer: 'POST /api/inventory/transfer',
      },
    },
  });
});

module.exports = router;
