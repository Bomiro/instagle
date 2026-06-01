const User = require('../models/User');
const { USER_STATES } = require('../utils/constants');

/**
 * Queue Service
 * Manages the global queue of users waiting for a chat partner
 */
class QueueService {
  constructor() {
    this.processing = false;
  }

  /**
   * Add user to queue
   * @param {string} userId - User MongoDB ID
   * @returns {Promise<boolean>} True if added successfully
   */
  async addToQueue(userId) {
    const user = await User.findById(userId);
    if (!user) return false;

    // Check if user is already in queue or chatting
    if (user.state === USER_STATES.QUEUED || user.state === USER_STATES.CHATTING) {
      return false;
    }

    user.state = USER_STATES.QUEUED;
    user.queuedAt = new Date();
    await user.save();

    return true;
  }

  /**
   * Remove user from queue
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async removeFromQueue(userId) {
    const user = await User.findById(userId);
    if (!user) return false;

    if (user.state !== USER_STATES.QUEUED) {
      return false;
    }

    user.state = USER_STATES.IDLE;
    user.queuedAt = null;
    await user.save();

    return true;
  }

  /**
   * Get queue length
   * @returns {Promise<number>}
   */
  async getQueueLength() {
    return User.countDocuments({ state: USER_STATES.QUEUED });
  }

  /**
   * Get users in queue (ordered by join time)
   * @param {number} limit - Number of users to retrieve
   * @returns {Promise<Array>}
   */
  async getQueuedUsers(limit = 100) {
    return User.find({ state: USER_STATES.QUEUED })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * Check if user is in queue
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async isInQueue(userId) {
    const user = await User.findById(userId);
    return user && user.state === USER_STATES.QUEUED;
  }

  /**
   * Pop first N users from queue
   * @param {number} count - Number of users to pop
   * @returns {Promise<Array>} Array of user IDs
   */
  async popFromQueue(count = 2) {
    const users = await User.find({ state: USER_STATES.QUEUED })
      .sort({ updatedAt: 1 })
      .limit(count)
      .lean();

    if (users.length < count) {
      return [];
    }

    // Return user IDs
    return users.map(u => u._id);
  }

  /**
   * Clear all users from queue (admin function)
   * @returns {Promise<number>} Number of users removed
   */
  async clearQueue() {
    const result = await User.updateMany(
      { state: USER_STATES.QUEUED },
      { $set: { state: USER_STATES.IDLE, queuedAt: null } }
    );
    return result.modifiedCount;
  }

  /**
   * Get queue stats
   * @returns {Promise<Object>}
   */
  async getStats() {
    const [total, queued, chatting, banned] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ state: USER_STATES.QUEUED }),
      User.countDocuments({ state: USER_STATES.CHATTING }),
      User.countDocuments({ state: USER_STATES.BANNED })
    ]);

    return {
      totalUsers: total,
      queued: queued,
      chatting: chatting,
      banned: banned,
      timestamp: new Date()
    };
  }
}

module.exports = new QueueService();