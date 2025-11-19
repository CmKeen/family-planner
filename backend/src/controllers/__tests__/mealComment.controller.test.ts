import { vi } from 'vitest';

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment
} from '../mealComment.controller';
import prisma from '../../lib/prisma';

// Mock logger
vi.mock('../../config/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock prisma
vi.mock('../../lib/prisma', () => {
  const mockPrisma = {
    mealComment: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    meal: {
      findFirst: vi.fn()
    }
  };

  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma
  };
});

// Mock audit logger
vi.mock('../../utils/auditLogger', () => ({
  logChange: vi.fn().mockResolvedValue(undefined),
  generateChangeDescription: vi.fn().mockReturnValue({
    description: 'Test change',
    descriptionEn: 'Test change',
    descriptionNl: 'Test wijziging'
  })
}));

// Mock permissions
vi.mock('../../utils/permissions', () => ({
  canDeleteComment: vi.fn()
}));

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('MealComment Controller', () => {
  let mockReq: AuthRequest;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      params: {
        planId: 'plan-123',
        mealId: 'meal-123'
      },
      body: {},
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
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getComments', () => {
    it('should return comments for a meal', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Great meal!',
          memberId: 'member-123',
          mealId: 'meal-123',
          isEdited: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          member: {
            id: 'member-123',
            name: 'Test User',
            role: 'PARENT'
          }
        }
      ];

      (prisma.mealComment.findMany as any).mockResolvedValue(mockComments);

      await getComments(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.mealComment.findMany).toHaveBeenCalledWith({
        where: { mealId: 'meal-123' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { comments: mockComments, count: mockComments.length }
      });
    });

    it('should return empty array if no comments', async () => {
      (prisma.mealComment.findMany as any).mockResolvedValue([]);

      await getComments(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { comments: [], count: 0 }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      (prisma.mealComment.findMany as any).mockRejectedValue(error);

      await getComments(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addComment', () => {
    it('should create a new comment', async () => {
      mockReq.body = { content: 'This looks delicious!' };

      const mockMeal = {
        id: 'meal-123',
        weeklyPlanId: 'plan-123',
        weeklyPlan: {
          family: {
            members: [{
              id: 'member-123',
              name: 'Test User',
              role: 'PARENT',
              userId: 'user-123'
            }]
          }
        }
      };

      const mockComment = {
        id: 'comment-1',
        content: 'This looks delicious!',
        memberId: 'member-123',
        mealId: 'meal-123',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        member: {
          id: 'member-123',
          name: 'Test User',
          role: 'PARENT'
        }
      };

      (prisma.meal.findFirst as any).mockResolvedValue(mockMeal);
      (prisma.mealComment.create as any).mockResolvedValue(mockComment);

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.mealComment.create).toHaveBeenCalledWith({
        data: {
          content: 'This looks delicious!',
          mealId: 'meal-123',
          memberId: 'member-123'
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { comment: mockComment }
      });
    });

    it('should validate content is not empty', async () => {
      mockReq.body = { content: '' };

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.meal.findFirst).not.toHaveBeenCalled();
    });

    it('should validate content length (max 2000 chars)', async () => {
      mockReq.body = { content: 'a'.repeat(2001) };

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.meal.findFirst).not.toHaveBeenCalled();
    });

    it('should return 404 if meal not found', async () => {
      mockReq.body = { content: 'Test comment' };
      (prisma.meal.findFirst as any).mockResolvedValue(null);

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.create).not.toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    beforeEach(() => {
      mockReq.params = {
        ...mockReq.params,
        commentId: 'comment-1'
      };
      mockReq.body = { content: 'Updated comment' };
    });

    it('should update own comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Original comment',
        memberId: 'member-123',
        mealId: 'meal-123',
        isEdited: false,
        member: {
          id: 'member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Test User',
              role: 'PARENT',
              userId: 'user-123'
            }]
          }
        },
        meal: {
          id: 'meal-123'
        }
      };

      const updatedComment = {
        id: 'comment-1',
        content: 'Updated comment',
        memberId: 'member-123',
        mealId: 'meal-123',
        isEdited: true,
        member: {
          id: 'member-123',
          name: 'Test User',
          role: 'PARENT'
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.update as any).mockResolvedValue(updatedComment);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.mealComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: {
          content: 'Updated comment',
          isEdited: true
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { comment: updatedComment }
      });
    });

    it('should allow ADMIN to update any comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Original comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        isEdited: false,
        member: {
          id: 'other-member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Admin User',
              role: 'ADMIN',
              userId: 'user-123'
            }]
          }
        },
        meal: {
          id: 'meal-123'
        }
      };

      const updatedComment = {
        id: 'comment-1',
        content: 'Updated comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        isEdited: true,
        member: {
          id: 'other-member-123',
          name: 'Other User',
          role: 'MEMBER'
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.update as any).mockResolvedValue(updatedComment);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.mealComment.update).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should not allow MEMBER to update someone else\'s comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Original comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        isEdited: false,
        member: {
          id: 'other-member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Member User',
              role: 'MEMBER',
              userId: 'user-123'
            }]
          }
        },
        meal: {
          id: 'meal-123'
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.update).not.toHaveBeenCalled();
    });

    it('should return 404 if comment not found', async () => {
      (prisma.mealComment.findUnique as any).mockResolvedValue(null);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.update).not.toHaveBeenCalled();
    });

    it('should validate content on update', async () => {
      mockReq.body = { content: '' };

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    const { canDeleteComment } = require('../../utils/permissions');

    beforeEach(() => {
      mockReq.params = {
        ...mockReq.params,
        commentId: 'comment-1'
      };
    });

    it('should allow member to delete own comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'member-123',
        mealId: 'meal-123',
        member: {
          id: 'member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Test User',
              role: 'PARENT',
              userId: 'user-123'
            }]
          }
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);
      (canDeleteComment as any).mockReturnValue(true);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.mealComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Comment deleted successfully'
      });
    });

    it('should allow ADMIN to delete any comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        member: {
          id: 'other-member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Admin User',
              role: 'ADMIN',
              userId: 'user-123'
            }]
          }
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);
      (canDeleteComment as any).mockReturnValue(true);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(canDeleteComment).toHaveBeenCalledWith('ADMIN', false);
      expect(prisma.mealComment.delete).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should allow PARENT to delete any comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        member: {
          id: 'other-member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Parent User',
              role: 'PARENT',
              userId: 'user-123'
            }]
          }
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);
      (canDeleteComment as any).mockReturnValue(true);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(canDeleteComment).toHaveBeenCalledWith('PARENT', false);
      expect(prisma.mealComment.delete).toHaveBeenCalled();
    });

    it('should not allow MEMBER to delete other\'s comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123',
        mealId: 'meal-123',
        member: {
          id: 'other-member-123',
          family: {
            members: [{
              id: 'member-123',
              name: 'Member User',
              role: 'MEMBER',
              userId: 'user-123'
            }]
          }
        }
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (canDeleteComment as any).mockReturnValue(false);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(canDeleteComment).toHaveBeenCalledWith('MEMBER', false);
      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if comment not found', async () => {
      (prisma.mealComment.findUnique as any).mockResolvedValue(null);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.delete).not.toHaveBeenCalled();
    });
  });
});
