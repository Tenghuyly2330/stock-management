const express = require('express');
const {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} = require('../controllers/warehouseController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All warehouse routes require authentication
router.use(authenticate);

// List warehouses (All authenticated users: admin, manager, staff)
router.get('/', getWarehouses);

// Get single warehouse profile with its inventory items
router.get('/:id', getWarehouseById);

// Create warehouse (Admin, Manager)
router.post('/', authorize('admin', 'manager'), createWarehouse);

// Update warehouse (Admin, Manager)
router.put('/:id', authorize('admin', 'manager'), updateWarehouse);

// Delete/Deactivate warehouse (Admin only)
router.delete('/:id', authorize('admin'), deleteWarehouse);

module.exports = router;
