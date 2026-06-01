const mongoose = require('mongoose');
const { USER_STATES } = require('../utils/constants');

const strikeSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  instagramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    enum: Object.values(USER_STATES),
    default: USER_STATES.IDLE
  },
  language: {
    type: String,
    default: 'ar',
    enum: ['ar', 'en']
  },
  strikes: [strikeSchema],
  banUntil: {
    type: Date,
    default: null
  },
  currentSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queue queries
userSchema.index({ state: 1, updatedAt: 1 });

/**
 * Check if user is banned
 * @returns {boolean}
 */
userSchema.methods.isBanned = function() {
  if (this.state !== USER_STATES.BANNED) return false;
  if (!this.banUntil) return false;
  return new Date() < this.banUntil;
};

/**
 * Add a strike to user
 * @param {string} reporterId
 */
userSchema.methods.addStrike = function(reporterId) {
  this.strikes.push({
    reportedBy: reporterId,
    timestamp: new Date()
  });
};

/**
 * Get recent strikes within window
 * @param {number} hours
 * @returns {Array}
 */
userSchema.methods.getRecentStrikes = function(hours) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  return this.strikes.filter(strike => strike.timestamp > cutoff);
};

/**
 * Clear expired ban
 */
userSchema.methods.clearBan = function() {
  if (this.banUntil && new Date() >= this.banUntil) {
    this.state = USER_STATES.IDLE;
    this.banUntil = null;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;