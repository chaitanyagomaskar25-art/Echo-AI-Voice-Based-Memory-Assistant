const Reminder = require('../models/Reminder');
const Task = require('../models/Task');
const Memory = require('../models/Memory');
const NotificationPreference = require('../models/NotificationPreference');

// List reminders (sorted upcoming first)
exports.listReminders = async (req, res, next) => {
  try {
    const { status = 'all', sourceType } = req.query;

    const query = {};
    if (status === 'scheduled') {
      query.isCompleted = false;
    } else if (status === 'completed') {
      query.isCompleted = true;
    }
    if (sourceType) {
      query.sourceType = sourceType;
    }

    const reminders = await Reminder.find(query)
      .populate('task', 'title priority dueDate isCompleted category')
      .populate('memory', 'title category createdAt')
      .sort({ isCompleted: 1, remindAt: 1 });

    const scheduledCount = await Reminder.countDocuments({ isCompleted: false });
    const completedCount = await Reminder.countDocuments({ isCompleted: true });

    res.json({
      success: true,
      count: reminders.length,
      counts: {
        scheduled: scheduledCount,
        completed: completedCount,
      },
      data: reminders,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new reminder
exports.createReminder = async (req, res, next) => {
  try {
    const {
      title,
      note,
      remindAt,
      timezone,
      sourceType = 'custom',
      taskId,
      memoryId,
      notificationId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Reminder title is required' });
    }
    if (!remindAt) {
      return res.status(400).json({ success: false, message: 'Reminder date/time is required' });
    }

    // Duplicate Prevention: Check if active reminder already exists for the same task
    if (taskId) {
      const existing = await Reminder.findOne({ task: taskId, isCompleted: false });
      if (existing) {
        existing.title = title.trim();
        existing.note = note ? note.trim() : '';
        existing.remindAt = new Date(remindAt);
        existing.timezone = timezone || existing.timezone;
        existing.notificationId = notificationId || existing.notificationId;
        existing.isSnoozed = false;
        existing.status = 'scheduled';
        await existing.save();
        await existing.populate('task', 'title priority dueDate');

        return res.json({
          success: true,
          message: 'Existing reminder updated and rescheduled (duplicate avoided)',
          data: existing,
          rescheduled: true,
        });
      }
    }

    const reminder = new Reminder({
      title: title.trim(),
      note: note ? note.trim() : '',
      remindAt: new Date(remindAt),
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      sourceType,
      task: taskId || null,
      memory: memoryId || null,
      notificationId: notificationId || '',
      status: 'scheduled',
    });

    const saved = await reminder.save();
    await saved.populate('task', 'title priority dueDate');
    await saved.populate('memory', 'title category');

    // Also update Task remindAt if linked
    if (taskId) {
      await Task.findByIdAndUpdate(taskId, { remindAt: new Date(remindAt) }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Reminder scheduled successfully',
      data: saved,
    });
  } catch (error) {
    next(error);
  }
};

// Mark reminder as completed
exports.completeReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    reminder.isCompleted = true;
    reminder.completedAt = new Date();
    reminder.status = 'completed';
    await reminder.save();

    // If linked to a task, optionally sync task completion
    if (reminder.task) {
      await Task.findByIdAndUpdate(reminder.task, {
        isCompleted: true,
        completedAt: new Date(),
        status: 'completed',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Reminder marked as completed',
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Snooze reminder by X minutes
exports.snoozeReminder = async (req, res, next) => {
  try {
    const { minutes = 15, notificationId } = req.body;
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    const snoozeDurationMs = Number(minutes) * 60 * 1000;
    const newRemindAt = new Date(Date.now() + snoozeDurationMs);

    reminder.isSnoozed = true;
    reminder.snoozeCount = (reminder.snoozeCount || 0) + 1;
    reminder.snoozedUntil = newRemindAt;
    reminder.remindAt = newRemindAt;
    reminder.status = 'snoozed';
    if (notificationId) {
      reminder.notificationId = notificationId;
    }

    await reminder.save();

    res.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minutes`,
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Reschedule custom date and time
exports.rescheduleReminder = async (req, res, next) => {
  try {
    const { remindAt, timezone, notificationId } = req.body;
    if (!remindAt) {
      return res.status(400).json({ success: false, message: 'New reminder date/time is required' });
    }

    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    reminder.remindAt = new Date(remindAt);
    if (timezone) reminder.timezone = timezone;
    if (notificationId) reminder.notificationId = notificationId;
    reminder.isSnoozed = false;
    reminder.status = 'scheduled';

    await reminder.save();

    res.json({
      success: true,
      message: 'Reminder rescheduled successfully',
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

// Delete / Cancel reminder
exports.deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found' });
    }

    res.json({
      success: true,
      message: 'Reminder cancelled and deleted',
      id: req.params.id,
      notificationId: reminder.notificationId,
    });
  } catch (error) {
    next(error);
  }
};

// Get notification preferences
exports.getPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne();
    if (!prefs) {
      prefs = await NotificationPreference.create({});
    }
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne();
    if (!prefs) {
      prefs = new NotificationPreference();
    }

    const {
      pushEnabled,
      taskRemindersEnabled,
      upcomingTasksAdvanceNotice,
      dailyBriefingNotification,
      dailyBriefingTime,
      soundEnabled,
      vibrationEnabled,
      timezone,
      expoPushToken,
    } = req.body;

    if (pushEnabled !== undefined) prefs.pushEnabled = pushEnabled;
    if (taskRemindersEnabled !== undefined) prefs.taskRemindersEnabled = taskRemindersEnabled;
    if (upcomingTasksAdvanceNotice !== undefined) prefs.upcomingTasksAdvanceNotice = upcomingTasksAdvanceNotice;
    if (dailyBriefingNotification !== undefined) prefs.dailyBriefingNotification = dailyBriefingNotification;
    if (dailyBriefingTime !== undefined) prefs.dailyBriefingTime = dailyBriefingTime;
    if (soundEnabled !== undefined) prefs.soundEnabled = soundEnabled;
    if (vibrationEnabled !== undefined) prefs.vibrationEnabled = vibrationEnabled;
    if (timezone !== undefined) prefs.timezone = timezone;
    if (expoPushToken !== undefined) prefs.expoPushToken = expoPushToken;

    const saved = await prefs.save();
    res.json({ success: true, message: 'Preferences updated successfully', data: saved });
  } catch (error) {
    next(error);
  }
};
