const mongoose = require('mongoose');
const { SESSION_STATUS, END_REASONS } = require('../utils/constants');

const sessionSchema = new mongoose.Schema({
  userA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  // Timestamp of the last activity in the session (message sent)
  lastActivity: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  endedBy: {
    type: String,
    enum: Object.values(END_REASONS),
    default: null
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.ACTIVE
  }
}, {
  timestamps: true
});

// Compound index for finding active sessions
sessionSchema.index({ status: 1, startedAt: -1 });

/**
 * End the session
 * @param {string} reason - Who ended the session
 */
sessionSchema.methods.end = function(reason) {
  this.status = SESSION_STATUS.ENDED;
  this.endedAt = new Date();
  this.endedBy = reason;
};

/**
 * Get duration in seconds
 * @returns {number}
 */
sessionSchema.methods.getDuration = function() {
  if (!this.endedAt) {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }
  return Math.floor((this.endedAt - this.startedAt) / 1000);
};

/**
 * Get the other user in the session
 * @param {string} userId
 * @returns {mongoose.Schema.Types.ObjectId|null}
 */
sessionSchema.methods.getPartner = function(userId) {
  if (this.userA.toString() === userId.toString()) {
    return this.userB;
  }
  if (this.userB.toString() === userId.toString()) {
    return this.userA;
  }
  return null;
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;