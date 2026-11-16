const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All catalog routes require authentication
router.use(authenticate);

// Read endpoints accessible by all roles (Admin, Manager, Staff)
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Create and Update accessible by Admin and Manager
router.post('/', authorize('admin', 'manager'), createCategory);
router.put('/:id', authorize('admin', 'manager'), updateCategory);

// Delete restricted to Super Admin
router.delete('/:id', authorize('admin'), deleteCategory);

module.exports = router;

