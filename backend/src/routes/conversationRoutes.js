const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { optionalAuth } = require('../middleware/auth');
const { validateObjectId, validateConversationMessage } = require('../middleware/validator');
const { aiLimiter } = require('../middleware/rateLimiter');

router.route('/')
  .get(optionalAuth, conversationController.listConversations)
  .post(optionalAuth, conversationController.createConversation)
  .delete(optionalAuth, conversationController.clearAllConversations);

router.route('/:id')
  .get(optionalAuth, validateObjectId('id'), conversationController.getConversation)
  .delete(optionalAuth, validateObjectId('id'), conversationController.deleteConversation);

router.post(
  '/:id/messages',
  optionalAuth,
  aiLimiter,
  validateConversationMessage,
  conversationController.sendMessage
);

module.exports = router;
