const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  reason: {
    type: String,
    default: 'inappropriate_behavior'
  }
}, {
  timestamps: true
});

// Index for finding user's reports
reportSchema.index({ reportedId: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;