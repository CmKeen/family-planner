
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getPlanAuditLog, getMealAuditLog } from '../auditLog.controller';
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
    planChangeLog: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    weeklyPlan: {
      findUnique: jest.fn()
    },
    meal: {
      findFirst: jest.fn()
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
  canViewAuditLog: jest.fn()
}));

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

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
    const { canViewAuditLog } = require('../../utils/permissions');

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
          },
          meal: null
        }
      ];

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(mockLogs.length);
      (prisma.planChangeLog.findMany as any).mockResolvedValue(mockLogs);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: { weeklyPlanId: 'plan-123' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          meal: {
            select: {
              id: true,
              dayOfWeek: true,
              mealType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          logs: mockLogs,
          pagination: {
            total: mockLogs.length,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      });
    });

    it('should filter by memberId when provided', async () => {
      mockReq.query = { memberId: 'member-456' };

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };

      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          weeklyPlanId: 'plan-123',
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

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          weeklyPlanId: 'plan-123',
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

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

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

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

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

      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Member User',
            role: 'MEMBER',
            userId: 'user-123',
            canViewAuditLog: false
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(false);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.planChangeLog.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array if no logs found', async () => {
      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          logs: [],
          pagination: {
            total: 0,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      const mockPlan = {
        id: 'plan-123',
        family: {
          members: [{
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT',
            userId: 'user-123',
            canViewAuditLog: true
          }]
        }
      };
      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.weeklyPlan.findUnique as any).mockResolvedValue(mockPlan);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockRejectedValue(error);

      await getPlanAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

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

      const mockMeal = {
        id: 'meal-123',
        weeklyPlanId: 'plan-123',
        weeklyPlan: {
          family: {
            members: [{
              id: 'member-123',
              name: 'Test User',
              role: 'PARENT',
              userId: 'user-123',
              canViewAuditLog: true
            }]
          }
        }
      };

      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.meal.findFirst as any).mockResolvedValue(mockMeal);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(mockLogs.length);
      (prisma.planChangeLog.findMany as any).mockResolvedValue(mockLogs);

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
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
        status: 'success',
        data: {
          logs: mockLogs,
          pagination: {
            total: mockLogs.length,
            limit: 50,
            offset: 0,
            hasMore: false
          }
        }
      });
    });

    it('should support filtering and pagination for meal logs', async () => {
      mockReq.query = {
        changeType: 'MEAL_COMMENT_ADDED',
        limit: '10',
        offset: '5'
      };

      const mockMeal = {
        id: 'meal-123',
        weeklyPlanId: 'plan-123',
        weeklyPlan: {
          family: {
            members: [{
              id: 'member-123',
              name: 'Test User',
              role: 'PARENT',
              userId: 'user-123',
              canViewAuditLog: true
            }]
          }
        }
      };

      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.meal.findFirst as any).mockResolvedValue(mockMeal);
      (canViewAuditLog as any).mockReturnValue(true);
      (prisma.planChangeLog.count as any).mockResolvedValue(0);
      (prisma.planChangeLog.findMany as any).mockResolvedValue([]);

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.planChangeLog.findMany).toHaveBeenCalledWith({
        where: {
          mealId: 'meal-123'
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

      const mockMeal = {
        id: 'meal-123',
        weeklyPlanId: 'plan-123',
        weeklyPlan: {
          family: {
            members: [{
              id: 'member-123',
              name: 'Member User',
              role: 'CHILD',
              userId: 'user-123',
              canViewAuditLog: false
            }]
          }
        }
      };

      const { canViewAuditLog } = require('../../utils/permissions');
      (prisma.meal.findFirst as any).mockResolvedValue(mockMeal);
      (canViewAuditLog as any).mockReturnValue(false);

      await getMealAuditLog(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.planChangeLog.findMany).not.toHaveBeenCalled();
    });
  });
});
