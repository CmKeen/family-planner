import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const createSchoolMenuSchema = z.object({
  familyId: z.string(),
  schoolName: z.string().optional(),
  date: z.string(),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).optional(),
  title: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  ocrConfidence: z.number().optional(),
  needsReview: z.boolean().optional()
});

export const createSchoolMenu = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = createSchoolMenuSchema.parse(req.body);

    const schoolMenu = await prisma.schoolMenu.create({
      data: {
        ...data,
        date: new Date(data.date),
        mealType: data.mealType || 'LUNCH'
      }
    });

    res.status(201).json({
      status: 'success',
      data: { schoolMenu }
    });
  }
);

export const getSchoolMenus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { familyId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const schoolMenus = await prisma.schoolMenu.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    res.json({
      status: 'success',
      data: { schoolMenus, count: schoolMenus.length }
    });
  }
);

export const updateSchoolMenu = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, category, description, needsReview } = req.body;

    const schoolMenu = await prisma.schoolMenu.update({
      where: { id },
      data: {
        title,
        category,
        description,
        needsReview
      }
    });

    res.json({
      status: 'success',
      data: { schoolMenu }
    });
  }
);

export const deleteSchoolMenu = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.schoolMenu.delete({ where: { id } });

    res.json({
      status: 'success',
      message: 'School menu deleted successfully'
    });
  }
);
