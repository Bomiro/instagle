const mongoose = require('mongoose');
const { MESSAGE_TYPES } = require('../utils/constants');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPES),
    default: MESSAGE_TYPES.TEXT
  },
  content: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: null
  },
  blocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for message history queries
messageSchema.index({ sessionId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;