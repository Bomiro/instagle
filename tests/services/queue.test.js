const mongoose = require('mongoose');

// Mock mongoose for unit tests
jest.mock('mongoose', () => {
  const mockSchema = jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    methods: {}
  }));
  
  mockSchema.Types = {
    ObjectId: jest.fn()
  };

  return {
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      readyState: 1,
      on: jest.fn()
    },
    Schema: mockSchema,
    model: jest.fn().mockReturnValue({
      find: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn()
    })
  };
});

// We need to mock User model for queue tests
const mockUser = {
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn()
};

jest.mock('../../src/models/User', () => mockUser);

// Import after mocking
const queueService = require('../../src/services/queue');
const User = require('../../src/models/User');
const { USER_STATES } = require('../../src/utils/constants');

describe('Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add user to queue successfully', async () => {
      const mockUserDoc = {
        _id: 'user123',
        state: USER_STATES.IDLE,
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findById.mockResolvedValue(mockUserDoc);
      
      const result = await queueService.addToQueue('user123');
      
      expect(result).toBe(true);
      expect(mockUserDoc.state).toBe(USER_STATES.QUEUED);
      expect(mockUserDoc.save).toHaveBeenCalled();
    });

    it('should return false if user not found', async () => {
      User.findById.mockResolvedValue(null);
      
      const result = await queueService.addToQueue('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should return false if user is already queued', async () => {
      const mockUserDoc = {
        _id: 'user123',
        state: USER_STATES.QUEUED
      };
      
      User.findById.mockResolvedValue(mockUserDoc);
      
      const result = await queueService.addToQueue('user123');
      
      expect(result).toBe(false);
    });

    it('should return false if user is already chatting', async () => {
      const mockUserDoc = {
        _id: 'user123',
        state: USER_STATES.CHATTING
      };
      
      User.findById.mockResolvedValue(mockUserDoc);
      
      const result = await queueService.addToQueue('user123');
      
      expect(result).toBe(false);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove user from queue successfully', async () => {
      const mockUserDoc = {
        _id: 'user123',
        state: USER_STATES.QUEUED,
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findById.mockResolvedValue(mockUserDoc);
      
      const result = await queueService.removeFromQueue('user123');
      
      expect(result).toBe(true);
      expect(mockUserDoc.state).toBe(USER_STATES.IDLE);
    });

    it('should return false if user is not in queue', async () => {
      const mockUserDoc = {
        _id: 'user123',
        state: USER_STATES.IDLE
      };
      
      User.findById.mockResolvedValue(mockUserDoc);
      
      const result = await queueService.removeFromQueue('user123');
      
      expect(result).toBe(false);
    });
  });

  describe('getQueueLength', () => {
    it('should return count of queued users', async () => {
      User.countDocuments.mockResolvedValue(5);
      
      const length = await queueService.getQueueLength();
      
      expect(length).toBe(5);
      expect(User.countDocuments).toHaveBeenCalledWith({ state: USER_STATES.QUEUED });
    });
  });

  describe('getQueuedUsers', () => {
    it('should return queued users sorted by join time', async () => {
      const mockUsers = [
        { _id: 'user1', username: 'User1' },
        { _id: 'user2', username: 'User2' }
      ];
      
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers)
      };
      
      User.find.mockReturnValue(mockQuery);
      
      const users = await queueService.getQueuedUsers(10);
      
      expect(users).toHaveLength(2);
      expect(mockQuery.sort).toHaveBeenCalledWith({ updatedAt: 1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('isInQueue', () => {
    it('should return true if user is in queue', async () => {
      const mockUser = { state: USER_STATES.QUEUED };
      User.findById.mockResolvedValue(mockUser);
      
      const result = await queueService.isInQueue('user123');
      
      expect(result).toBe(true);
    });

    it('should return false if user is not in queue', async () => {
      const mockUser = { state: USER_STATES.IDLE };
      User.findById.mockResolvedValue(mockUser);
      
      const result = await queueService.isInQueue('user123');
      
      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      User.findById.mockResolvedValue(null);
      
      const result = await queueService.isInQueue('nonexistent');
      
      expect(result).toBeFalsy();
    });
  });

  describe('popFromQueue', () => {
    it('should pop first N users from queue', async () => {
      const mockUsers = [
        { _id: 'user1' },
        { _id: 'user2' }
      ];
      
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers)
      };
      
      User.find.mockReturnValue(mockQuery);
      
      const userIds = await queueService.popFromQueue(2);
      
      expect(userIds).toEqual(['user1', 'user2']);
    });

    it('should return empty array if not enough users', async () => {
      const mockUsers = [{ _id: 'user1' }];
      
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers)
      };
      
      User.find.mockReturnValue(mockQuery);
      
      const userIds = await queueService.popFromQueue(2);
      
      expect(userIds).toEqual([]);
    });
  });

  describe('clearQueue', () => {
    it('should clear all users from queue', async () => {
      User.updateMany.mockResolvedValue({ modifiedCount: 5 });
      
      const count = await queueService.clearQueue();
      
      expect(count).toBe(5);
      expect(User.updateMany).toHaveBeenCalledWith(
        { state: USER_STATES.QUEUED },
        { $set: { state: USER_STATES.IDLE, queuedAt: null } }
      );
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      User.countDocuments
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(10)   // queued
        .mockResolvedValueOnce(5)   // chatting
        .mockResolvedValueOnce(2);  // banned
      
      const stats = await queueService.getStats();
      
      expect(stats.totalUsers).toBe(100);
      expect(stats.queued).toBe(10);
      expect(stats.chatting).toBe(5);
      expect(stats.banned).toBe(2);
      expect(stats.timestamp).toBeDefined();
    });
  });
});