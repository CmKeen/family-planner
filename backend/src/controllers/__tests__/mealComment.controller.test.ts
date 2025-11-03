
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment
} from '../mealComment.controller';
import { prisma } from '../../lib/prisma';

// Mock prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  prisma: {
    mealComment: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    meal: {
      findUnique: jest.fn()
    },
    familyMember: {
      findUnique: jest.fn()
    }
  }
}));

// Mock audit logger
jest.mock('../../utils/auditLogger', () => ({
  logChange: jest.fn()
}));

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
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
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
        orderBy: { createdAt: 'asc' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { comments: mockComments }
      });
    });

    it('should return empty array if no comments', async () => {
      (prisma.mealComment.findMany as any).mockResolvedValue([]);

      await getComments(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { comments: [] }
      });
    });

    it('should call next with error on failure', async () => {
      const error = new Error('Database error');
      (prisma.mealComment.findMany as any).mockRejectedValue(error);

      await getComments(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addComment', () => {
    it('should create a new comment', async () => {
      mockReq.body = { content: 'This looks delicious!' };

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

      (prisma.mealComment.create as any).mockResolvedValue(mockComment);

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);

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
        success: true,
        data: { comment: mockComment }
      });
    });

    it('should validate content is not empty', async () => {
      mockReq.body = { content: '' };

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.create).not.toHaveBeenCalled();
    });

    it('should validate content length (max 2000 chars)', async () => {
      mockReq.body = { content: 'a'.repeat(2001) };

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.create).not.toHaveBeenCalled();
    });

    it('should call next with error on failure', async () => {
      mockReq.body = { content: 'Test comment' };
      const error = new Error('Database error');
      (prisma.mealComment.create as any).mockRejectedValue(error);

      await addComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
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
        isEdited: false
      };

      const updatedComment = {
        ...existingComment,
        content: 'Updated comment',
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
        success: true,
        data: { comment: updatedComment }
      });
    });

    it('should not allow updating someone else\'s comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Original comment',
        memberId: 'other-member-123', // Different member
        mealId: 'meal-123',
        isEdited: false
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.update).not.toHaveBeenCalled();
    });

    it('should return 404 if comment not found', async () => {
      (prisma.mealComment.findUnique as any).mockResolvedValue(null);

      await updateComment(mockReq as AuthRequest, mockRes as Response, mockNext);

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
        mealId: 'meal-123'
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.mealComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Comment deleted successfully' }
      });
    });

    it('should allow ADMIN to delete any comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123', // Different member
        mealId: 'meal-123'
      };

      mockReq.member = {
        id: 'member-123',
        name: 'Admin User',
        role: 'ADMIN',
        familyId: 'family-123'
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.mealComment.delete).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should allow PARENT to delete any comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123',
        mealId: 'meal-123'
      };

      mockReq.member = {
        id: 'member-123',
        name: 'Parent User',
        role: 'PARENT',
        familyId: 'family-123'
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);
      (prisma.mealComment.delete as any).mockResolvedValue(existingComment);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(prisma.mealComment.delete).toHaveBeenCalled();
    });

    it('should not allow MEMBER to delete other\'s comment', async () => {
      const existingComment = {
        id: 'comment-1',
        content: 'Test comment',
        memberId: 'other-member-123',
        mealId: 'meal-123'
      };

      mockReq.member = {
        id: 'member-123',
        name: 'Member User',
        role: 'MEMBER',
        familyId: 'family-123'
      };

      (prisma.mealComment.findUnique as any).mockResolvedValue(existingComment);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if comment not found', async () => {
      (prisma.mealComment.findUnique as any).mockResolvedValue(null);

      await deleteComment(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(prisma.mealComment.delete).not.toHaveBeenCalled();
    });
  });
});
