/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import prisma from '../../lib/prisma';
import { adjustMealPortions } from '../weeklyPlan.controller';
import { errorHandler } from '../../middleware/errorHandler';

// Mock modules
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    meal: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    familyMember: {
      findFirst: jest.fn()
    },
    weeklyPlan: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('../../utils/auditLogger', () => ({
  logChange: (jest.fn() as any).mockResolvedValue(null)
}));

jest.mock('../../services/shoppingList.service', () => ({
  generateShoppingList: (jest.fn() as any).mockResolvedValue(null)
}));

describe('Weekly Plan - Adjust Meal Portions (OBU-94)', () => {
  let app: Express;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  const mockFamilyId = 'family-456';
  const mockWeeklyPlanId = 'plan-789';
  const mockMealId = 'meal-abc';
  const mockMemberId = 'member-def';
  const mockRecipeId = 'recipe-xyz';

  beforeEach(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());

    // Mock authenticate middleware
    app.use((req: any, res, next) => {
      req.user = mockUser;
      next();
    });

    // Routes
    app.post('/api/weekly-plans/:planId/meals/:mealId/adjust-portions', adjustMealPortions);

    // Error handler
    app.use(errorHandler);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful portion adjustment', () => {
    it('should successfully adjust meal portions when user is a family member', async () => {
      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        portions: 4,
        locked: false,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId,
          weekNumber: 45,
          year: 2025,
          status: 'DRAFT'
        },
        recipe: {
          id: mockRecipeId,
          title: 'Pasta Carbonara',
          titleEn: 'Pasta Carbonara'
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      const updatedMeal = {
        ...oldMeal,
        portions: 6,
        recipe: oldMeal.recipe
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.meal.portions).toBe(6);

      // Verify meal was updated with correct portions
      expect(prisma.meal.update).toHaveBeenCalledWith({
        where: { id: mockMealId },
        data: { portions: 6 },
        include: { recipe: true }
      });

      // Verify member validation was performed
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          userId: mockUser.id
        }
      });
    });

    it('should adjust portions from 4 to 8', async () => {
      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId
      };

      const updatedMeal = { ...oldMeal, portions: 8 };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 8 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.meal.portions).toBe(8);
    });

    it('should adjust portions to minimum value of 1', async () => {
      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId
      };

      const updatedMeal = { ...oldMeal, portions: 1 };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 1 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.meal.portions).toBe(1);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when portions is missing', async () => {
      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Portions');
    });

    it('should return 400 when portions is 0', async () => {
      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 0 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Portions');
    });

    it('should return 400 when portions is negative', async () => {
      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: -2 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Portions');
    });

    it('should return 400 when portions is not an integer', async () => {
      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 4.5 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Portions');
    });

    it('should return 400 when portions is not a number', async () => {
      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 'invalid' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Portions');
    });
  });

  describe('Authorization checks', () => {
    it('should return 404 when meal does not exist', async () => {
      // Arrange
      (prisma.meal.findUnique as any).mockResolvedValueOnce(null);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Meal not found');
    });

    it('should return 403 when user is not a family member', async () => {
      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(null);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Audit logging', () => {
    it('should log portion changes to audit trail', async () => {
      // Import the mocked logChange
      const { logChange } = require('../../utils/auditLogger');

      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId
      };

      const updatedMeal = { ...oldMeal, portions: 6 };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert - verify audit log was created
      expect(logChange).toHaveBeenCalledWith({
        weeklyPlanId: mockWeeklyPlanId,
        mealId: mockMealId,
        changeType: 'PORTIONS_CHANGED',
        memberId: mockMemberId,
        oldValue: '4',
        newValue: '6',
        description: expect.stringContaining('4'),
        descriptionEn: expect.stringContaining('4'),
        descriptionNl: expect.stringContaining('4')
      });
    });
  });

  describe('Shopping list synchronization', () => {
    it('should regenerate shopping list after portion adjustment', async () => {
      // Import the mocked service
      const { generateShoppingList } = require('../../services/shoppingList.service');

      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId
      };

      const updatedMeal = { ...oldMeal, portions: 6 };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert - verify shopping list was regenerated
      expect(generateShoppingList).toHaveBeenCalledWith(mockWeeklyPlanId);
    });

    it('should not fail if shopping list regeneration fails', async () => {
      // Import the mocked service
      const { generateShoppingList } = require('../../services/shoppingList.service');
      (generateShoppingList as any).mockRejectedValueOnce(new Error('Shopping list error'));

      // Arrange
      const oldMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        recipeId: mockRecipeId,
        portions: 4,
        weeklyPlan: { id: mockWeeklyPlanId, familyId: mockFamilyId },
        recipe: { id: mockRecipeId, title: 'Test Recipe' }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId
      };

      const updatedMeal = { ...oldMeal, portions: 6 };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(oldMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(updatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/adjust-portions`)
        .send({ portions: 6 });

      // Assert - update should still succeed
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
