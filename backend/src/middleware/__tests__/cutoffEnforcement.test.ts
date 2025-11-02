import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceCutoff, enforceModifiableStatus } from '../cutoffEnforcement.js';
import { AppError } from '../errorHandler.js';
import prisma from '../../lib/prisma.js';

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  default: {
    weeklyPlan: {
      findUnique: vi.fn()
    }
  }
}));

describe('Cutoff Enforcement Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      params: { planId: 'plan-123' },
      user: { id: 'user-123' }
    };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('enforceCutoff', () => {
    it('should allow modification before cutoff', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: tomorrow,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: true,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'MEMBER'
          }]
        }
      });

      const middleware = enforceCutoff();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should block MEMBER after cutoff', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'MEMBER'
          }]
        }
      });

      const middleware = enforceCutoff();

      await expect(middleware(req, res, next)).rejects.toThrow(AppError);
      await expect(middleware(req, res, next)).rejects.toThrow('cutoff deadline');
    });

    it('should allow ADMIN after cutoff', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'ADMIN'
          }]
        }
      });

      const middleware = enforceCutoff();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow PARENT after cutoff', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'PARENT'
          }]
        }
      });

      const middleware = enforceCutoff();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow comments after cutoff if allowCommentsAfterCutoff is true', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: true,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'MEMBER'
          }]
        }
      });

      const middleware = enforceCutoff({ allowComments: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should block comments after cutoff if allowCommentsAfterCutoff is false', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: yesterday,
        cutoffTime: '18:00',
        allowCommentsAfterCutoff: false,
        family: {
          members: [{
            id: 'member-123',
            userId: 'user-123',
            role: 'MEMBER'
          }]
        }
      });

      const middleware = enforceCutoff({ allowComments: true });

      await expect(middleware(req, res, next)).rejects.toThrow(AppError);
    });

    it('should throw error if plan not found', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(null);

      const middleware = enforceCutoff();

      await expect(middleware(req, res, next)).rejects.toThrow('Weekly plan not found');
    });

    it('should throw error if user is not a member', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        id: 'plan-123',
        cutoffDate: null,
        cutoffTime: null,
        allowCommentsAfterCutoff: true,
        family: {
          members: [] // User not in family
        }
      });

      const middleware = enforceCutoff();

      await expect(middleware(req, res, next)).rejects.toThrow('not a member of this family');
    });
  });

  describe('enforceModifiableStatus', () => {
    it('should allow modifications to DRAFT plan', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        status: 'DRAFT'
      });

      await enforceModifiableStatus(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow modifications to IN_VALIDATION plan', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        status: 'IN_VALIDATION'
      });

      await enforceModifiableStatus(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow modifications to VALIDATED plan', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        status: 'VALIDATED'
      });

      await enforceModifiableStatus(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should block modifications to LOCKED plan', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
        status: 'LOCKED'
      });

      await expect(enforceModifiableStatus(req, res, next)).rejects.toThrow('locked and cannot be modified');
    });

    it('should throw error if plan not found', async () => {
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(null);

      await expect(enforceModifiableStatus(req, res, next)).rejects.toThrow('Weekly plan not found');
    });
  });
});
