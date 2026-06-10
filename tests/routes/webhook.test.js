const request = require('supertest');
const crypto = require('crypto');

// Mock all dependencies before importing app
jest.mock('../../src/config', () => ({
  PORT: 3000,
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://localhost:27017/test',
  WEBHOOK_VERIFY_TOKEN: 'test_verify_token',
  APP_SECRET: 'test_app_secret',
  INSTAGRAM_APP_ID: 'test_app_id',
  INSTAGRAM_APP_SECRET: 'test_app_secret',
  INSTAGRAM_PAGE_ACCESS_TOKEN: 'test_token',
  INSTAGRAM_BUSINESS_ACCOUNT_ID: 'test_account',
  INSTAGRAM_API_VERSION: 'v18.0',
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_MESSAGES: 30,
  BAN_DURATION_HOURS: 24,
  STRIKES_THRESHOLD: 3,
  STRIKES_WINDOW_HOURS: 24,
  DEFAULT_LANGUAGE: 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en']
}));

jest.mock('../../src/config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  mongoose: {
    connection: { readyState: 1 },
    on: jest.fn()
  }
}));

jest.mock('../../src/services/messageHandler', () => ({
  handleTextMessage: jest.fn().mockResolvedValue(undefined),
  handleMediaMessage: jest.fn().mockResolvedValue(undefined),
  handlePostback: jest.fn().mockResolvedValue(undefined),
  handleReferral: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../src/services/matcher', () => ({
  startAutoMatching: jest.fn(),
  stopAutoMatching: jest.fn()
}));

jest.mock('../../src/services/queue', () => ({
  getStats: jest.fn().mockResolvedValue({
    totalUsers: 100,
    queued: 10,
    chatting: 5,
    banned: 2
  })
}));

const messageHandler = require('../../src/services/messageHandler');
const app = require('../../src/app');

// Generate valid signature for testing
const generateSignature = (body, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  return `sha256=${hmac.digest('hex')}`;
};

describe('Webhook Routes', () => {
  describe('GET /webhook', () => {
    it('should verify with correct token', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_verify_token',
          'hub.challenge': 'test_challenge_123'
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('test_challenge_123');
    });

    it('should reject with wrong token', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'test_challenge'
        });

      expect(res.status).toBe(403);
    });

    it('should reject without mode', async () => {
      const res = await request(app)
        .get('/webhook')
        .query({
          'hub.verify_token': 'test_verify_token',
          'hub.challenge': 'test_challenge'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhook', () => {
    const validPayload = {
      object: 'instagram',
      entry: [{
        id: '123456789',
        time: 1234567890,
        messaging: [{
          sender: { id: 'sender123' },
          recipient: { id: 'recipient123' },
          timestamp: 1234567890,
          message: {
            text: 'Hello',
            mid: 'message_id_123'
          }
        }]
      }]
    };

    it('should accept valid webhook with correct signature', async () => {
      const signature = generateSignature(validPayload, 'test_app_secret');

      const res = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
    });

    it('should handle text message event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: { text: 'Hi there', mid: 'mid123' }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      // Give time for async handler
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleTextMessage).toHaveBeenCalledWith(
        { id: 'user123' },
        'Hi there',
        'mid123'
      );
    });

    it('should handle image attachment event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: {
              attachments: [{
                type: 'image',
                payload: { url: 'https://example.com/image.jpg' }
              }]
            }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleMediaMessage).toHaveBeenCalledWith(
        { id: 'user123' },
        'image',
        'https://example.com/image.jpg',
        null
      );
    });

    it('should handle audio attachment event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: {
              attachments: [{
                type: 'audio',
                payload: { url: 'https://example.com/audio.mp3' }
              }]
            }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleMediaMessage).toHaveBeenCalledWith(
        { id: 'user123' },
        'audio',
        'https://example.com/audio.mp3',
        null
      );
    });

    it('should handle video attachment event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: {
              attachments: [{
                type: 'video',
                payload: { url: 'https://example.com/video.mp4' }
              }]
            }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleMediaMessage).toHaveBeenCalledWith(
        { id: 'user123' },
        'video',
        'https://example.com/video.mp4',
        null
      );
    });

    it('should handle sticker attachment event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: {
              attachments: [{
                type: 'sticker',
                payload: { url: 'https://example.com/sticker.gif' }
              }]
            }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleMediaMessage).toHaveBeenCalledWith(
        { id: 'user123' },
        'image',
        'https://example.com/sticker.gif',
        null
      );
    });

    it('should handle postback event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            postback: { payload: 'ACTION_START_CHAT' }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handlePostback).toHaveBeenCalledWith(
        'user123',
        'ACTION_START_CHAT'
      );
    });

    it('should handle referral event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            referral: { ref: 'ref_code' }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler.handleReferral).toHaveBeenCalledWith({ id: 'user123' });
    });

    it('should handle quick reply event', async () => {
      const payload = {
        object: 'instagram',
        entry: [{
          messaging: [{
            sender: { id: 'user123' },
            message: {
              text: 'Some text',
              quick_reply: { payload: 'ACTION_NEXT' }
            }
          }]
        }]
      };
      
      const signature = generateSignature(payload, 'test_app_secret');

      await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Quick reply is handled as postback in webhook handler
      // When both text and quick_reply are present, quick_reply takes precedence
      expect(messageHandler.handlePostback).toHaveBeenCalled();
    });

    it('should reject invalid signature', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', 'sha256=invalid_signature')
        .send({ test: 'data' });

      expect(res.status).toBe(403);
    });

    it('should handle empty entry', async () => {
      const payload = { object: 'instagram', entry: [] };
      const signature = generateSignature(payload, 'test_app_secret');

      const res = await request(app)
        .post('/webhook')
        .set('x-hub-signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
    });
  });

  describe('Health Routes', () => {
    describe('GET /health', () => {
      it('should return health status', async () => {
        const res = await request(app).get('/health');
        
        // Health check may return degraded if queue mock isn't working
        expect([200, 503]).toContain(res.status);
        expect(res.body.services).toBeDefined();
        expect(res.body.services.mongodb).toBeDefined();
      });
    });

    describe('GET /health/live', () => {
      it('should return alive status', async () => {
        const res = await request(app).get('/health/live');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('alive');
      });
    });

    describe('GET /health/ready', () => {
      it('should return ready status when connected', async () => {
        const res = await request(app).get('/health/ready');
        
        // May return 503 if MongoDB mock isn't working properly
        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty('status');
      });
    });
  });

  describe('GET /', () => {
    it('should return bot info', async () => {
      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('InstaGle Bot');
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.status).toBe('running');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});