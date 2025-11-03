
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { getPlanAuditLog, getMealAuditLog } from '../auditLog.controller.js';
import { prisma } from '../../lib/prisma.js';

// Mock prisma
jest.mock('../../lib/prisma.js', () => ({
  prisma: {
    planChangeLog: {
      findMany: jest.fn()
    },
    familyMember: {
      findUnique: jest.fn()
    }
  }
}));

describe('AuditLog Controller', () => {
  let mockReq: AuthRequest;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      params: {
        planId: 'plan-123'
      },
      query: {},
      user: {
        id: 'user-123',
        email: 'test@example.com'
      },
      member: {
        id: 'member-123',
        name: 'Test User',
        role: 'PARENT',
        familyId: 'family-123',
        canViewAuditLog: true
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

  describe('getPlanAuditLog', () => {
    it('should return audit logs for a plan', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          planId: 'plan-123',
          mealId: null,
          changeType: 'PLAN_VALIDATED',
          memberId: 'member-123',
          description: 'Plan validé',
          descriptionEn: 'Plan validated',
          descriptionNl: 'Plan gevalideerd',
          oldValue: null,
          newValue: null,
          createdAt: new Date(),
          member: {
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT'
          }
        }
      ];

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue(mockLogs);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: { planId: 'plan-123' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          logs: mockLogs,
          total: mockLogs.length
        }
      });
    });

    it('should filter by memberId when provided', async () => {
      mockReq.query = { memberId: 'member-456' };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          planId: 'plan-123',
          memberId: 'member-456'
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 50,
        skip: 0
      });
    });

    it('should filter by changeType when provided', async () => {
      mockReq.query = { changeType: 'MEAL_ADDED' };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          planId: 'plan-123',
          changeType: 'MEAL_ADDED'
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 50,
        skip: 0
      });
    });

    it('should respect limit and offset parameters', async () => {
      mockReq.query = { limit: '20', offset: '10' };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 20,
        skip: 10
      });
    });

    it('should enforce max limit of 100', async () => {
      mockReq.query = { limit: '200' };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100
        })
      );
    });

    it('should deny access if member cannot view audit log', async () => {
      mockReq.member = {
        id: 'member-123',
        name: 'Test User',
        role: 'MEMBER',
        familyId: 'family-123',
        canViewAuditLog: false
      };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: false
      });

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.planChangeLog.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array if no logs found', async () => {
      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          logs: [],
          total: 0
        }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockRejectedValue(error);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMealAuditLog', () => {
    beforeEach(() => {
      mockReq.params = {
        ...mockReq.params,
        mealId: 'meal-123'
      };
    });

    it('should return audit logs for a specific meal', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          planId: 'plan-123',
          mealId: 'meal-123',
          changeType: 'MEAL_RECIPE_CHANGED',
          memberId: 'member-123',
          description: 'Recette modifiée',
          descriptionEn: 'Recipe changed',
          descriptionNl: 'Recept gewijzigd',
          oldValue: 'Old Recipe',
          newValue: 'New Recipe',
          createdAt: new Date(),
          member: {
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT'
          }
        }
      ];

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue(mockLogs);

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          planId: 'plan-123',
          mealId: 'meal-123'
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          logs: mockLogs,
          total: mockLogs.length
        }
      });
    });

    it('should support filtering and pagination for meal logs', async () => {
      mockReq.query = {
        changeType: 'MEAL_COMMENT_ADDED',
        limit: '10',
        offset: '5'
      };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: true
      });
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          planId: 'plan-123',
          mealId: 'meal-123',
          changeType: 'MEAL_COMMENT_ADDED'
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 10,
        skip: 5
      });
    });

    it('should deny access if member cannot view audit log', async () => {
      mockReq.member = {
        id: 'member-123',
        name: 'Test User',
        role: 'CHILD',
        familyId: 'family-123',
        canViewAuditLog: false
      };

      (prisma.familyMember.findUnique as any).mockResolvedValue({
        canViewAuditLog: false
      });

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.planChangeLog.findMany).not.toHaveBeenCalled();
    });
  });
});
