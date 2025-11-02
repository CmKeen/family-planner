import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const addComponentSchema = z.object({
  componentId: z.string().uuid('Invalid component ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  order: z.number().int().min(0).optional()
});

const swapComponentSchema = z.object({
  newComponentId: z.string().uuid('Invalid component ID'),
  quantity: z.number().positive().optional(),
  unit: z.string().optional()
});

const updateComponentSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  order: z.number().int().min(0).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Add a component to a meal
 * POST /api/weekly-plans/:planId/meals/:mealId/components
 */
export const addComponentToMeal = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { mealId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const data = addComponentSchema.parse(req.body);

    // Find the meal and verify access
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        weeklyPlan: true
      }
    });

    if (!meal) {
      throw new AppError('Meal not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Verify the food component exists
    const component = await prisma.foodComponent.findUnique({
      where: { id: data.componentId }
    });

    if (!component) {
      throw new AppError('Food component not found', 404);
    }

    // Create the meal component
    const mealComponent = await prisma.mealComponent.create({
      data: {
        mealId,
        componentId: data.componentId,
        quantity: data.quantity,
        unit: data.unit,
        order: data.order ?? 0
      },
      include: {
        component: true
      }
    });

    res.status(201).json(mealComponent);
  }
);

/**
 * Swap a meal component with another (e.g., chicken → salmon)
 * PUT /api/weekly-plans/:planId/meals/:mealId/components/:componentId/swap
 */
export const swapMealComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { mealId, componentId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const data = swapComponentSchema.parse(req.body);

    // Find the existing meal component
    const existingComponent = await prisma.mealComponent.findUnique({
      where: { id: componentId },
      include: {
        meal: {
          include: {
            weeklyPlan: true
          }
        }
      }
    });

    if (!existingComponent) {
      throw new AppError('Meal component not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: existingComponent.meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Verify the new component exists
    const newComponent = await prisma.foodComponent.findUnique({
      where: { id: data.newComponentId }
    });

    if (!newComponent) {
      throw new AppError('New food component not found', 404);
    }

    // Use custom quantity if provided, otherwise use the new component's default
    const quantity = data.quantity ?? newComponent.defaultQuantity;
    const unit = data.unit ?? newComponent.unit;

    // Update the meal component
    const updatedComponent = await prisma.mealComponent.update({
      where: { id: componentId },
      data: {
        componentId: data.newComponentId,
        quantity,
        unit
      },
      include: {
        component: true
      }
    });

    res.status(200).json(updatedComponent);
  }
);

/**
 * Remove a component from a meal
 * DELETE /api/weekly-plans/:planId/meals/:mealId/components/:componentId
 */
export const removeMealComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { mealId, componentId } = req.params;
    const userId = req.user!.id;

    // Find the meal component
    const mealComponent = await prisma.mealComponent.findUnique({
      where: { id: componentId },
      include: {
        meal: {
          include: {
            weeklyPlan: true
          }
        }
      }
    });

    if (!mealComponent) {
      throw new AppError('Meal component not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: mealComponent.meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Delete the meal component
    await prisma.mealComponent.delete({
      where: { id: componentId }
    });

    res.status(200).json({
      message: 'Component removed from meal successfully'
    });
  }
);

/**
 * Update a meal component (quantity, unit, order)
 * PATCH /api/weekly-plans/:planId/meals/:mealId/components/:componentId
 */
export const updateMealComponent = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { mealId, componentId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const data = updateComponentSchema.parse(req.body);

    // Find the meal component
    const mealComponent = await prisma.mealComponent.findUnique({
      where: { id: componentId },
      include: {
        meal: {
          include: {
            weeklyPlan: true
          }
        }
      }
    });

    if (!mealComponent) {
      throw new AppError('Meal component not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: mealComponent.meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Update the meal component
    const updatedComponent = await prisma.mealComponent.update({
      where: { id: componentId },
      data,
      include: {
        component: true
      }
    });

    res.status(200).json(updatedComponent);
  }
);
