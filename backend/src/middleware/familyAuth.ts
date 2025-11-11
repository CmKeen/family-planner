import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from './errorHandler';

/**
 * Middleware to populate req.member for family-scoped operations.
 * Ensures the authenticated user is a member of the family being accessed.
 *
 * Requires familyId to be available in:
 * - req.params.familyId
 * - req.params.planId (looks up family via weekly plan)
 * - req.params.mealId (looks up family via meal -> weekly plan)
 */
export const ensureFamilyMember = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract family ID from various sources
    let familyId: string | undefined;

    if (req.params.familyId) {
      familyId = req.params.familyId;
    } else if (req.params.planId) {
      // Look up family via weekly plan
      const plan = await prisma.weeklyPlan.findUnique({
        where: { id: req.params.planId },
        select: { familyId: true }
      });

      if (!plan) {
        throw new AppError('Weekly plan not found', 404);
      }

      familyId = plan.familyId;
    } else if (req.params.mealId) {
      // Look up family via meal -> weekly plan
      const meal = await prisma.meal.findUnique({
        where: { id: req.params.mealId },
        select: {
          weeklyPlan: {
            select: { familyId: true }
          }
        }
      });

      if (!meal) {
        throw new AppError('Meal not found', 404);
      }

      familyId = meal.weeklyPlan.familyId;
    }

    if (!familyId) {
      throw new AppError('Family context required', 400);
    }

    // Find member record
    const member = await prisma.familyMember.findFirst({
      where: {
        userId: req.user!.id,
        familyId: familyId
      }
    });

    if (!member) {
      throw new AppError('Not a member of this family', 403);
    }

    // Populate req.member
    req.member = member;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to ensure user has one of the specified role(s).
 * Must be used after ensureFamilyMember to ensure req.member is populated.
 *
 * @param allowedRoles - Array of role strings (e.g., 'ADMIN', 'PARENT')
 *
 * @example
 * router.post('/lock', ensureFamilyMember, requireRole('ADMIN', 'PARENT'), controller.lock);
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.member) {
      return next(new AppError('Member context not established', 500));
    }

    if (!allowedRoles.includes(req.member.role)) {
      return next(
        new AppError(
          `Requires role: ${allowedRoles.join(' or ')}`,
          403
        )
      );
    }

    next();
  };
};
