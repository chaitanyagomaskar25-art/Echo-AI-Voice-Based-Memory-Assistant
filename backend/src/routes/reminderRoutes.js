const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { optionalAuth } = require('../middleware/auth');
const { validateObjectId, validateReminderPayload } = require('../middleware/validator');

// Preferences
router.route('/preferences')
  .get(optionalAuth, reminderController.getPreferences)
  .put(optionalAuth, reminderController.updatePreferences);

// Reminders CRUD
router.route('/')
  .get(optionalAuth, reminderController.listReminders)
  .post(optionalAuth, validateReminderPayload, reminderController.createReminder);

router.route('/:id')
  .delete(optionalAuth, validateObjectId('id'), reminderController.deleteReminder);

router.patch('/:id/complete', optionalAuth, validateObjectId('id'), reminderController.completeReminder);
router.patch('/:id/snooze', optionalAuth, validateObjectId('id'), reminderController.snoozeReminder);
router.patch('/:id/reschedule', optionalAuth, validateObjectId('id'), reminderController.rescheduleReminder);

module.exports = router;
