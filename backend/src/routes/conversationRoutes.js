const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

router.route('/')
  .get(conversationController.listConversations)
  .post(conversationController.createConversation)
  .delete(conversationController.clearAllConversations);

router.route('/:id')
  .get(conversationController.getConversation)
  .delete(conversationController.deleteConversation);

router.post('/:id/messages', conversationController.sendMessage);

module.exports = router;
