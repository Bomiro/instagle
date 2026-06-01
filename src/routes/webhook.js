const express = require('express');
const router = express.Router();
const messageHandler = require('../services/messageHandler');
const { verifyWebhook, verifyChallenge } = require('../middleware/verifyWebhook');
const { messageLimiter } = require('../middleware/rateLimiter');
const { MESSAGE_TYPES } = require('../utils/constants');

/**
 * GET /webhook
 * Meta webhook verification endpoint
 * Called during app setup to verify webhook URL
 */
router.get('/', verifyChallenge);

/**
 * POST /webhook
 * Main webhook endpoint for Instagram/Meta events
 * Receives incoming messages and other events
 */
router.post('/', verifyWebhook, messageLimiter, async (req, res) => {
  try {
    // Always respond quickly to acknowledge receipt
    res.status(200).send('OK');

    // Process events
    const { entry } = req.body;

    if (!entry || !entry.length) {
      return;
    }

    for (const entryItem of entry) {
      // Handle messaging events
      if (entryItem.messaging) {
        for (const messagingItem of entryItem.messaging) {
          await processMessagingEvent(messagingItem);
        }
      }

      // Handle IG events (Instagram-specific)
      if (entryItem.standby) {
        for (const standbyItem of entryItem.standby) {
          await processMessagingEvent(standbyItem);
        }
      }
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

/**
 * Process individual messaging event
 * @param {Object} event
 */
async function processMessagingEvent(event) {
  const { sender, recipient, timestamp, message, postback, referral } = event;

  // Skip if no sender
  if (!sender || !sender.id) return;

  // Handle postback (button clicks)
  if (postback && postback.payload) {
    console.log(`📩 Postback from ${sender.id}`);
    await messageHandler.handlePostback(sender.id, postback.payload);
    return;
  }

  // Handle referral
  if (referral) {
    console.log(`📩 Referral from ${sender.id}: ${referral.ref}`);
    await messageHandler.handleReferral(sender);
    return;
  }

  // Handle regular message
  if (message) {
    // Handle text message
    if (message.text && !message.quick_reply) {
      console.log(`💬 Text message from ${sender.id}`);
      await messageHandler.handleTextMessage(
        sender,
        message.text,
        message.mid
      );
      return;
    }

    // Handle attachments (images, audio)
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.type === 'image') {
          console.log(`🖼️ Image from ${sender.id}`);
          await messageHandler.handleMediaMessage(
            sender,
            MESSAGE_TYPES.IMAGE,
            attachment.payload?.url,
            message.text || null
          );
        } else if (attachment.type === 'audio') {
          console.log(`🎤 Audio from ${sender.id}`);
          await messageHandler.handleMediaMessage(
            sender,
            MESSAGE_TYPES.AUDIO,
            attachment.payload?.url,
            null
          );
        }
      }
      return;
    }

    // Handle quick reply payload
    if (message.quick_reply && message.quick_reply.payload) {
      console.log(`⚡ Quick reply from ${sender.id}: ${message.quick_reply.payload}`);
      await messageHandler.handlePostback(sender.id, message.quick_reply.payload);
      return;
    }

    // Handle reactions (for bot management)
    if (message.reaction) {
      console.log(`👍 Reaction from ${sender.id}`);
      // Could handle reactions for acknowledgment
      return;
    }

    // Handle read receipt
    if (message.read) {
      console.log(`✅ Read receipt from ${sender.id}`);
      return;
    }
  }
}

module.exports = router;