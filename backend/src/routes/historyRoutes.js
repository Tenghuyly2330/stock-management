const express = require('express');
const {
  getHistory,
  recordAddProduct,
  recordBuyProduct,
  recordCheckout,
} = require('../controllers/historyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Get who bought and who added history log
router.get('/', getHistory);

// Record adding product stock into Base Warehouse (Admin, Manager, Staff)
router.post('/add', authorize('admin', 'manager', 'staff'), recordAddProduct);

// Record customer buying single product (Admin, Manager, Staff)
router.post('/buy', authorize('admin', 'manager', 'staff'), recordBuyProduct);

// Record multi-product cart POS checkout (Admin, Manager, Staff)
router.post('/checkout', authorize('admin', 'manager', 'staff'), recordCheckout);

module.exports = router;

