const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    dueDate: {
      type: Date,
      default: null, // Strictly null if not explicitly mentioned in transcript
    },
    dueDateText: {
      type: String,
      trim: true,
      default: '', // Exact text from voice memo e.g. "by next Tuesday 3 PM"
    },
    hasAmbiguousDate: {
      type: Boolean,
      default: false, // True if phrase like "sometime next week", "soon", "later"
    },
    dateConfirmed: {
      type: Boolean,
      default: true, // False if user needs to confirm ambiguous date
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'upcoming', 'overdue', 'completed', 'cancelled'],
      default: 'pending',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    memory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Memory',
      default: null, // Every extracted task links to its original memory
    },
    category: {
      type: String,
      enum: ['Ideas', 'Work', 'Study', 'Personal', 'Tasks', 'Whereabouts', 'People', 'Health'],
      default: 'Tasks',
    },
    remindAt: {
      type: Date,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to dynamically compute section
TaskSchema.virtual('section').get(function () {
  if (this.isCompleted) return 'completed';
  if (!this.dueDate) return 'pending';
  const now = new Date();
  if (new Date(this.dueDate) < now) return 'overdue';
  return 'upcoming';
});

TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', TaskSchema);
