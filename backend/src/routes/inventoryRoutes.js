const express = require('express');
const {
  getInventory,
  getLowStockAlerts,
  stockIn,
  stockOut,
  adjustStock,
  transferStock,
  getStockMovements,
} = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All inventory operations require authentication
router.use(authenticate);

// View current stock matrix & metrics
router.get('/', getInventory);

// Fast low stock alerts query
router.get('/low-stock', getLowStockAlerts);

// Stock movement audit history ledger
router.get('/movements', getStockMovements);

// Stock in: Receive products into a warehouse (Admin, Manager, Staff)
router.post('/stock-in', authorize('admin', 'manager', 'staff'), stockIn);

// Stock out: Dispatch/deduct products with negative prevention (Admin, Manager, Staff)
router.post('/stock-out', authorize('admin', 'manager', 'staff'), stockOut);

// Stock adjustment: Physical audit count adjustment (Admin, Manager)
router.post('/adjust', authorize('admin', 'manager'), adjustStock);

// Stock transfer: Transfer stock between warehouses atomically (Admin, Manager, Staff)
router.post('/transfer', authorize('admin', 'manager', 'staff'), transferStock);

module.exports = router;

