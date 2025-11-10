/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import prisma from '../../lib/prisma';
import { lockMeal, addMeal, removeMeal } from '../weeklyPlan.controller';
import { authenticate } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';

// Mock modules
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    meal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn()
    },
    familyMember: {
      findFirst: jest.fn()
    },
    weeklyPlan: {
      findUnique: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  }
}));

jest.mock('../../utils/auditLogger', () => ({
  logChange: (jest.fn() as any).mockResolvedValue(null)
}));

jest.mock('../../services/notification.service', () => ({
  notificationService: {
    notifyMealAdded: (jest.fn() as any).mockResolvedValue(null),
    notifyMealRemoved: (jest.fn() as any).mockResolvedValue(null)
  }
}));

jest.mock('../../services/shoppingList.service', () => ({
  generateShoppingList: (jest.fn() as any).mockResolvedValue(null)
}));

jest.mock('jsonwebtoken');

describe('Weekly Plan Authorization Tests (OBU-93)', () => {
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
    app.post('/api/weekly-plans/:planId/meals/:mealId/lock', lockMeal);
    app.post('/api/weekly-plans/:planId/meals', addMeal);
    app.delete('/api/weekly-plans/:planId/meals/:mealId', removeMeal);

    // Error handler
    app.use(errorHandler);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('lockMeal - Member Authorization', () => {
    it('should successfully lock a meal when user is a family member', async () => {
      // Arrange
      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        locked: false,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      const mockUpdatedMeal = {
        ...mockMeal,
        locked: true
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(mockUpdatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/lock`)
        .send({ locked: true });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.meal.locked).toBe(true);

      // Verify member validation was performed
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          userId: mockUser.id
        }
      });
    });

    it('should return 404 when meal does not exist', async () => {
      // Arrange
      (prisma.meal.findUnique as any).mockResolvedValueOnce(null);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/lock`)
        .send({ locked: true });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Meal not found');

      // Verify member check was not performed (meal doesn't exist)
      expect(prisma.familyMember.findFirst).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a family member', async () => {
      // Arrange
      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        locked: false,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId
        }
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(null); // Not a member

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/lock`)
        .send({ locked: true });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('do not have permission');

      // Verify update was not attempted
      expect(prisma.meal.update).not.toHaveBeenCalled();
    });

    it('should successfully unlock a meal when user is a family member', async () => {
      // Arrange
      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        locked: true,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      const mockUpdatedMeal = {
        ...mockMeal,
        locked: false
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce(mockUpdatedMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/lock`)
        .send({ locked: false });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.meal.locked).toBe(false);
    });
  });

  describe('addMeal - Member Authorization', () => {
    it('should successfully add a meal when user is a family member', async () => {
      // Arrange
      const mockWeeklyPlan = {
        id: mockWeeklyPlanId,
        familyId: mockFamilyId,
        status: 'DRAFT',
        family: {
          members: [
            { id: mockMemberId, name: 'Test Member' },
            { id: 'member-2', name: 'Member 2' }
          ]
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      const mockNewMeal = {
        id: 'new-meal-123',
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'TUESDAY',
        mealType: 'LUNCH',
        recipeId: 'recipe-456',
        portions: 2,
        locked: false,
        recipe: null
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValueOnce(mockWeeklyPlan);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.findFirst as any).mockResolvedValueOnce(null); // No existing meal
      (prisma.meal.create as any).mockResolvedValueOnce(mockNewMeal);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals`)
        .send({
          dayOfWeek: 'TUESDAY',
          mealType: 'LUNCH',
          recipeId: 'recipe-456',
          portions: 4
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.meal.id).toBe('new-meal-123');

      // Verify member validation was performed
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          userId: mockUser.id
        }
      });
    });

    it('should return 404 when weekly plan does not exist', async () => {
      // Arrange
      (prisma.weeklyPlan.findUnique as any).mockResolvedValueOnce(null);

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals`)
        .send({
          dayOfWeek: 'TUESDAY',
          mealType: 'LUNCH',
          recipeId: 'recipe-456',
          portions: 4
        });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Weekly plan not found');

      // Verify member check was not performed
      expect(prisma.familyMember.findFirst).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a family member', async () => {
      // Arrange
      const mockWeeklyPlan = {
        id: mockWeeklyPlanId,
        familyId: mockFamilyId,
        status: 'DRAFT'
      };

      (prisma.weeklyPlan.findUnique as any).mockResolvedValueOnce(mockWeeklyPlan);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(null); // Not a member

      // Act
      const response = await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals`)
        .send({
          dayOfWeek: 'TUESDAY',
          mealType: 'LUNCH',
          recipeId: 'recipe-456',
          portions: 4
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('do not have permission');

      // Verify meal creation was not attempted
      expect(prisma.meal.create).not.toHaveBeenCalled();
    });
  });

  describe('removeMeal - Member Authorization', () => {
    it('should successfully remove a meal when user is a family member', async () => {
      // Arrange
      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'WEDNESDAY',
        mealType: 'DINNER',
        recipe: null,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId,
          status: 'DRAFT'
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      (prisma.meal.findFirst as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.count as any).mockResolvedValueOnce(3); // More than 1 meal
      (prisma.meal.delete as any).mockResolvedValueOnce(mockMeal);

      // Act
      const response = await request(app)
        .delete(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('skipped'); // Changed from 'removed' to 'skipped' (OBU-110)

      // Verify member validation was performed
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: mockFamilyId,
          userId: mockUser.id
        }
      });
    });

    it('should return 404 when meal does not exist', async () => {
      // Arrange
      (prisma.meal.findFirst as any).mockResolvedValueOnce(null);

      // Act
      const response = await request(app)
        .delete(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Meal not found');

      // Verify member check was not performed
      expect(prisma.familyMember.findFirst).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a family member', async () => {
      // Arrange
      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'WEDNESDAY',
        mealType: 'DINNER',
        recipe: null,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId,
          status: 'DRAFT'
        }
      };

      (prisma.meal.findFirst as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(null); // Not a member

      // Act
      const response = await request(app)
        .delete(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('do not have permission');

      // Verify deletion was not attempted
      expect(prisma.meal.delete).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging with Member ID', () => {
    it('should log meal lock action with validated member ID', async () => {
      // Arrange
      const { logChange } = require('../../utils/auditLogger');

      const mockMeal = {
        id: mockMealId,
        weeklyPlanId: mockWeeklyPlanId,
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        locked: false,
        weeklyPlan: {
          id: mockWeeklyPlanId,
          familyId: mockFamilyId
        }
      };

      const mockMember = {
        id: mockMemberId,
        userId: mockUser.id,
        familyId: mockFamilyId,
        name: 'Test Member'
      };

      (prisma.meal.findUnique as any).mockResolvedValueOnce(mockMeal);
      (prisma.familyMember.findFirst as any).mockResolvedValueOnce(mockMember);
      (prisma.meal.update as any).mockResolvedValueOnce({ ...mockMeal, locked: true });

      // Act
      await request(app)
        .post(`/api/weekly-plans/${mockWeeklyPlanId}/meals/${mockMealId}/lock`)
        .send({ locked: true });

      // Assert
      expect(logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: mockMemberId, // Must use validated member ID
          changeType: 'MEAL_LOCKED'
        })
      );
    });
  });
});
