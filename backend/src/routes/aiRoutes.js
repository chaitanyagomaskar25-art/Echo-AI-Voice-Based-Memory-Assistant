const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

router.post('/ask', optionalAuth, aiLimiter, aiController.askEcho);
router.post('/enrich', optionalAuth, aiLimiter, aiController.enrichText);

module.exports = router;
