const express = require('express');
const router = express.Router();
const recapController = require('../controllers/recapController');
const { optionalAuth } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validator');
const { aiLimiter } = require('../middleware/rateLimiter');

router.get('/', optionalAuth, aiLimiter, recapController.getRecap);
router.get('/history', optionalAuth, recapController.getRecapHistory);
router.get('/:id', optionalAuth, validateObjectId('id'), recapController.getRecapById);

module.exports = router;
