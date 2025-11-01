import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

// Validation schemas
const dayOfWeekEnum = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
const mealTypeEnum = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);

const scheduleItemSchema = z.object({
  dayOfWeek: dayOfWeekEnum,
  mealTypes: z.array(mealTypeEnum).min(1)
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  schedule: z.array(scheduleItemSchema).min(1).max(7)
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  schedule: z.array(scheduleItemSchema).min(1).max(7).optional()
});

// Get all templates (system + family-specific)
export const getTemplates = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;

    // Verify user has access to this family
    await verifyFamilyAccess(familyId, req.user!.id);

    // Get system templates + this family's custom templates
    const templates = await prisma.mealScheduleTemplate.findMany({
      where: {
        OR: [
          { isSystem: true, familyId: null },
          { familyId, isSystem: false }
        ]
      },
      orderBy: [
        { isSystem: 'desc' }, // System templates first
        { name: 'asc' }
      ]
    });

    res.json({
      status: 'success',
      data: { templates, count: templates.length }
    });
  }
);

// Get single template
export const getTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId, templateId } = req.params;

    await verifyFamilyAccess(familyId, req.user!.id);

    const template = await prisma.mealScheduleTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { familyId }
        ]
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    res.json({
      status: 'success',
      data: { template }
    });
  }
);

// Create custom template
export const createTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const data = createTemplateSchema.parse(req.body);

    await verifyFamilyAccess(familyId, req.user!.id);

    // Check if template name already exists for this family
    const existing = await prisma.mealScheduleTemplate.findFirst({
      where: {
        familyId,
        name: data.name
      }
    });

    if (existing) {
      throw new AppError('A template with this name already exists for this family', 400);
    }

    const template = await prisma.mealScheduleTemplate.create({
      data: {
        ...data,
        familyId,
        isSystem: false
      }
    });

    res.status(201).json({
      status: 'success',
      data: { template }
    });
  }
);

// Update custom template
export const updateTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId, templateId } = req.params;
    const data = updateTemplateSchema.parse(req.body);

    await verifyFamilyAccess(familyId, req.user!.id);

    // Check template exists and belongs to this family
    const template = await prisma.mealScheduleTemplate.findFirst({
      where: {
        id: templateId,
        familyId,
        isSystem: false // Can't update system templates
      }
    });

    if (!template) {
      throw new AppError('Template not found or cannot be modified', 404);
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== template.name) {
      const existing = await prisma.mealScheduleTemplate.findFirst({
        where: {
          familyId,
          name: data.name,
          id: { not: templateId }
        }
      });

      if (existing) {
        throw new AppError('A template with this name already exists for this family', 400);
      }
    }

    const updated = await prisma.mealScheduleTemplate.update({
      where: { id: templateId },
      data
    });

    res.json({
      status: 'success',
      data: { template: updated }
    });
  }
);

// Delete custom template
export const deleteTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId, templateId } = req.params;

    await verifyFamilyAccess(familyId, req.user!.id);

    // Check template exists and belongs to this family
    const template = await prisma.mealScheduleTemplate.findFirst({
      where: {
        id: templateId,
        familyId,
        isSystem: false // Can't delete system templates
      }
    });

    if (!template) {
      throw new AppError('Template not found or cannot be deleted', 404);
    }

    // Check if template is being used as family default
    const familyUsingAsDefault = await prisma.family.findFirst({
      where: { defaultTemplateId: templateId }
    });

    if (familyUsingAsDefault) {
      throw new AppError('Cannot delete template that is set as family default', 400);
    }

    await prisma.mealScheduleTemplate.delete({
      where: { id: templateId }
    });

    res.json({
      status: 'success',
      message: 'Template deleted successfully'
    });
  }
);

// Set family default template
export const setDefaultTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { templateId } = req.body;

    await verifyFamilyAccess(familyId, req.user!.id);

    // Verify template exists and is accessible to this family
    const template = await prisma.mealScheduleTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { familyId }
        ]
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const family = await prisma.family.update({
      where: { id: familyId },
      data: { defaultTemplateId: templateId },
      include: {
        defaultTemplate: true,
        dietProfile: true,
        members: true
      }
    });

    res.json({
      status: 'success',
      data: { family }
    });
  }
);

// Helper function to verify family access
async function verifyFamilyAccess(familyId: string, userId: string) {
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      members: {
        some: { userId }
      }
    }
  });

  if (!family) {
    throw new AppError('Family not found or access denied', 404);
  }

  return family;
}
