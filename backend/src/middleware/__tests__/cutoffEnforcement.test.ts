import { AuthRequest } from '../auth';

import { Request, Response, NextFunction } from 'express';
import { enforceCutoff } from '../cutoffEnforcement';
import prisma from '../../lib/prisma';

// Mock logger
jest.mock('../../config/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock prisma
jest.mock('../../lib/prisma', () => {
  const mockPrisma = {
    weeklyPlan: {
      findUnique: jest.fn()
    }
  };

  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma
  };
});

// Mock permissions
jest.mock('../../utils/permissions', () => ({
  isAfterCutoff: jest.fn(),
  canEditAfterCutoff: jest.fn()
}));

import { isAfterCutoff, canEditAfterCutoff } from '../../utils/permissions';

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('Cutoff Enforcement Middleware', () => {
  let mockReq: AuthRequest;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {
        planId: 'plan-123'
      },
      user: {
        id: 'user-123',
        email: 'test@example.com'
      },
      member: {
        id: 'member-123',
        name: 'Test User',
        role: 'PARENT',
        familyId: 'family-123'
      }
    } as unknown as AuthRequest;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('enforceCutoff without allowComments option', () => {
    const middleware = enforceCutoff();

    it('should allow access if no cutoff is set', async () => {
      const mockPlan = {
        id: 'plan-123',
        status: 'DRAFT',
        cutoffDate: null,
        cutoffTime: null,
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123'
          }]
        }
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access before cutoff', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockPlan = {
        id: 'plan-123',
        status: 'DRAFT',
        cutoffDate: tomorrow,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123'
          }]
        }
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block MEMBER after cutoff', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockPlan = {
        id: 'plan-123',
        status: 'DRAFT',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'MEMBER',
            userId: 'user-123'
          }]
        }
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(true);
      (canEditAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
