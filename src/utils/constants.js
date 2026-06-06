// User States
const USER_STATES = {
  IDLE: 'IDLE',
  QUEUED: 'QUEUED',
  CHATTING: 'CHATTING',
  BANNED: 'BANNED'
};

// Session Status
const SESSION_STATUS = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED'
};

// Message Types
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video'
};

// End Session Reasons
const END_REASONS = {
  USER_A: 'user_a',
  USER_B: 'user_b',
  SYSTEM: 'system'
};

// Quick Reply Button Types
const BUTTON_TYPES = {
  START_CHAT: 'start_chat',
  CHANGE_LANGUAGE: 'change_language',
  HOW_IT_WORKS: 'how_it_works',
  CANCEL_SEARCH: 'cancel_search',
  NEXT: 'next',
  STOP: 'stop',
  REPORT: 'report',
  QUICK_START: 'quick_start'
};

module.exports = {
  USER_STATES,
  SESSION_STATUS,
  MESSAGE_TYPES,
  END_REASONS,
  BUTTON_TYPES
};