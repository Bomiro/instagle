/**
 * Link Filter Service
 * Strictly blocks URLs, domains, and @usernames in messages
 */

// Patterns that indicate a link or contact info
const LINK_PATTERNS = [
  // HTTP/HTTPS URLs
  /https?:\/\/[^\s<>"\]]+/gi,
  // WWW URLs
  /www\.[^\s<>"\]]+/gi,
  // Common domain endings
  /\b[\w.-]+\.(com|net|org|io|co|gov|edu|biz|info|me|app|dev|xyz|online|site|store|tech|pro)\b/gi,
  // @usernames (Instagram, Twitter, etc.)
  /@[a-zA-Z0-9_]{1,30}/g,
  // Telegram
  /t\.me\/[^\s]+/gi,
  /tg:\/\/[^\s]+/gi,
  // WhatsApp
  /wa\.me\/[^\s]+/gi,
  /whatsapp:\/\/[^\s]+/gi,
  // Discord
  /discord\.gg\/[^\s]+/gi,
  // Snapchat
  /snapchat\.com\/[^\s]+/gi,
  // TikTok
  /tiktok\.com\/[^\s]+/gi,
  // Email patterns
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (international format)
  /\+?\d{7,15}/g,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/g
];

/**
 * Check if a message contains any link patterns
 * @param {string} message - The message to check
 * @returns {boolean} True if link is detected
 */
const containsLink = (message) => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // Normalize message - remove line breaks for consistent matching
  const normalizedMessage = message.replace(/\s+/g, ' ').trim();

  for (const pattern of LINK_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    if (pattern.test(normalizedMessage)) {
      return true;
    }
  }

  return false;
};

/**
 * Find all link matches in a message
 * @param {string} message
 * @returns {Array<string>} Array of matched links
 */
const findLinks = (message) => {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const matches = [];
  const normalizedMessage = message.replace(/\s+/g, ' ').trim();

  for (const pattern of LINK_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(normalizedMessage)) !== null) {
      matches.push(match[0]);
    }
  }

  return [...new Set(matches)]; // Remove duplicates
};

/**
 * Sanitize message by removing links
 * @param {string} message
 * @returns {string} Sanitized message
 */
const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let sanitized = message;

  for (const pattern of LINK_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[محذوف]');
  }

  return sanitized;
};

/**
 * Get filter reason
 * @param {string} message
 * @returns {string|null} Reason for blocking or null
 */
const getFilterReason = (message) => {
  const links = findLinks(message);
  if (links.length > 0) {
    if (links.some(link => link.startsWith('@'))) {
      return 'username';
    }
    if (links.some(link => link.includes('http') || link.includes('www'))) {
      return 'url';
    }
    if (links.some(link => link.includes('@'))) {
      return 'email';
    }
    return 'link';
  }
  return null;
};

module.exports = {
  LINK_PATTERNS,
  containsLink,
  findLinks,
  sanitizeMessage,
  getFilterReason
};