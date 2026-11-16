const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Require login for settings
router.use(authenticate);

// View settings (All logged-in users)
router.get('/', getSettings);

// Update settings (Admin & Manager)
router.put('/', authorize('admin', 'manager'), updateSettings);

module.exports = router;

