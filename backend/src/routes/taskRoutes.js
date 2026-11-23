const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.route('/')
  .get(taskController.listTasks)
  .post(taskController.createTask);

router.route('/:id')
  .get(taskController.getTaskById)
  .put(taskController.updateTask)
  .delete(taskController.deleteTask);

router.patch('/:id/complete', taskController.toggleComplete);
router.patch('/:id/reschedule', taskController.rescheduleTask);
router.patch('/:id/confirm-date', taskController.confirmAmbiguousDate);
router.post('/extract-from-memory/:memoryId', taskController.extractFromMemory);

module.exports = router;
