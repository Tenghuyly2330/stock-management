const express = require('express');
const {
  getProducts,
  getProductById,
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(authenticate);

// Read endpoints
router.get('/', getProducts);
router.get('/:id', getProductById);

// Standalone image upload to Cloudinary (returns secure_url and public_id)
router.post('/upload-image', authorize('admin', 'manager'), upload.single('image'), uploadProductImage);

// Create and Update endpoints (supports multipart with file OR JSON with imageUrl)
router.post('/', authorize('admin', 'manager'), upload.single('image'), createProduct);
router.put('/:id', authorize('admin', 'manager'), upload.single('image'), updateProduct);

// Delete restricted to Super Admin
router.delete('/:id', authorize('admin'), deleteProduct);

module.exports = router;
