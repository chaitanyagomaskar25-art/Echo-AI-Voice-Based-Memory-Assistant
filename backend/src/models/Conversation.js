const mongoose = require('mongoose');

const CitedMemorySchema = new mongoose.Schema({
  memoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Memory',
  },
  title: { type: String, required: true },
  category: { type: String, required: true },
  summary: { type: String, default: '' },
  originalTranscript: { type: String, default: '' },
  createdAt: { type: Date, required: true },
  relevanceScore: { type: Number, default: 0 },
});

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'echo'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  citedMemories: [CitedMemorySchema],
  confidence: {
    type: Number,
    default: 1.0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ConversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: 'New Conversation',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    messages: [MessageSchema],
    lastMessageSnippet: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
