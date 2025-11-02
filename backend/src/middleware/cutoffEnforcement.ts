import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from './errorHandler.js';
import { canEditAfterCutoff, isAfterCutoff } from '../utils/permissions.js';

/**
 * Middleware to enforce cutoff deadlines for meal plan modifications
 * Allows comments after cutoff if allowCommentsAfterCutoff is true
 */
export const enforceCutoff = (options: { allowComments?: boolean } = {}) => {
  return asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { planId } = req.params;

    if (!planId) {
      throw new AppError('Plan ID is required', 400);
    }

    // Fetch the weekly plan with family member info
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: {
        family: {
          include: {
            members: {
              where: { userId: req.user!.id },
              take: 1
            }
          }
        }
      }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    // Get the current user's member role
    const member = plan.family.members[0];
    if (!member) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Check if cutoff has passed
    const afterCutoff = isAfterCutoff(plan.cutoffDate, plan.cutoffTime);

    if (afterCutoff) {
      // If this is a comment operation and comments are allowed after cutoff
      if (options.allowComments && plan.allowCommentsAfterCutoff) {
        return next();
      }

      // Check if user can edit after cutoff (ADMIN/PARENT)
      if (!canEditAfterCutoff(member.role)) {
        throw new AppError(
          'The cutoff deadline for modifications has passed. Please contact a family administrator.',
          403
        );
      }
    }

    next();
  });
};

/**
 * Middleware to check if plan modifications are allowed based on status
 */
export const enforceModifiableStatus = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { planId } = req.params;

    if (!planId) {
      throw new AppError('Plan ID is required', 400);
    }

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      select: { status: true }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    // Only allow modifications to DRAFT and IN_VALIDATION status
    if (plan.status === 'LOCKED') {
      throw new AppError('This plan is locked and cannot be modified', 403);
    }

    next();
  }
);
