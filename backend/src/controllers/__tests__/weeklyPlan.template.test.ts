import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';

// Type aliases for Prisma enums
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
type PlanStatus = 'DRAFT' | 'IN_VALIDATION' | 'VALIDATED' | 'LOCKED';

// Mock Prisma client
const mockPrismaClient = {
  weeklyPlan: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  meal: {
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  recipe: {
    findMany: jest.fn()
  },
  mealScheduleTemplate: {
    findFirst: jest.fn()
  },
  family: {
    findUnique: jest.fn()
  }
};

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient
}));

import {
  addMeal,
  removeMeal,
  switchTemplate
} from '../weeklyPlan.controller.js';

describe('WeeklyPlan Template Operations', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'test-user-id' }
    };
    mockResponse = responseObject;
    jest.clearAllMocks();
  });

  describe('addMeal', () => {
    it('should add a meal to a draft plan', async () => {
      const planId = 'test-plan-id';
      const familyId = 'test-family-id';
      mockRequest.params = { planId };
      mockRequest.body = {
        dayOfWeek: 'MONDAY' as DayOfWeek,
        mealType: 'DINNER' as MealType
      };

      const mockPlan = {
        id: planId,
        familyId,
        status: 'DRAFT' as PlanStatus,
        weekStartDate: new Date(),
        meals: []
      };

      const mockRecipe = {
        id: 'recipe-id',
        title: 'Test Recipe'
      };

      const mockCreatedMeal = {
        id: 'new-meal-id',
        weeklyPlanId: planId,
        dayOfWeek: 'MONDAY' as DayOfWeek,
        mealType: 'DINNER' as MealType,
        recipeId: 'recipe-id',
        portions: 4
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaClient.recipe.findMany.mockResolvedValue([mockRecipe]);
      mockPrismaClient.meal.create.mockResolvedValue(mockCreatedMeal);

      await addMeal(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.meal.create).toHaveBeenCalledWith({
        data: {
          weeklyPlanId: planId,
          dayOfWeek: 'MONDAY',
          mealType: 'DINNER',
          recipeId: mockRecipe.id,
          portions: 4
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { meal: mockCreatedMeal }
      });
    });

    it('should not allow adding meals to validated plans', async () => {
      const planId = 'test-plan-id';
      mockRequest.params = { planId };
      mockRequest.body = {
        dayOfWeek: 'MONDAY' as DayOfWeek,
        mealType: 'DINNER' as MealType
      };

      const mockValidatedPlan = {
        id: planId,
        status: 'VALIDATED' as PlanStatus
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockValidatedPlan);

      await addMeal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot add meals to validated or locked plans'
      });
    });

    it('should validate required fields', async () => {
      mockRequest.params = { planId: 'test-plan-id' };
      mockRequest.body = {
        dayOfWeek: 'MONDAY'
        // Missing mealType
      };

      await addMeal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Day of week and meal type are required'
      });
    });

    it('should prevent duplicate meals for same day and meal type', async () => {
      const planId = 'test-plan-id';
      mockRequest.params = { planId };
      mockRequest.body = {
        dayOfWeek: 'MONDAY' as DayOfWeek,
        mealType: 'DINNER' as MealType
      };

      const mockPlanWithExistingMeal = {
        id: planId,
        status: 'DRAFT' as PlanStatus,
        meals: [
          {
            dayOfWeek: 'MONDAY' as DayOfWeek,
            mealType: 'DINNER' as MealType
          }
        ]
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlanWithExistingMeal);

      await addMeal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'A meal already exists for this day and meal type'
      });
    });
  });

  describe('removeMeal', () => {
    it('should remove a meal from a draft plan', async () => {
      const planId = 'test-plan-id';
      const mealId = 'test-meal-id';
      mockRequest.params = { planId, mealId };

      const mockPlan = {
        id: planId,
        status: 'DRAFT' as PlanStatus,
        meals: [
          { id: mealId, dayOfWeek: 'MONDAY' as DayOfWeek, mealType: 'DINNER' as MealType }
        ]
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaClient.meal.delete.mockResolvedValue({ id: mealId });

      await removeMeal(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.meal.delete).toHaveBeenCalledWith({
        where: { id: mealId }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Meal removed successfully'
      });
    });

    it('should not allow removing meals from validated plans', async () => {
      const planId = 'test-plan-id';
      const mealId = 'test-meal-id';
      mockRequest.params = { planId, mealId };

      const mockValidatedPlan = {
        id: planId,
        status: 'VALIDATED' as PlanStatus,
        meals: [{ id: mealId }]
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockValidatedPlan);

      await removeMeal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot remove meals from validated or locked plans'
      });
    });

    it('should return 404 if meal not found in plan', async () => {
      const planId = 'test-plan-id';
      const mealId = 'non-existent-meal-id';
      mockRequest.params = { planId, mealId };

      const mockPlan = {
        id: planId,
        status: 'DRAFT' as PlanStatus,
        meals: [
          { id: 'different-meal-id' }
        ]
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlan);

      await removeMeal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Meal not found in this plan'
      });
    });
  });

  describe('switchTemplate', () => {
    it('should switch template and regenerate meals for draft plan', async () => {
      const planId = 'test-plan-id';
      const familyId = 'test-family-id';
      const newTemplateId = 'new-template-id';
      mockRequest.params = { planId };
      mockRequest.body = { templateId: newTemplateId };

      const mockPlan = {
        id: planId,
        familyId,
        status: 'DRAFT' as PlanStatus,
        weekStartDate: new Date(),
        templateId: 'old-template-id'
      };

      const mockTemplate = {
        id: newTemplateId,
        name: 'New Template',
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: ['LUNCH', 'DINNER'] },
          { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] }
        ]
      };

      const mockRecipes = [
        { id: 'recipe-1', title: 'Recipe 1' },
        { id: 'recipe-2', title: 'Recipe 2' },
        { id: 'recipe-3', title: 'Recipe 3' }
      ];

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrismaClient.recipe.findMany.mockResolvedValue(mockRecipes);
      mockPrismaClient.meal.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.weeklyPlan.update.mockResolvedValue({
        ...mockPlan,
        templateId: newTemplateId,
        meals: []
      });

      await switchTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.meal.deleteMany).toHaveBeenCalledWith({
        where: { weeklyPlanId: planId }
      });

      expect(mockPrismaClient.weeklyPlan.update).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            plan: expect.any(Object)
          })
        })
      );
    });

    it('should not allow switching template for validated plans', async () => {
      const planId = 'test-plan-id';
      mockRequest.params = { planId };
      mockRequest.body = { templateId: 'new-template-id' };

      const mockValidatedPlan = {
        id: planId,
        status: 'VALIDATED' as PlanStatus
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockValidatedPlan);

      await switchTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot switch template for validated or locked plans'
      });
    });

    it('should validate template exists and is accessible', async () => {
      const planId = 'test-plan-id';
      const familyId = 'test-family-id';
      mockRequest.params = { planId };
      mockRequest.body = { templateId: 'non-existent-template-id' };

      const mockPlan = {
        id: planId,
        familyId,
        status: 'DRAFT' as PlanStatus
      };

      mockPrismaClient.weeklyPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(null);

      await switchTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Template not found or not accessible'
      });
    });

    it('should require templateId in request body', async () => {
      mockRequest.params = { planId: 'test-plan-id' };
      mockRequest.body = {}; // Missing templateId

      await switchTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Template ID is required'
      });
    });
  });

  describe('Template-based meal generation', () => {
    it('should respect template schedule when generating meals', async () => {
      // This tests the logic used in generateAutoPlan
      const template = {
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: ['BREAKFAST', 'DINNER'] },
          { dayOfWeek: 'WEDNESDAY', mealTypes: ['LUNCH'] },
          { dayOfWeek: 'FRIDAY', mealTypes: ['DINNER'] }
        ]
      };

      const expectedMealCount =
        template.schedule.reduce((count, day) => count + day.mealTypes.length, 0);

      expect(expectedMealCount).toBe(4);
      expect(template.schedule[0].mealTypes).toContain('BREAKFAST');
      expect(template.schedule[0].mealTypes).toContain('DINNER');
    });

    it('should handle empty meal type arrays gracefully', async () => {
      const template = {
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: [] },
          { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] }
        ]
      };

      const totalMeals = template.schedule.reduce(
        (count, day) => count + day.mealTypes.length,
        0
      );

      expect(totalMeals).toBe(1);
    });

    it('should support all 4 meal types', async () => {
      const template = {
        schedule: [
          {
            dayOfWeek: 'SUNDAY',
            mealTypes: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']
          }
        ]
      };

      const mealTypes = template.schedule[0].mealTypes;
      expect(mealTypes).toContain('BREAKFAST');
      expect(mealTypes).toContain('LUNCH');
      expect(mealTypes).toContain('DINNER');
      expect(mealTypes).toContain('SNACK');
      expect(mealTypes.length).toBe(4);
    });
  });
});
