const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');

// Preferences
router.route('/preferences')
  .get(reminderController.getPreferences)
  .put(reminderController.updatePreferences);

// Reminders CRUD
router.route('/')
  .get(reminderController.listReminders)
  .post(reminderController.createReminder);

router.route('/:id')
  .delete(reminderController.deleteReminder);

router.patch('/:id/complete', reminderController.completeReminder);
router.patch('/:id/snooze', reminderController.snoozeReminder);
router.patch('/:id/reschedule', reminderController.rescheduleReminder);

module.exports = router;
