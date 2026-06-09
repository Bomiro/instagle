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

class MessageHandler {

  async handleTextMessage(sender, text, messageId = null) {
    try {
      // Clean profanity from incoming text
      const { cleanText } = require('./badwordFilter');
      const cleaned = cleanText(text);
      let user = await User.findOne({ instagramId: sender.id });

      if (!user) {
        user = await this.createUser(sender);
      }

      if (user.state === USER_STATES.BANNED) {
        await user.clearBan();

        if (user.state === USER_STATES.BANNED) {
          const banMsg = translator.t('banned', user.language);
          await instagramService.sendMessage(sender.id, banMsg);
          return;
        }
      }

      switch (user.state) {
        case USER_STATES.IDLE:
          await this.handleIdleState(user, cleaned);
          break;

        case USER_STATES.QUEUED:
          await this.handleQueuedState(user, cleaned);
          break;

        case USER_STATES.CHATTING:
          await this.handleChattingState(user, cleaned, messageId);
          break;
      }
    } catch (error) {
      console.error('Error handling text message:', error);
    }
  }

  async handleMediaMessage(sender, mediaType, mediaUrl, caption = null) {
    try {
      const user = await User.findOne({ instagramId: sender.id });
      if (!user) return;

      if (user.state !== USER_STATES.CHATTING) return;

      const partner = await User.findById(user.partnerId);
      if (!partner) return;

      if (caption && linkFilter.containsLink(caption)) {
        const warning = translator.t('link_warning', user.language);
        await instagramService.sendMessage(sender.id, warning);
        return;
      }

      if (mediaType === 'image') {
        await instagramService.sendImage(partner.instagramId, mediaUrl, caption);
      }

      if (mediaType === 'audio') {
        await instagramService.sendAudio(partner.instagramId, mediaUrl, caption);
      }

      if (mediaType === 'video') {
        console.log("reel")
        await instagramService.sendVideo(partner.instagramId, mediaUrl, caption);
      }

      if (mediaType === 'ig_reel') {
        await instagramService.sendMessage(partner.instagramId, mediaUrl);
      }

    } catch (error) {
      console.error('Error handling media message:', error);
    }
  }

  async handlePostback(senderId, payload) {
    try {
      const user = await User.findOne({ instagramId: senderId });
      if (!user) return;

      if (user.state === USER_STATES.BANNED) {
        await user.clearBan();

        if (user.state === USER_STATES.BANNED) {
          const banMsg = translator.t('banned', user.language);
          await instagramService.sendMessage(senderId, banMsg);
          return;
        }
      }

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

  async handleIdleState(user, text) {
    const lower = text.toLowerCase().trim();

    const triggers = ['hi', 'hello', 'start', 'ابدأ', 'مرحبا', 'اهلا', 'أبدأ'];

    if (triggers.includes(lower)) {
      await this.showMainMenu(user);
    } else {
      await this.showMainMenu(user);
    }
  }

  async handleQueuedState(user, text) {
    const lower = text.toLowerCase().trim();

    if (['cancel', 'إلغاء', 'exit', 'خروج'].includes(lower)) {
      await this.cancelSearch(user);
      return;
    }

    const waitMsg = translator.t('searching_wait', user.language);

    const cancelBtn = [{
      type: 'postback',
      title: translator.t('cancel_search', user.language),
      payload: 'ACTION_CANCEL_SEARCH'
    }];

    await instagramService.sendMessage(user.instagramId, waitMsg, cancelBtn);
  }

  async handleChattingState(user, text, messageId) {
    const lower = text.toLowerCase().trim();

    const partner = await User.findById(user.partnerId);
    if (!partner) return;

    const stopCommands = ['stop', 'exit', 'leave', 'quit', 'خروج', 'اخرج', 'انهاء', 'إنهاء', 'ايقاف', 'إيقاف'];
    const nextCommands = ['next', 'skip', 'تالي', 'التالي', 'تغيير', 'تغيير شخص'];

    if (stopCommands.includes(lower)) {
      await matcherService.stopChat(user._id);
      return;
    }

    if (nextCommands.includes(lower)) {
      await matcherService.nextPerson(user._id);
      return;
    }

    if (linkFilter.containsLink(text)) {
      const warning = translator.t('link_warning', user.language);
      await instagramService.sendMessage(user.instagramId, warning);
      return;
    }

    const quickReplies = [
      {
        content_type: 'text',
        title: translator.t('stop', partner.language) || '❌ Exit',
        payload: 'ACTION_STOP'
      }
    ];

    await instagramService.sendMessage(partner.instagramId, text, quickReplies);
    //await instagramService.markAsSeen(user.instagramId);
  }

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

  async startChat(user) {
    const added = await queueService.addToQueue(user._id);

    if (added) {
      const msg = translator.t('searching', user.language);

      const cancelBtn = [{
        type: 'postback',
        title: translator.t('cancel_search', user.language),
        payload: 'ACTION_CANCEL_SEARCH'
      }];

      await instagramService.sendMessage(user.instagramId, msg, cancelBtn);

      // Add 3s delay after searching message
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Set 90s timeout for search
      const timeoutId = setTimeout(() => {
        this.cancelSearch(user);
      }, 90000);
      matcherService.setSearchTimeout(user._id, timeoutId);
    }
  }

  async cancelSearch(user) {
    await queueService.removeFromQueue(user._id);

    const msg = translator.t('search_cancelled', user.language);
    await instagramService.sendMessage(user.instagramId, msg);

    await this.showMainMenu(user);
  }

  async showLanguageSelector(user) {
    const msg = translator.t('select_language', user.language);

    const buttons = [
      { type: 'postback', title: translator.t('select_ar', user.language), payload: 'LANG_AR' },
      { type: 'postback', title: translator.t('select_en', user.language), payload: 'LANG_EN' },
      { type: 'postback', title: translator.t('quick_reply_start', user.language), payload: 'ACTION_START_CHAT' }
    ];

    await instagramService.sendMessage(user.instagramId, msg, buttons);
  }

  async changeLanguage(user, lang) {
    if (!translator.isSupportedLanguage(lang)) return;

    user.language = lang;
    await user.save();

    const msg = translator.t('language_changed', user.language);

    const startBtn = [{
      type: 'postback',
      title: translator.t('quick_reply_start', user.language),
      payload: 'ACTION_START_CHAT'
    }];

    await instagramService.sendMessage(user.instagramId, msg, startBtn);

    await this.showMainMenu(user);
  }

  async showHowItWorks(user) {
    const msg = translator.t('how_it_works', user.language);

    const startBtn = [{
      type: 'postback',
      title: translator.t('quick_reply_start', user.language),
      payload: 'ACTION_START_CHAT'
    }];

    await instagramService.sendMessage(user.instagramId, msg, startBtn);
  }

  async handleReport(reporter) {
    if (!reporter.partnerId) return;

    const reported = await User.findById(reporter.partnerId);
    if (!reported) return;

    const report = new Report({
      reporterId: reporter._id,
      reportedId: reported._id,
      sessionId: reporter.currentSessionId,
      reason: 'inappropriate_behavior'
    });

    await report.save();

    reported.addStrike(reporter._id);

    const strikes = reported.getRecentStrikes(config.STRIKES_WINDOW_HOURS);

    if (strikes.length >= config.STRIKES_THRESHOLD) {
      reported.state = USER_STATES.BANNED;

      const banUntil = new Date();
      banUntil.setHours(banUntil.getHours() + config.BAN_DURATION_HOURS);

      reported.banUntil = banUntil;

      const banMsg = translator.t('reported_user_banned', 'ar');
      await instagramService.sendMessage(reported.instagramId, banMsg);
    }

    await reported.save();

    const msg = translator.t('report_confirm', reporter.language);
    await instagramService.sendMessage(reporter.instagramId, msg);

    if (reporter.currentSessionId) {
      await matcherService.endSession(
        reporter.currentSessionId,
        END_REASONS.SYSTEM,
        false,
        false
      );
    }

    await instagramService.sendMessage(
      reporter.instagramId,
      translator.t('disconnected', reporter.language)
    );

    await this.showMainMenu(reporter);

    console.log(`🚨 Report: ${reporter._id} -> ${reported._id}`);
  }

  async createUser(sender) {
    const user = new User({
      instagramId: sender.id,
      username: sender.username || '',
      state: USER_STATES.IDLE,
      language: config.DEFAULT_LANGUAGE
    });

    await user.save();
    return user;
  }

  async logMessage() {
    // disabled (as requested)
    return;
  }

  async handleReferral(sender) {
    let user = await User.findOne({ instagramId: sender.id });

    if (!user) {
      user = await this.createUser(sender);
    }

    await this.showMainMenu(user);
  }
}

module.exports = new MessageHandler();
