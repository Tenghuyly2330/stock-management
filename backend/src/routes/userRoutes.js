const express = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All user management routes require authentication
router.use(authenticate);

// Role listing for user creation dropdowns
router.get('/roles', authorize('admin', 'manager'), getRoles);

// User listings & details (Admin and Manager)
router.get('/', authorize('admin', 'manager'), getUsers);
router.get('/:id', authorize('admin', 'manager'), getUserById);

// User modifications (Strictly Super Admin)
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
