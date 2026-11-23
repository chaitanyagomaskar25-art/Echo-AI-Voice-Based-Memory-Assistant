const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    taskRemindersEnabled: {
      type: Boolean,
      default: true,
    },
    upcomingTasksAdvanceNotice: {
      type: Number,
      default: 30, // 30 minutes before due date
    },
    dailyBriefingNotification: {
      type: Boolean,
      default: true,
    },
    dailyBriefingTime: {
      type: String,
      default: '09:00',
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    vibrationEnabled: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    expoPushToken: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);
