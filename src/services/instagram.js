const axios = require('axios');
const config = require('../config');

/**
 * Instagram API Service
 * Handles all communication with Instagram Graph API / Meta Messenger Platform
 */
class InstagramService {
  constructor() {
    this.baseUrl = `https://graph.instagram.com/${config.INSTAGRAM_API_VERSION}`;
    this.accessToken = config.INSTAGRAM_PAGE_ACCESS_TOKEN;
    this.appId = config.INSTAGRAM_APP_ID;
    this.appSecret = config.INSTAGRAM_APP_SECRET;
  }

  /**
   * Get headers for API requests
   * @returns {Object}
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    };
  }

  /**
   * Send a text message to a user
   * @param {string} recipientId - Instagram user ID
   * @param {string} text - Message text
   * @param {Array|null} quickReplies - Quick reply buttons
   * @returns {Promise<Object>}
   */
  async sendMessage(recipientId, text, quickReplies = null) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: { text }
      };

      // Add quick replies if provided
      if (quickReplies && quickReplies.length > 0) {
        payload.message.quick_replies = quickReplies.map(btn => ({
          content_type: 'text',
          title: btn.title.substring(0, 20), // Max 20 chars
          payload: btn.payload
        }));
      }

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      console.log(`📤 Message sent to ${recipientId}`);
      return response.data;
    } catch (error) {
      return
      console.error('Failed to send message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an image message
   * @param {string} recipientId
   * @param {string} imageUrl - URL of the image
   * @param {string|null} text - Optional caption text
   * @returns {Promise<Object>}
   */
  async sendImage(recipientId, imageUrl, text = null) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true }
          }
        }
      };

      // Add caption if provided
      if (text) {
        payload.message.attachment.payload.caption = text;
      }

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      console.log(`🖼️ Image sent to ${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to send image:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an audio message (voice note)
   * @param {string} recipientId
   * @param {string} audioUrl - URL of the audio file
   * @param {string|null} text - Optional caption
   * @returns {Promise<Object>}
   */
  async sendAudio(recipientId, audioUrl, text = null) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'audio',
            payload: { url: audioUrl, is_reusable: true }
          }
        }
      };

      if (text) {
        payload.message.attachment.payload.caption = text;
      }

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      console.log(`🎤 Audio sent to ${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to send audio:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a video message
   * @param {string} recipientId
   * @param {string} videoUrl - URL of the video file
   * @param {string|null} text - Optional caption text
   * @returns {Promise<Object>}
   */
  async sendVideo(recipientId, videoUrl, text = null) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'video',
            payload: { url: videoUrl, is_reusable: true }
          }
        }
      };

      if (text) {
        payload.message.attachment.payload.caption = text;
      }

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      console.log(`🎬 Video sent to ${recipientId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to send video:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send typing indicator
   * @param {string} recipientId
   * @param {boolean} typingOn - True for typing on, false for off
   * @returns {Promise<Object>}
   */
  async sendTypingIndicator(recipientId, typingOn = true) {
    try {
      const payload = {
        recipient: { id: recipientId },
        sender_action: typingOn ? 'typing_on' : 'typing_off'
      };

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to send typing indicator:', error.message);
      return null;
    }
  }

  /**
   * Mark messages as seen
   * @param {string} recipientId
   * @returns {Promise<Object>}
   */
  async markAsSeen(recipientId) {
    try {
      const payload = {
        recipient: { id: recipientId },
        sender_action: 'mark_seen'
      };

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to mark as seen:', error.message);
      return null;
    }
  }

  /**
   * Get user profile info
   * @param {string} instagramId
   * @returns {Promise<Object>}
   */
  async getUserProfile(instagramId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${instagramId}`,
        {
          headers: this.getHeaders(),
          params: { fields: 'id,username,name,profile_pic' }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check if user follows the page (using Instagram Business API)
   * Note: This requires additional permissions and may not always be available
   * @param {string} instagramId
   * @returns {Promise<boolean>}
   */
  async checkFollowStatus(instagramId) {
    try {
      // This endpoint requires the user_profiles permission
      const response = await axios.get(
        `${this.baseUrl}/${config.INSTAGRAM_BUSINESS_ACCOUNT_ID}/followers`,
        {
          headers: this.getHeaders(),
          params: { user_id: instagramId }
        }
      );

      return response.data?.data?.some(u => u.id === instagramId) || false;
    } catch (error) {
      console.error('Failed to check follow status:', error.message);
      // Return true as fallback to allow access (for demo purposes)
      // In production, you would handle this more carefully
      return true;
    }
  }

  /**
   * Upload media file and get URL
   * @param {string} mediaUrl - URL of the media
   * @param {string} type - 'image' or 'audio'
   * @returns {Promise<string>} Media container ID
   */
  async uploadMedia(mediaUrl, type = 'image') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/media`,
        {
          is_url: true,
          message: { url: mediaUrl },
          type: type
        },
        { headers: this.getHeaders() }
      );

      return response.data.id;
    } catch (error) {
      console.error('Failed to upload media:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a message with retry logic
   * @param {string} recipientId
   * @param {string} text
   * @param {Array|null} quickReplies
   * @param {number} maxRetries
   * @returns {Promise<Object>}
   */
  async sendMessageWithRetry(recipientId, text, quickReplies = null, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.sendMessage(recipientId, text, quickReplies);
      } catch (error) {
        lastError = error;
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError;
  }

  /**
   * Send reactive message (like handling read receipts, typing, etc)
   * @param {string} recipientId
   * @param {string} action - 'mark_seen' | 'typing_on' | 'typing_off'
   * @returns {Promise<Object|null>}
   */
  async sendAction(recipientId, action) {
    try {
      const payload = {
        recipient: { id: recipientId },
        sender_action: action
      };

      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to send action ${action}:`, error.message);
      return null;
    }
  }
}

module.exports = new InstagramService();