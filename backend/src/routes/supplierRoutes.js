const express = require('express');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All supplier routes require authentication
router.use(authenticate);

// List suppliers (All authenticated users: admin, manager, staff)
router.get('/', getSuppliers);

// Single supplier profile + purchase history
router.get('/:id', getSupplierById);

// Create supplier (Admin, Manager)
router.post('/', authorize('admin', 'manager'), createSupplier);

// Update supplier (Admin, Manager)
router.put('/:id', authorize('admin', 'manager'), updateSupplier);

// Delete/Deactivate supplier (Admin only)
router.delete('/:id', authorize('admin'), deleteSupplier);

module.exports = router;

