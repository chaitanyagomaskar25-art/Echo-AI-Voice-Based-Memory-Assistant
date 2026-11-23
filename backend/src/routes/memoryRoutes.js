const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');

router.post('/semantic-search', memoryController.semanticSearch);

router.route('/')
  .get(memoryController.getMemories)
  .post(memoryController.createMemory);

router.route('/:id')
  .get(memoryController.getMemoryById)
  .put(memoryController.updateMemory)
  .delete(memoryController.deleteMemory);

router.patch('/:id/pin', memoryController.togglePin);
router.patch('/:id/reminders/:reminderId/toggle', memoryController.toggleReminder);

module.exports = router;
