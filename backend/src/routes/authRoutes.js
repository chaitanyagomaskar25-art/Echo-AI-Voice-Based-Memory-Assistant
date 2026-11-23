const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

// Public authentication routes (rate-limited and payload-validated)
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected user routes
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);

// Data deletion & GDPR account purge
router.delete('/account', protect, authController.deleteAccount);
router.delete('/data', protect, authController.clearUserData);

module.exports = router;
