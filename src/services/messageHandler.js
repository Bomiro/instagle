const User = require('../models/User');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Report = require('../models/Report');
const instagramService = require('./instagram');
const queueService = require('./queue');
const matcherService = require('./matcher');
const linkFilter = require('./linkFilter');
const translator = require('./translator');
const config = require('../config');
const { USER_STATES, MESSAGE_TYPES, END_REASONS } = require('../utils/constants');

/**
 * Message Handler Service
 * Processes all incoming DM events and routes them appropriately
 */
class MessageHandler {
  /**
   * Handle incoming text message
   * @param {Object} sender - Sender info { id, username }
   * @param {string} text - Message text
   * @param {string|null} messageId - Instagram message ID
   */
  async handleTextMessage(sender, text, messageId = null) {
    try {
      // Get or create user
      let user = await User.findOne({ instagramId: sender.id });
      
      if (!user) {
        user = await this.createUser(sender);
      }

      // Check if user is banned
      if (user.state === USER_STATES.BANNED) {
        await user.clearBan();
        if (user.state === USER_STATES.BANNED) {
          const banMsg = translator.t('banned', user.language);
          await instagramService.sendMessage(sender.id, banMsg);
          return;
        }
      }

      // Handle based on current state
      switch (user.state) {
        case USER_STATES.IDLE:
          await this.handleIdleState(user, text);
          break;
        case USER_STATES.QUEUED:
          await this.handleQueuedState(user, text);
          break;
        case USER_STATES.CHATTING:
          await this.handleChattingState(user, text, messageId);
          break;
      }
    } catch (error) {
      console.error('Error handling text message:', error);
    }
  }

  /**
   * Handle incoming media message (image/audio)
   * @param {Object} sender
   * @param {string} mediaType - 'image' or 'audio'
   * @param {string} mediaUrl - URL of the media
   * @param {string|null} caption - Optional caption
   */
  async handleMediaMessage(sender, mediaType, mediaUrl, caption = null) {
    try {
      const user = await User.findOne({ instagramId: sender.id });
      
      if (!user) return;

      if (user.state !== USER_STATES.CHATTING) return;

      // Get partner
      const partner = await User.findById(user.partnerId);
      if (!partner) return;

      // Check caption for links if provided
      if (caption && linkFilter.containsLink(caption)) {
        const warning = translator.t('link_warning', user.language);
        await instagramService.sendMessage(sender.id, warning);
        return;
      }

      // Log message
      const messageType = mediaType === 'image' ? MESSAGE_TYPES.IMAGE : MESSAGE_TYPES.AUDIO;
      await this.logMessage(user.currentSessionId, user._id, partner._id, messageType, caption, mediaUrl, false);

      // Forward to partner
      if (mediaType === 'image') {
        await instagramService.sendImage(partner.instagramId, mediaUrl, caption);
      } else {
        await instagramService.sendAudio(partner.instagramId, mediaUrl, caption);
      }
    } catch (error) {
      console.error('Error handling media message:', error);
    }
  }

  /**
   * Handle quick reply / postback action
   * @param {string} senderId
   * @param {string} payload - Button payload
   */
  async handlePostback(senderId, payload) {
    try {
      const user = await User.findOne({ instagramId: senderId });
      
      if (!user) return;

      // Check if banned
      if (user.state === USER_STATES.BANNED) {
        user.clearBan();
        if (user.state === USER_STATES.BANNED) {
          const banMsg = translator.t('banned', user.language);
          await instagramService.sendMessage(senderId, banMsg);
          return;
        }
      }

      // Route based on payload
      switch (payload) {
        case 'ACTION_START_CHAT':
          await this.startChat(user);
          break;
        case 'ACTION_CHANGE_LANGUAGE':
          await this.showLanguageSelector(user);
          break;
        case 'ACTION_HOW_IT_WORKS':
          await this.showHowItWorks(user);
          break;
        case 'ACTION_CANCEL_SEARCH':
          await this.cancelSearch(user);
          break;
        case 'ACTION_NEXT':
          await matcherService.nextPerson(user._id);
          break;
        case 'ACTION_STOP':
          await matcherService.stopChat(user._id);
          break;
        case 'ACTION_REPORT':
          await this.handleReport(user);
          break;
        case 'LANG_AR':
          await this.changeLanguage(user, 'ar');
          break;
        case 'LANG_EN':
          await this.changeLanguage(user, 'en');
          break;
        default:
          console.log(`Unknown payload: ${payload}`);
      }
    } catch (error) {
      console.error('Error handling postback:', error);
    }
  }

  /**
   * Handle IDLE state messages
   * @param {Object} user
   * @param {string} text
   */
  async handleIdleState(user, text) {
    const lowerText = text.toLowerCase().trim();

    // Check for trigger words
    if (['hi', 'hello', 'start', 'ابدأ', 'مرحبا', 'اهلا', 'أبدأ'].includes(lowerText)) {
      await this.showMainMenu(user);
    } else {
      await this.showMainMenu(user);
    }
  }

  /**
   * Handle QUEUED state messages
   * @param {Object} user
   * @param {string} text
   */
  async handleQueuedState(user, text) {
    const lowerText = text.toLowerCase().trim();
    
    if (['cancel', 'إلغاء', 'exit', 'خروج'].includes(lowerText)) {
      await this.cancelSearch(user);
    }
    // Otherwise ignore - user is waiting for match
  }

  /**
   * Handle CHATTING state messages
   * @param {Object} user
   * @param {string} text
   * @param {string} messageId
   */
  async handleChattingState(user, text, messageId) {
    // Get partner
    const partner = await User.findById(user.partnerId);
    if (!partner) return;

    // Check for links
    if (linkFilter.containsLink(text)) {
      const warning = translator.t('link_warning', user.language);
      await instagramService.sendMessage(user.instagramId, warning);
      
      // Log blocked message
      await this.logMessage(
        user.currentSessionId,
        user._id,
        partner._id,
        MESSAGE_TYPES.TEXT,
        text,
        null,
        true,
        'link'
      );
      return;
    }

    // Log and forward message
    await this.logMessage(
      user.currentSessionId,
      user._id,
      partner._id,
      MESSAGE_TYPES.TEXT,
      text,
      null,
      false
    );

    await instagramService.sendMessage(partner.instagramId, text);
    
    // Mark message as seen from sender's side
    await instagramService.markAsSeen(user.instagramId);
  }

  /**
   * Show main menu
   * @param {Object} user
   */
  async showMainMenu(user) {
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

  /**
   * Start chat - add user to queue
   * @param {Object} user
   */
  async startChat(user) {
    // Add to queue
    const added = await queueService.addToQueue(user._id);
    
    if (added) {
      const searchingMsg = translator.t('searching', user.language);
      const cancelBtn = [{
        type: 'postback',
        title: translator.t('cancel_search', user.language),
        payload: 'ACTION_CANCEL_SEARCH'
      }];
      
      await instagramService.sendMessage(user.instagramId, searchingMsg, cancelBtn);
    }
  }

  /**
   * Cancel search and leave queue
   * @param {Object} user
   */
  async cancelSearch(user) {
    await queueService.removeFromQueue(user._id);
    
    const cancelledMsg = translator.t('search_cancelled', user.language);
    await instagramService.sendMessage(user.instagramId, cancelledMsg, null);
    
    await this.showMainMenu(user);
  }

  /**
   * Show language selector
   * @param {Object} user
   */
  async showLanguageSelector(user) {
    const selectLang = translator.t('select_language', user.language);
    const buttons = [
      {
        type: 'postback',
        title: translator.t('select_ar', user.language),
        payload: 'LANG_AR'
      },
      {
        type: 'postback',
        title: translator.t('select_en', user.language),
        payload: 'LANG_EN'
      }
    ];

    await instagramService.sendMessage(user.instagramId, selectLang, buttons);
  }

  /**
   * Change user language
   * @param {Object} user
   * @param {string} lang
   */
  async changeLanguage(user, lang) {
    if (!translator.isSupportedLanguage(lang)) return;

    user.language = lang;
    await user.save();

    const successMsg = translator.t('language_changed', user.language);
    await instagramService.sendMessage(user.instagramId, successMsg, null);

    // Resend main menu in new language
    await this.showMainMenu(user);
  }

  /**
   * Show how it works
   * @param {Object} user
   */
  async showHowItWorks(user) {
    const howItWorks = translator.t('how_it_works', user.language);
    await instagramService.sendMessage(user.instagramId, howItWorks, null);
  }

  /**
   * Handle report action
   * @param {Object} reporter
   */
  async handleReport(reporter) {
    if (!reporter.partnerId) return;

    const reported = await User.findById(reporter.partnerId);
    if (!reported) return;

    // Create report
    const report = new Report({
      reporterId: reporter._id,
      reportedId: reported._id,
      sessionId: reporter.currentSessionId,
      reason: 'inappropriate_behavior'
    });
    await report.save();

    // Add strike to reported user
    reported.addStrike(reporter._id);

    // Check if user should be banned
    const recentStrikes = reported.getRecentStrikes(config.STRIKES_WINDOW_HOURS);
    
    if (recentStrikes.length >= config.STRIKES_THRESHOLD) {
      // Ban the user
      reported.state = USER_STATES.BANNED;
      reported.banUntil = new Date();
      reported.banUntil.setHours(reported.banUntil.getHours() + config.BAN_DURATION_HOURS);
      
      const banMsg = translator.t('reported_user_banned', 'ar');
      await instagramService.sendMessage(reported.instagramId, banMsg);
    }

    await reported.save();

    // Confirm report to reporter
    const confirmMsg = translator.t('report_confirm', reporter.language);
    await instagramService.sendMessage(reporter.instagramId, confirmMsg, null);

    // End session and disconnect both users
    if (reporter.currentSessionId) {
      await matcherService.endSession(reporter.currentSessionId, END_REASONS.SYSTEM, false, false);
    }

    // Send disconnected message to reporter
    const discMsg = translator.t('disconnected', reporter.language);
    await instagramService.sendMessage(reporter.instagramId, discMsg, null);

    await this.showMainMenu(reporter);

    console.log(`🚨 Report filed: ${reporter._id} reported ${reported._id}`);
  }

  /**
   * Create new user from Instagram data
   * @param {Object} sender
   * @returns {Promise<Object>}
   */
  async createUser(sender) {
    const user = new User({
      instagramId: sender.id,
      username: sender.username || '',
      state: USER_STATES.IDLE,
      language: config.DEFAULT_LANGUAGE
    });

    await user.save();
    console.log(`👤 New user created: ${sender.id}`);
    return user;
  }

  /**
   * Log message to database
   * @param {string} sessionId
   * @param {string} senderId
   * @param {string} recipientId
   * @param {string} type
   * @param {string} content
   * @param {string|null} mediaUrl
   * @param {boolean} blocked
   * @param {string|null} blockedReason
   */
  async logMessage(sessionId, senderId, recipientId, type, content, mediaUrl, blocked, blockedReason = null) {
    const message = new Message({
      sessionId,
      senderId,
      recipientId,
      type,
      content,
      mediaUrl,
      blocked,
      blockedReason
    });

    await message.save();
  }

  /**
   * Handle referral / message referral
   * @param {Object} sender
   */
  async handleReferral(sender) {
    let user = await User.findOne({ instagramId: sender.id });
    
    if (!user) {
      user = await this.createUser(sender);
    }

    await this.showMainMenu(user);
  }
}

module.exports = new MessageHandler();