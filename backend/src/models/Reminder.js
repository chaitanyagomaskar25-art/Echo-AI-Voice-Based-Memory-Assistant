const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    remindAt: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    isSnoozed: {
      type: Boolean,
      default: false,
    },
    snoozeCount: {
      type: Number,
      default: 0,
    },
    snoozedUntil: {
      type: Date,
      default: null,
    },
    notificationId: {
      type: String,
      default: '', // Expo local notification identifier for duplicate prevention & cancellation
    },
    expoPushToken: {
      type: String,
      default: '',
    },
    sourceType: {
      type: String,
      enum: ['task', 'memory', 'custom'],
      default: 'custom',
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    memory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memory',
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'sent', 'completed', 'cancelled', 'snoozed'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Reminder', ReminderSchema);
