import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ensureFamilyMember, requireRole } from '../familyAuth';
import prisma from '../../lib/prisma';
import { AppError } from '../errorHandler';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    familyMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    weeklyPlan: {
      findUnique: vi.fn()
    },
    meal: {
      findUnique: vi.fn()
    }
  }
}));

describe('familyAuth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { id: 'user-123', email: 'test@example.com' },
      params: {},
      body: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('ensureFamilyMember', () => {
    describe('Valid family membership', () => {
      it('should populate req.member when familyId in params', async () => {
        const mockMember = {
          id: 'member-123',
          userId: 'user-123',
          familyId: 'family-456',
          name: 'Test User',
          role: 'PARENT',
          age: null,
          portionFactor: 1.0,
          aversions: [],
          favorites: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockRequest.params = { familyId: 'family-456' };
        (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            familyId: 'family-456'
          }
        });
        expect(mockRequest.member).toEqual(mockMember);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should populate req.member when familyId derived from planId', async () => {
        const mockMember = {
          id: 'member-123',
          userId: 'user-123',
          familyId: 'family-789',
          name: 'Test User',
          role: 'ADMIN',
          age: null,
          portionFactor: 1.0,
          aversions: [],
          favorites: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockRequest.params = { planId: 'plan-456' };
        (prisma.weeklyPlan.findUnique as any).mockResolvedValue({
          familyId: 'family-789'
        });
        (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(prisma.weeklyPlan.findUnique).toHaveBeenCalledWith({
          where: { id: 'plan-456' },
          select: { familyId: true }
        });
        expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
          where: {
            userId: 'user-123',
            familyId: 'family-789'
          }
        });
        expect(mockRequest.member).toEqual(mockMember);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should populate req.member when familyId derived from mealId', async () => {
        const mockMember = {
          id: 'member-123',
          userId: 'user-123',
          familyId: 'family-999',
          name: 'Test User',
          role: 'MEMBER',
          age: null,
          portionFactor: 1.0,
          aversions: [],
          favorites: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockRequest.params = { mealId: 'meal-123' };
        (prisma.meal.findUnique as any).mockResolvedValue({
          weeklyPlan: { familyId: 'family-999' }
        });
        (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockRequest.member).toEqual(mockMember);
        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should populate req.member for all role types', async () => {
        const roles = ['ADMIN', 'PARENT', 'MEMBER', 'CHILD'];

        for (const role of roles) {
          const mockMember = {
            id: `member-${role}`,
            userId: 'user-123',
            familyId: 'family-456',
            name: 'Test User',
            role,
            age: null,
            portionFactor: 1.0,
            aversions: [],
            favorites: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          mockRequest.params = { familyId: 'family-456' };
          (prisma.familyMember.findFirst as any).mockResolvedValue(mockMember);

          await ensureFamilyMember(
            mockRequest as Request,
            mockResponse as Response,
            mockNext
          );

          expect(mockRequest.member?.role).toBe(role);
          vi.clearAllMocks();
        }
      });
    });

    describe('Invalid family membership', () => {
      it('should throw 403 when user is not a family member', async () => {
        mockRequest.params = { familyId: 'family-456' };
        (prisma.familyMember.findFirst as any).mockResolvedValue(null);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Not a member of this family',
            statusCode: 403
          })
        );
        expect(mockRequest.member).toBeUndefined();
      });

      it('should throw 400 when no family context available', async () => {
        mockRequest.params = {}; // No familyId or planId

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Family context required',
            statusCode: 400
          })
        );
      });

      it('should throw 404 when planId does not exist', async () => {
        mockRequest.params = { planId: 'nonexistent-plan' };
        (prisma.weeklyPlan.findUnique as any).mockResolvedValue(null);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Weekly plan not found',
            statusCode: 404
          })
        );
      });

      it('should throw 403 when user tries to access another family', async () => {
        mockRequest.params = { familyId: 'other-family' };
        (prisma.familyMember.findFirst as any).mockResolvedValue(null);

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Not a member of this family',
            statusCode: 403
          })
        );
      });
    });

    describe('Error handling', () => {
      it('should handle database errors gracefully', async () => {
        mockRequest.params = { familyId: 'family-456' };
        (prisma.familyMember.findFirst as any).mockRejectedValue(
          new Error('Database connection failed')
        );

        await ensureFamilyMember(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Database connection failed'
          })
        );
      });
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      mockRequest.member = {
        id: 'member-123',
        userId: 'user-123',
        familyId: 'family-456',
        name: 'Test User',
        role: 'MEMBER',
        age: null,
        portionFactor: 1.0,
        aversions: [],
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    describe('Valid role access', () => {
      it('should allow ADMIN role when ADMIN required', () => {
        mockRequest.member!.role = 'ADMIN';
        const middleware = requireRole('ADMIN');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow PARENT role when PARENT required', () => {
        mockRequest.member!.role = 'PARENT';
        const middleware = requireRole('PARENT');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow ADMIN when ADMIN or PARENT required', () => {
        mockRequest.member!.role = 'ADMIN';
        const middleware = requireRole('ADMIN', 'PARENT');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow PARENT when ADMIN or PARENT required', () => {
        mockRequest.member!.role = 'PARENT';
        const middleware = requireRole('ADMIN', 'PARENT');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow any role when multiple roles specified', () => {
        const roles = ['ADMIN', 'PARENT', 'MEMBER', 'CHILD'];

        for (const role of roles) {
          mockRequest.member!.role = role;
          const middleware = requireRole(...roles);

          middleware(mockRequest as Request, mockResponse as Response, mockNext);

          expect(mockNext).toHaveBeenCalledWith();
          vi.clearAllMocks();
        }
      });
    });

    describe('Invalid role access', () => {
      it('should reject MEMBER when ADMIN required', () => {
        mockRequest.member!.role = 'MEMBER';
        const middleware = requireRole('ADMIN');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Requires role: ADMIN',
            statusCode: 403
          })
        );
      });

      it('should reject CHILD when ADMIN or PARENT required', () => {
        mockRequest.member!.role = 'CHILD';
        const middleware = requireRole('ADMIN', 'PARENT');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Requires role: ADMIN or PARENT',
            statusCode: 403
          })
        );
      });

      it('should reject MEMBER when ADMIN or PARENT required', () => {
        mockRequest.member!.role = 'MEMBER';
        const middleware = requireRole('ADMIN', 'PARENT');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Requires role: ADMIN or PARENT',
            statusCode: 403
          })
        );
      });

      it('should throw 500 when req.member is not populated', () => {
        mockRequest.member = undefined;
        const middleware = requireRole('ADMIN');

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Member context not established',
            statusCode: 500
          })
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle empty role list', () => {
        const middleware = requireRole();

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403
          })
        );
      });

      it('should handle case-sensitive role matching', () => {
        mockRequest.member!.role = 'admin'; // lowercase
        const middleware = requireRole('ADMIN'); // uppercase

        middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 403
          })
        );
      });
    });
  });
});
