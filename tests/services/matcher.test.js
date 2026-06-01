// Mock dependencies before importing
jest.mock('../../src/models/User');
jest.mock('../../src/models/Session');
jest.mock('../../src/services/queue');
jest.mock('../../src/services/instagram');
jest.mock('../../src/services/translator');
jest.mock('../../src/config', () => ({
  DEFAULT_LANGUAGE: 'ar',
  SUPPORTED_LANGUAGES: ['ar', 'en'],
  BAN_DURATION_HOURS: 48,
  STRIKES_THRESHOLD: 3,
  STRIKES_WINDOW_HOURS: 24
}));

const User = require('../../src/models/User');
const Session = require('../../src/models/Session');
const queueService = require('../../src/services/queue');
const instagramService = require('../../src/services/instagram');
const translator = require('../../src/services/translator');
const matcherService = require('../../src/services/matcher');
const { USER_STATES, SESSION_STATUS } = require('../../src/utils/constants');

describe('Matcher Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock translator
    translator.t.mockImplementation((key, lang) => {
      const strings = {
        found_partner: { ar: '🎉 تم العثور على شخص!', en: '🎉 Match found!' },
        searching: { ar: 'جاري البحث...', en: 'Searching...' },
        disconnected: { ar: '🔌 تم قطع الاتصال', en: '🔌 Disconnected' },
        next: { ar: '⏩ التالي', en: '⏩ Next' },
        stop: { ar: '🛑 إيقاف', en: '🛑 Stop' },
        report: { ar: '🚨 تبليغ', en: '🚨 Report' },
        start_chat: { ar: '🎲 ابدأ', en: '🎲 Start' },
        change_language: { ar: '🌐 تغيير', en: '🌐 Change' },
        how_it_works: { ar: 'ℹ️ كيف', en: 'ℹ️ How' }
      };
      return strings[key]?.[lang] || key;
    });
  });

  afterEach(() => {
    matcherService.stopAutoMatching();
  });

  describe('createSession', () => {
    it('should create session between two users', async () => {
      const userA = {
        _id: 'userA123',
        instagramId: 'ig_user_a',
        state: USER_STATES.QUEUED,
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };
      
      const userB = {
        _id: 'userB123',
        instagramId: 'ig_user_b',
        state: USER_STATES.QUEUED,
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockSessionInstance = {
        _id: 'session123',
        userA: 'userA123',
        userB: 'userB123',
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock Session as a constructor function
      Session.mockImplementation(() => mockSessionInstance);
      
      User.findById
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);
      
      instagramService.sendMessage.mockResolvedValue({});

      const session = await matcherService.createSession('userA123', 'userB123');

      expect(session).toBeDefined();
      expect(mockSessionInstance.save).toHaveBeenCalled();
      expect(userA.state).toBe(USER_STATES.CHATTING);
      expect(userB.state).toBe(USER_STATES.CHATTING);
    });

    it('should return null if user not found', async () => {
      User.findById.mockResolvedValueOnce(null);

      const session = await matcherService.createSession('nonexistent', 'userB');

      expect(session).toBeNull();
    });

    it('should return null if users not in QUEUED state', async () => {
      const userA = { state: USER_STATES.IDLE };
      const userB = { state: USER_STATES.IDLE };

      User.findById
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);

      const session = await matcherService.createSession('userA', 'userB');

      expect(session).toBeNull();
    });
  });

  describe('matchUsers', () => {
    it('should return 0 if not enough users in queue', async () => {
      queueService.popFromQueue.mockResolvedValue(['user1']);

      const pairs = await matcherService.matchUsers();

      expect(pairs).toBe(0);
    });

    it('should create session when 2+ users available', async () => {
      queueService.popFromQueue.mockResolvedValue(['userA', 'userB']);

      const mockSession = {
        _id: 'session123',
        save: jest.fn().mockResolvedValue(true)
      };

      const userA = {
        _id: 'userA',
        instagramId: 'ig_a',
        state: USER_STATES.QUEUED,
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };
      
      const userB = {
        _id: 'userB',
        instagramId: 'ig_b',
        state: USER_STATES.QUEUED,
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);
      
      Session.mockImplementation(() => mockSession);
      instagramService.sendMessage.mockResolvedValue({});

      const pairs = await matcherService.matchUsers();

      expect(pairs).toBe(1);
    });
  });

  describe('endSession', () => {
    it('should end session and reset user states', async () => {
      const mockSession = {
        _id: 'session123',
        userA: 'userA',
        userB: 'userB',
        end: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      Session.findById.mockResolvedValue(mockSession);

      const userA = {
        _id: 'userA',
        state: USER_STATES.CHATTING,
        currentSessionId: 'session123',
        partnerId: 'userB',
        save: jest.fn().mockResolvedValue(true)
      };
      
      const userB = {
        _id: 'userB',
        state: USER_STATES.CHATTING,
        currentSessionId: 'session123',
        partnerId: 'userA',
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);

      await matcherService.endSession('session123', 'user_a', false, false);

      expect(mockSession.end).toHaveBeenCalledWith('user_a');
      expect(userA.state).toBe(USER_STATES.IDLE);
      expect(userB.state).toBe(USER_STATES.IDLE);
    });

    it('should re-queue users if specified', async () => {
      const mockSession = {
        _id: 'session123',
        userA: 'userA',
        userB: 'userB',
        end: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      Session.findById.mockResolvedValue(mockSession);

      const userA = {
        _id: 'userA',
        state: USER_STATES.CHATTING,
        save: jest.fn().mockResolvedValue(true)
      };
      
      const userB = {
        _id: 'userB',
        state: USER_STATES.CHATTING,
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById
        .mockResolvedValueOnce(userA)
        .mockResolvedValueOnce(userB);

      queueService.addToQueue.mockResolvedValue(true);

      await matcherService.endSession('session123', 'system', true, true);

      expect(queueService.addToQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('nextPerson', () => {
    it('should end session and requeue user for next match', async () => {
      const user = {
        _id: 'userA',
        instagramId: 'ig_a',
        state: USER_STATES.CHATTING,
        currentSessionId: 'session123',
        partnerId: 'userB',
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockSession = {
        _id: 'session123',
        userA: 'userA',
        userB: 'userB',
        end: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(user);
      Session.findById.mockResolvedValue(mockSession);

      const userB = {
        _id: 'userB',
        instagramId: 'ig_b',
        state: USER_STATES.CHATTING,
        save: jest.fn().mockResolvedValue(true)
      };

      // Override for endSession
      User.findById
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(userB);

      queueService.addToQueue.mockResolvedValue(true);
      instagramService.sendMessage.mockResolvedValue({});

      await matcherService.nextPerson('userA');

      expect(queueService.addToQueue).toHaveBeenCalledWith('userA');
    });
  });

  describe('stopChat', () => {
    it('should end session and return to main menu', async () => {
      const user = {
        _id: 'userA',
        instagramId: 'ig_a',
        state: USER_STATES.CHATTING,
        currentSessionId: 'session123',
        language: 'ar',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockSession = {
        _id: 'session123',
        userA: 'userA',
        userB: 'userB',
        end: jest.fn(),
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(user);
      Session.findById.mockResolvedValue(mockSession);

      const userB = {
        _id: 'userB',
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(userB);

      instagramService.sendMessage.mockResolvedValue({});

      await matcherService.stopChat('userA');

      expect(instagramService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Auto-matching', () => {
    it('should start auto matching', () => {
      jest.useFakeTimers();
      
      queueService.popFromQueue.mockResolvedValue(['user1', 'user2']);
      
      matcherService.startAutoMatching(5000);
      
      expect(matcherService.matchingInterval).toBeDefined();
      
      matcherService.stopAutoMatching();
      jest.useRealTimers();
    });

    it('should stop auto matching', () => {
      matcherService.startAutoMatching(1000);
      
      expect(matcherService.matchingInterval).toBeDefined();
      
      matcherService.stopAutoMatching();
      
      expect(matcherService.matchingInterval).toBeNull();
    });
  });
});