import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { enforceCutoff } from '../cutoffEnforcement.js';
import { prisma } from '../../lib/prisma.js';

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    weeklyPlan: {
      findUnique: vi.fn()
    }
  }
}));

// Mock permissions
vi.mock('../../utils/permissions.js', () => ({
  isAfterCutoff: vi.fn(),
  canEditAfterCutoff: vi.fn()
}));

import { isAfterCutoff, canEditAfterCutoff } from '../../utils/permissions.js';

describe('Cutoff Enforcement Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: {
        planId: 'plan-123'
      },
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        language: 'fr'
      },
      member: {
        id: 'member-123',
        name: 'Test User',
        role: 'PARENT',
        familyId: 'family-123'
      }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('enforceCutoff without allowComments option', () => {
    const middleware = enforceCutoff();

    it('should allow access if no cutoff is set', async () => {
      const mockPlan = {
        id: 'plan-123',
        status: 'DRAFT',
        cutoffDate: null,
        cutoffTime: null,
        allowCommentsAfterCutoff: false
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

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
        allowCommentsAfterCutoff: false
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

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
        allowCommentsAfterCutoff: false
      };

      mockReq.member = {
        id: 'member-123',
        name: 'Test User',
        role: 'MEMBER',
        familyId: 'family-123'
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (isAfterCutoff as any).mockReturnValue(true);
      (canEditAfterCutoff as any).mockReturnValue(false);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
