import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { canDeleteComment } from '../utils/permissions';
import { logChange, generateChangeDescription } from '../utils/auditLogger';

/**
 * Get all comments for a meal
 * GET /api/weekly-plans/:planId/meals/:mealId/comments
 */
export const getComments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;

    const comments = await prisma.mealComment.findMany({
      where: { mealId },
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

    res.json({
      status: 'success',
      data: { comments, count: comments.length }
    });
  }
);

/**
 * Add a comment to a meal
 * POST /api/weekly-plans/:planId/meals/:mealId/comments
 */
export const addComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      throw new AppError('Comment content is required', 400);
    }

    if (content.length > 2000) {
      throw new AppError('Comment must be less than 2000 characters', 400);
    }

    // Get the meal and verify it belongs to the plan
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        weeklyPlanId: planId
      },
      include: {
        weeklyPlan: {
          include: {
            family: {
              include: {
                members: {
                  where: { userId: req.user!.id }
                }
              }
            }
          }
        }
      }
    });

    if (!meal) {
      throw new AppError('Meal not found', 404);
    }

    const member = meal.weeklyPlan.family.members[0];
    if (!member) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Create the comment
    const comment = await prisma.mealComment.create({
      data: {
        mealId,
        memberId: member.id,
        content: content.trim()
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

    // Log the change
    const changeDescriptions = generateChangeDescription('COMMENT_ADDED', {
      memberName: member.name
    });

    await logChange({
      weeklyPlanId: planId,
      mealId,
      memberId: member.id,
      changeType: 'COMMENT_ADDED',
      ...changeDescriptions
    });

    res.status(201).json({
      status: 'success',
      data: { comment }
    });
  }
);

/**
 * Update a comment
 * PUT /api/weekly-plans/:planId/meals/:mealId/comments/:commentId
 */
export const updateComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId, commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      throw new AppError('Comment content is required', 400);
    }

    if (content.length > 2000) {
      throw new AppError('Comment must be less than 2000 characters', 400);
    }

    // Get the comment and verify ownership
    const existingComment = await prisma.mealComment.findUnique({
      where: { id: commentId },
      include: {
        member: {
          include: {
            family: {
              include: {
                members: {
                  where: { userId: req.user!.id }
                }
              }
            }
          }
        },
        meal: true
      }
    });

    if (!existingComment) {
      throw new AppError('Comment not found', 404);
    }

    if (existingComment.mealId !== mealId) {
      throw new AppError('Comment does not belong to this meal', 400);
    }

    // Get the current user's member record
    const currentMember = existingComment.member.family.members[0];
    if (!currentMember) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Only allow editing own comments (or ADMIN/PARENT can edit any)
    if (existingComment.memberId !== currentMember.id && currentMember.role !== 'ADMIN' && currentMember.role !== 'PARENT') {
      throw new AppError('You can only edit your own comments', 403);
    }

    // Update the comment
    const updatedComment = await prisma.mealComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
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

    // Log the change
    const changeDescriptions = generateChangeDescription('COMMENT_EDITED', {
      memberName: currentMember.name
    });

    await logChange({
      weeklyPlanId: planId,
      mealId,
      memberId: currentMember.id,
      changeType: 'COMMENT_EDITED',
      ...changeDescriptions
    });

    res.json({
      status: 'success',
      data: { comment: updatedComment }
    });
  }
);

/**
 * Delete a comment
 * DELETE /api/weekly-plans/:planId/meals/:mealId/comments/:commentId
 */
export const deleteComment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId, commentId } = req.params;

    // Get the comment and verify ownership
    const existingComment = await prisma.mealComment.findUnique({
      where: { id: commentId },
      include: {
        member: {
          include: {
            family: {
              include: {
                members: {
                  where: { userId: req.user!.id }
                }
              }
            }
          }
        }
      }
    });

    if (!existingComment) {
      throw new AppError('Comment not found', 404);
    }

    if (existingComment.mealId !== mealId) {
      throw new AppError('Comment does not belong to this meal', 400);
    }

    // Get the current user's member record
    const currentMember = existingComment.member.family.members[0];
    if (!currentMember) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Check permissions
    const isOwnComment = existingComment.memberId === currentMember.id;
    if (!canDeleteComment(currentMember.role, isOwnComment)) {
      throw new AppError('You can only delete your own comments', 403);
    }

    // Delete the comment
    await prisma.mealComment.delete({
      where: { id: commentId }
    });

    // Log the change
    const changeDescriptions = generateChangeDescription('COMMENT_DELETED', {
      memberName: currentMember.name
    });

    await logChange({
      weeklyPlanId: planId,
      mealId,
      memberId: currentMember.id,
      changeType: 'COMMENT_DELETED',
      ...changeDescriptions
    });

    res.json({
      status: 'success',
      message: 'Comment deleted successfully'
    });
  }
);
