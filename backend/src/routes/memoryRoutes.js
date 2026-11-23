const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { optionalAuth, protect } = require('../middleware/auth');
const { validateObjectId, validateMemoryPayload } = require('../middleware/validator');

router.post('/semantic-search', optionalAuth, memoryController.semanticSearch);

router.route('/')
  .get(optionalAuth, memoryController.getMemories)
  .post(optionalAuth, validateMemoryPayload, memoryController.createMemory);

router.route('/:id')
  .get(optionalAuth, validateObjectId('id'), memoryController.getMemoryById)
  .put(optionalAuth, validateObjectId('id'), validateMemoryPayload, memoryController.updateMemory)
  .delete(optionalAuth, validateObjectId('id'), memoryController.deleteMemory);

router.patch('/:id/pin', optionalAuth, validateObjectId('id'), memoryController.togglePin);
router.patch('/:id/favorite', optionalAuth, validateObjectId('id'), memoryController.toggleFavorite);
router.patch('/:id/archive', optionalAuth, validateObjectId('id'), memoryController.toggleArchive);
router.get('/:id/tasks', optionalAuth, validateObjectId('id'), memoryController.getMemoryTasks);
router.patch('/:id/reminders/:reminderId/toggle', optionalAuth, validateObjectId('id'), memoryController.toggleReminder);

module.exports = router;
