import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { canViewAuditLog } from '../utils/permissions';
import { ChangeType } from '@prisma/client';

/**
 * Get audit log for a weekly plan
 * GET /api/weekly-plans/:planId/audit-log
 */
export const getPlanAuditLog = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId } = req.params;
    const {
      mealId,
      memberId,
      changeType,
      limit = '50',
      offset = '0'
    } = req.query;

    // Verify the plan exists and user has access
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: {
        family: {
          include: {
            members: {
              where: { userId: req.user!.id }
            }
          }
        }
      }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    const currentMember = plan.family.members[0];
    if (!currentMember) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Check if user can view audit log
    if (!canViewAuditLog(currentMember.canViewAuditLog)) {
      throw new AppError('You do not have permission to view the audit log', 403);
    }

    // Build filter
    const where: any = {
      weeklyPlanId: planId
    };

    if (mealId) {
      where.mealId = mealId as string;
    }

    if (memberId) {
      where.memberId = memberId as string;
    }

    if (changeType) {
      where.changeType = changeType as ChangeType;
    }

    // Get total count
    const totalCount = await prisma.planChangeLog.count({ where });

    // Get paginated logs
    const logs = await prisma.planChangeLog.findMany({
      where,
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
      take: Math.min(parseInt(limit as string), 100), // Max 100 per page
      skip: parseInt(offset as string)
    });

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
  }
);

/**
 * Get audit log for a specific meal
 * GET /api/weekly-plans/:planId/meals/:mealId/audit-log
 */
export const getMealAuditLog = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Verify the meal exists and belongs to the plan
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

    const currentMember = meal.weeklyPlan.family.members[0];
    if (!currentMember) {
      throw new AppError('You are not a member of this family', 403);
    }

    // Check if user can view audit log
    if (!canViewAuditLog(currentMember.canViewAuditLog)) {
      throw new AppError('You do not have permission to view the audit log', 403);
    }

    // Get total count
    const totalCount = await prisma.planChangeLog.count({
      where: { mealId }
    });

    // Get paginated logs
    const logs = await prisma.planChangeLog.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit as string), 100),
      skip: parseInt(offset as string)
    });

    res.json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > parseInt(offset as string) + parseInt(limit as string)
        }
      }
    });
  }
);
