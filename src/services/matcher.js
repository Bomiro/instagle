const User = require('../models/User');
const Session = require('../models/Session');
const queueService = require('./queue');
const instagramService = require('./instagram');
const translator = require('./translator');
const { USER_STATES, SESSION_STATUS } = require('../utils/constants');

/**
 * Matcher Service
 * Handles random pairing of users from the queue
 */
class MatcherService {
  constructor() {
    this.matchingInterval = null;
  }

  /**
   * Start the automatic matching process
   * @param {number} intervalMs - Check interval in milliseconds
   */
  startAutoMatching(intervalMs = 1000) {
    if (this.matchingInterval) {
      return;
    }

    this.matchingInterval = setInterval(async () => {
      await this.matchUsers();
    }, intervalMs);

    console.log('🔄 Auto-matching started');
  }

  /**
   * Stop automatic matching
   */
  stopAutoMatching() {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
      console.log('⏹️ Auto-matching stopped');
    }
  }

  /**
   * Match users from queue
   * Attempts to pair users two at a time
   * @returns {Promise<number>} Number of pairs created
   */
  async matchUsers() {
    try {
      // Get minimum of 2 users from queue
      const userIds = await queueService.popFromQueue(2);

      if (userIds.length < 2) {
        return 0;
      }

      const [userAId, userBId] = userIds;
      const session = await this.createSession(userAId, userBId);

      if (session) {
        console.log(`🎉 Matched users: ${userAId} <-> ${userBId}`);
        return 1;
      }

      return 0;
    } catch (error) {
      console.error('Match error:', error);
      return 0;
    }
  }

  /**
   * Create a chat session between two users
   * @param {string} userAId
   * @param {string} userBId
   * @returns {Promise<Object|null>} Session object or null
   */
  async createSession(userAId, userBId) {
    // Fetch users
    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(userBId)
    ]);

    if (!userA || !userB) {
      console.error('One or both users not found');
      return null;
    }

    // Double-check they're still in QUEUED state
    if (userA.state !== USER_STATES.QUEUED || userB.state !== USER_STATES.QUEUED) {
      console.error('Users not in QUEUED state');
      return null;
    }

    // Create session
    const session = new Session({
      userA: userAId,
      userB: userBId,
      status: SESSION_STATUS.ACTIVE
    });
    await session.save();

    // Update user states and references
    userA.state = USER_STATES.CHATTING;
    userA.currentSessionId = session._id;
    userA.partnerId = userBId;
    await userA.save();

    userB.state = USER_STATES.CHATTING;
    userB.currentSessionId = session._id;
    userB.partnerId = userAId;
    await userB.save();

    // Send messages to both users
    await this.notifyMatchFound(userA, userB, session);

    return session;
  }

  /**
   * Notify both users that they've been matched
   * @param {Object} userA
   * @param {Object} userB
   * @param {Object} session
   */
  async notifyMatchFound(userA, userB, session) {
    const messageA = translator.t('found_partner', userA.language);
    const messageB = translator.t('found_partner', userB.language);

    // Create quick reply buttons
    const buttons = this.getChatButtons();

    await Promise.all([
      instagramService.sendMessage(userA.instagramId, messageA, buttons),
      instagramService.sendMessage(userB.instagramId, messageB, buttons)
    ]);
  }

  /**
   * Get persistent chat control buttons
   * @returns {Array} Array of button objects
   */
  getChatButtons() {
    return [
      /*{
        type: 'postback',
        title: translator.t('next', 'ar'),
        payload: 'ACTION_NEXT'
      },*/
      {
        type: 'postback',
        title: translator.t('stop', 'ar'),
        payload: 'ACTION_STOP'
      }/*,
      {
        type: 'postback',
        title: translator.t('report', 'ar'),
        payload: 'ACTION_REPORT'
      }*/
    ];
  }

  /**
   * End a chat session
   * @param {string} sessionId
   * @param {string} endedBy - Who ended the session
   * @param {boolean} requeueUserA - Whether to re-queue user A
   * @param {boolean} requeueUserB - Whether to re-queue user B
   */
  async endSession(sessionId, endedBy, requeueUserA = false, requeueUserB = false) {
    const session = await Session.findById(sessionId);
    if (!session) return;

    // End the session
    session.end(endedBy);
    await session.save();

    // Get both users
    const [userA, userB] = await Promise.all([
      User.findById(session.userA),
      User.findById(session.userB)
    ]);

    // Update user states
    if (userA) {
      userA.state = USER_STATES.IDLE;
      userA.currentSessionId = null;
      userA.partnerId = null;
      await userA.save();

      if (requeueUserA) {
        await queueService.addToQueue(userA._id);
      }
    }

    if (userB) {
      userB.state = USER_STATES.IDLE;
      userB.currentSessionId = null;
      userB.partnerId = null;
      await userB.save();

      if (requeueUserB) {
        await queueService.addToQueue(userB._id);
      }
    }
  }

  /**
   * Disconnect current chat and re-queue
   * @param {string} userId
   */
  async nextPerson(userId) {
    const user = await User.findById(userId);
    if (!user || !user.currentSessionId) return;

    const partnerId = user.partnerId;
    const sessionId = user.currentSessionId;

    // Get the session to find the other user
    const session = await Session.findById(sessionId);
    if (!session) return;

    // End session with "system" reason
    await this.endSession(sessionId, 'system', false, true);

    // Notify the user they're searching for next person
    const message = translator.t('searching', user.language);
    await instagramService.sendMessage(user.instagramId, message, null);

    // Add 3s delay after searching message
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Add user back to queue
    await queueService.addToQueue(userId);

    console.log(`🔄 User ${userId} searching for next person`);
  }

  /**
   * Stop chat and return to menu
   * @param {string} userId
   */
  async stopChat(userId) {
    const user = await User.findById(userId);
    if (!user || !user.currentSessionId) return;

    const sessionId = user.currentSessionId;
    const partnerId = user.partnerId;

    // Get session to determine which user is ending
    const session = await Session.findById(sessionId);
    if (!session) return;

    // Determine if user is A or B
    const isUserA = session.userA.toString() === userId.toString();
    const endReason = isUserA ? 'user_a' : 'user_b';

    // End session
    await this.endSession(sessionId, endReason, false, false);

    // Notify the user who stopped
    const message = translator.t('disconnected_a', user.language);
    await instagramService.sendMessage(user.instagramId, message, null);
    await this.sendMainMenu(user);

    // Notify the partner that session ended
    if (partnerId) {
      const partner = await User.findById(partnerId);
      if (partner) {
        const partnerMsg = translator.t('disconnected_b', partner.language) || translator.t('disconnected_b', partner.language);
        await instagramService.sendMessage(partner.instagramId, partnerMsg, null);
        await this.sendMainMenu(partner);
      }
    }

    console.log(`🛑 User ${userId} stopped chat`);
  }

  /**
   * Send main menu to user
   * @param {Object} user
   */
  async sendMainMenu(user) {
    const welcome = translator.t('welcome', user.language);
    const buttons = [
      {
        type: 'postback',
        title: translator.t('start_chat', user.language),
        payload: 'ACTION_START_CHAT'
      },
      {
        type: 'postback',
        title: translator.t('change_language', user.language),
        payload: 'ACTION_CHANGE_LANGUAGE'
      },
      {
        type: 'postback',
        title: translator.t('how_it_works_btn', user.language),
        payload: 'ACTION_HOW_IT_WORKS'
      }
    ];

    await instagramService.sendMessage(user.instagramId, welcome, buttons);
  }
}

module.exports = new MatcherService();
