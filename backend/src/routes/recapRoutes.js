const express = require('express');
const router = express.Router();
const recapController = require('../controllers/recapController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, recapController.getRecap);
router.get('/history', optionalAuth, recapController.getRecapHistory);
router.get('/:id', optionalAuth, recapController.getRecapById);

module.exports = router;
