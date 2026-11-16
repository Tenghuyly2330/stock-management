const express = require('express');
const {
  getHistory,
  recordAddProduct,
  recordBuyProduct,
} = require('../controllers/historyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get who bought and who added history log
router.get('/', getHistory);

// Record adding product stock into Base Warehouse (Admin, Manager, Staff)
router.post('/add', authorize('admin', 'manager', 'staff'), recordAddProduct);

// Record customer buying products (Admin, Manager, Staff)
router.post('/buy', authorize('admin', 'manager', 'staff'), recordBuyProduct);

module.exports = router;

