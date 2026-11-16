const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Read endpoints accessible by all roles (Admin, Manager, Staff)
router.get('/', getProducts);
router.get('/:id', getProductById);

// Create and Update accessible by Admin and Manager
router.post('/', authorize('admin', 'manager'), createProduct);
router.put('/:id', authorize('admin', 'manager'), updateProduct);

// Delete restricted to Super Admin
router.delete('/:id', authorize('admin'), deleteProduct);

module.exports = router;
