const express = require('express');
const { login, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/login', login);

router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

module.exports = router;

