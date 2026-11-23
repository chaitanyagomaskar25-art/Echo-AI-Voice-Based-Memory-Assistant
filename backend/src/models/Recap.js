const mongoose = require('mongoose');

const recapItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    memoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory', default: null },
    memoryTitle: { type: String, default: '' },
    category: { type: String, default: '' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    dateText: { type: String, default: '' },
    dueDate: { type: Date, default: null },
    priority: { type: String, default: '' },
  },
  { _id: false }
);

const recapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['daily', 'weekly'],
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    periodLabel: {
      type: String,
      required: true,
    },
    headline: {
      type: String,
      default: '',
    },
    overview: {
      type: String,
      default: '',
    },
    sections: {
      thingsLearned: [recapItemSchema],
      ideasCaptured: [recapItemSchema],
      workCompleted: [recapItemSchema],
      tasksPending: [recapItemSchema],
      upcomingDeadlines: [recapItemSchema],
      importantDecisions: [recapItemSchema],
    },
    stats: {
      totalMemories: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      completedTasksCount: { type: Number, default: 0 },
      pendingTasksCount: { type: Number, default: 0 },
      categoryCounts: { type: Map, of: Number, default: {} },
    },
    sourceMemories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Memory',
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    lastMemoryUpdatedAt: {
      type: Date,
      default: null,
    },
    isAiGenerated: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

recapSchema.index({ user: 1, type: 1, dateKey: 1 }, { unique: true });
recapSchema.index({ user: 1, periodStart: -1 });

module.exports = mongoose.model('Recap', recapSchema);
