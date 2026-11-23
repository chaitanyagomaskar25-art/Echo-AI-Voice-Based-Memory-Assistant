const mongoose = require('mongoose');

const EntitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['person', 'location', 'date', 'object', 'action', 'concept', 'project', 'event'],
    default: 'concept',
  },
});

const ReminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  remindAt: { type: Date, default: null },
  isCompleted: { type: Boolean, default: false },
});

const MemorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    transcript: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
      default: '',
    },
    mainPoints: [{
      type: String,
      trim: true,
    }],
    datesAndDeadlines: [{
      dateText: { type: String, default: '' },
      context: { type: String, default: '' },
      isoDate: { type: Date, default: null },
    }],
    originalTranscript: {
      type: String,
      trim: true,
      default: '',
    },
    editedByUser: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['Personal', 'Work', 'Ideas', 'Whereabouts', 'People', 'Health', 'Tasks', 'Study'],
      default: 'Personal',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    entities: [EntitySchema],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'urgent', 'thoughtful', 'concerned'],
      default: 'neutral',
    },
    audioUrl: {
      type: String,
      default: null,
    },
    audioDuration: {
      type: Number,
      default: 0, // seconds
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    clientLocalId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    reminders: [ReminderSchema],
    actionItems: [{
      type: String,
    }],
    importance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    locationContext: {
      type: String,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    transcriptionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed',
    },
    language: {
      type: String,
      default: 'en',
    },
    transcriptionError: {
      type: String,
      default: null,
    },
    transcriptionProvider: {
      type: String,
      default: 'whisper',
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-speed text search and filtering
MemorySchema.index({ title: 'text', transcript: 'text', summary: 'text', tags: 'text' });
MemorySchema.index({ category: 1, createdAt: -1 });
MemorySchema.index({ isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('Memory', MemorySchema);
