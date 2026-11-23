const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { optionalAuth } = require('../middleware/auth');

router.post('/semantic-search', optionalAuth, memoryController.semanticSearch);

router.route('/')
  .get(optionalAuth, memoryController.getMemories)
  .post(optionalAuth, memoryController.createMemory);

router.route('/:id')
  .get(optionalAuth, memoryController.getMemoryById)
  .put(optionalAuth, memoryController.updateMemory)
  .delete(optionalAuth, memoryController.deleteMemory);

router.patch('/:id/pin', optionalAuth, memoryController.togglePin);
router.patch('/:id/favorite', optionalAuth, memoryController.toggleFavorite);
router.patch('/:id/archive', optionalAuth, memoryController.toggleArchive);
router.get('/:id/tasks', optionalAuth, memoryController.getMemoryTasks);
router.patch('/:id/reminders/:reminderId/toggle', optionalAuth, memoryController.toggleReminder);

module.exports = router;
