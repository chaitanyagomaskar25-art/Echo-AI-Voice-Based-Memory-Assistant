const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { optionalAuth } = require('../middleware/auth');
const { validateObjectId, validateTaskPayload } = require('../middleware/validator');

router.route('/')
  .get(optionalAuth, taskController.listTasks)
  .post(optionalAuth, validateTaskPayload, taskController.createTask);

router.route('/:id')
  .get(optionalAuth, validateObjectId('id'), taskController.getTaskById)
  .put(optionalAuth, validateObjectId('id'), validateTaskPayload, taskController.updateTask)
  .delete(optionalAuth, validateObjectId('id'), taskController.deleteTask);

router.patch('/:id/complete', optionalAuth, validateObjectId('id'), taskController.toggleComplete);
router.patch('/:id/reschedule', optionalAuth, validateObjectId('id'), taskController.rescheduleTask);
router.patch('/:id/confirm-date', optionalAuth, validateObjectId('id'), taskController.confirmAmbiguousDate);
router.post('/extract-from-memory/:memoryId', optionalAuth, validateObjectId('memoryId'), taskController.extractFromMemory);

module.exports = router;
