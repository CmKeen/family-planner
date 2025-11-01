import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const createComponentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEn: z.string().optional(),
  nameNl: z.string().optional(),
  category: z.enum(['PROTEIN', 'VEGETABLE', 'CARB', 'FRUIT', 'SAUCE', 'CONDIMENT', 'SPICE', 'OTHER']),
  defaultQuantity: z.number().positive('Default quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  vegetarian: z.boolean().default(true),
  vegan: z.boolean().default(false),
  pescatarian: z.boolean().default(false),
  glutenFree: z.boolean().default(true),
  lactoseFree: z.boolean().default(true),
  kosherCategory: z.enum(['meat', 'dairy', 'parve']).nullable().optional(),
  halalFriendly: z.boolean().default(true),
  allergens: z.array(z.string()).default([]),
  shoppingCategory: z.string().default('produce'),
  defaultPricePerUnit: z.number().positive().optional(),
  seasonality: z.array(z.string()).default(['all'])
});

const updateComponentSchema = createComponentSchema.partial();

/**
 * Get all food components (system + family custom)
 * GET /api/components?familyId=xxx&category=PROTEIN
 */
export const getAllComponents = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { familyId, category } = req.query;

    const whereClause: any = {
      OR: [
        { isSystemComponent: true },
        { familyId: familyId as string || null }
      ]
    };

    if (category) {
      whereClause.category = category as string;
    }

    const components = await prisma.foodComponent.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    res.status(200).json(components);
  }
);

/**
 * Create a custom food component for a family
 * POST /api/families/:familyId/components
 */
export const createCustomComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { familyId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const data = createComponentSchema.parse(req.body);

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You must be a member of this family to create components', 403);
    }

    // Create the custom component
    const component = await prisma.foodComponent.create({
      data: {
        ...data,
        isSystemComponent: false,
        familyId
      }
    });

    res.status(201).json(component);
  }
);

/**
 * Update a food component (only custom components)
 * PUT /api/components/:id
 */
export const updateComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const data = updateComponentSchema.parse(req.body);

    // Find the component
    const component = await prisma.foodComponent.findUnique({
      where: { id }
    });

    if (!component) {
      throw new AppError('Component not found', 404);
    }

    // Prevent updating system components
    if (component.isSystemComponent) {
      throw new AppError('Cannot modify system components', 403);
    }

    // Check if user is a member of the component's family
    if (component.familyId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: component.familyId,
          userId
        }
      });

      if (!member) {
        throw new AppError('You do not have permission to update this component', 403);
      }
    }

    // Update the component
    const updatedComponent = await prisma.foodComponent.update({
      where: { id },
      data
    });

    res.status(200).json(updatedComponent);
  }
);

/**
 * Delete a food component (only custom components)
 * DELETE /api/components/:id
 */
export const deleteComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Find the component
    const component = await prisma.foodComponent.findUnique({
      where: { id }
    });

    if (!component) {
      throw new AppError('Component not found', 404);
    }

    // Prevent deleting system components
    if (component.isSystemComponent) {
      throw new AppError('Cannot delete system components', 403);
    }

    // Check if user is an admin of the component's family
    if (component.familyId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: component.familyId,
          userId,
          role: {
            in: ['ADMIN', 'PARENT']
          }
        }
      });

      if (!member) {
        throw new AppError('You do not have permission to delete this component', 403);
      }
    }

    // Delete the component
    await prisma.foodComponent.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Component deleted successfully'
    });
  }
);
