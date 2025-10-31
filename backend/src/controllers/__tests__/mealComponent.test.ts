import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';

// Type aliases for Prisma enums
type ComponentRole = 'MAIN_PROTEIN' | 'SECONDARY_PROTEIN' | 'PRIMARY_VEGETABLE' | 'SECONDARY_VEGETABLE' | 'BASE_CARB' | 'SIDE_CARB' | 'SAUCE' | 'GARNISH' | 'OTHER';

// Mock Prisma client
const mockMeal = {
  findUnique: jest.fn() as any,
  update: jest.fn() as any
};

const mockMealComponentModel = {
  create: jest.fn() as any,
  findUnique: jest.fn() as any,
  update: jest.fn() as any,
  delete: jest.fn() as any,
  findMany: jest.fn() as any
};

const mockFoodComponent = {
  findUnique: jest.fn() as any,
  findMany: jest.fn() as any
};

const mockFamilyMember = {
  findFirst: jest.fn() as any
};

const mockWeeklyPlan = {
  findUnique: jest.fn() as any
};

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    meal: mockMeal,
    mealComponent: mockMealComponentModel,
    foodComponent: mockFoodComponent,
    familyMember: mockFamilyMember,
    weeklyPlan: mockWeeklyPlan
  }
}));

import prisma from '../../lib/prisma.js';
import {
  addComponentToMeal,
  swapMealComponent,
  removeMealComponent,
  updateMealComponent
} from '../mealComponent.controller.js';
import { AuthRequest } from '../../middleware/auth.js';

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('Meal Component Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        email: 'test@example.com'
      }
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };

    nextFunction = jest.fn();
  });

  describe('addComponentToMeal', () => {
    it('should successfully add a component to a meal', async () => {
      mockRequest.params = { mealId: 'meal-1' };
      mockRequest.body = {
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g'
      };

      const mockMealData = {
        id: 'meal-1',
        weeklyPlanId: 'plan-1',
        weeklyPlan: {
          familyId: 'family-1'
        }
      };

      const mockComponent = {
        id: 'comp-chicken',
        name: 'Poulet',
        nameEn: 'Chicken',
        category: 'PROTEIN'
      };

      const mockMealComponentData = {
        id: 'mc-1',
        mealId: 'meal-1',
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g',
        order: 0,
        component: mockComponent
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockMeal.findUnique.mockResolvedValue(mockMealData);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.findUnique.mockResolvedValue(mockComponent);
      mockMealComponentModel.create.mockResolvedValue(mockMealComponentData);

      await addComponentToMeal(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMeal.findUnique).toHaveBeenCalledWith({
        where: { id: 'meal-1' },
        include: { weeklyPlan: true }
      });

      expect(mockMealComponentModel.create).toHaveBeenCalledWith({
        data: {
          mealId: 'meal-1',
          componentId: 'comp-chicken',
          role: 'MAIN_PROTEIN',
          quantity: 150,
          unit: 'g',
          order: 0
        },
        include: {
          component: true
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockMealComponentData);
    });

    it('should return 404 if meal not found', async () => {
      mockRequest.params = { mealId: 'non-existent' };
      mockRequest.body = {
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g'
      };

      mockMeal.findUnique.mockResolvedValue(null);

      await addComponentToMeal(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Meal not found'
      }));
    });

    it('should deny access if user is not a family member', async () => {
      mockRequest.params = { mealId: 'meal-1' };
      mockRequest.body = {
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g'
      };

      const mockMealData = {
        id: 'meal-1',
        weeklyPlanId: 'plan-1',
        weeklyPlan: {
          familyId: 'family-1'
        }
      };

      mockMeal.findUnique.mockResolvedValue(mockMealData);
      mockFamilyMember.findFirst.mockResolvedValue(null);

      await addComponentToMeal(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));
    });

    it('should return 404 if component not found', async () => {
      mockRequest.params = { mealId: 'meal-1' };
      mockRequest.body = {
        componentId: 'non-existent',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g'
      };

      const mockMealData = {
        id: 'meal-1',
        weeklyPlanId: 'plan-1',
        weeklyPlan: {
          familyId: 'family-1'
        }
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockMeal.findUnique.mockResolvedValue(mockMealData);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.findUnique.mockResolvedValue(null);

      await addComponentToMeal(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Food component not found'
      }));
    });

    it('should validate required fields', async () => {
      mockRequest.params = { mealId: 'meal-1' };
      mockRequest.body = {
        componentId: 'comp-chicken'
        // missing: role, quantity, unit
      };

      await addComponentToMeal(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400
      }));
    });
  });

  describe('swapMealComponent', () => {
    it('should successfully swap a component (e.g., chicken → salmon)', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };
      mockRequest.body = {
        newComponentId: 'comp-salmon'
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        mealId: 'meal-1',
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g',
        order: 0,
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      const newComponent = {
        id: 'comp-salmon',
        name: 'Saumon',
        nameEn: 'Salmon',
        category: 'PROTEIN',
        defaultQuantity: 150,
        unit: 'g'
      };

      const updatedMealComponent = {
        ...existingMealComponent,
        componentId: 'comp-salmon',
        component: newComponent
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.findUnique.mockResolvedValue(newComponent);
      mockMealComponentModel.update.mockResolvedValue(updatedMealComponent);

      await swapMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMealComponentModel.update).toHaveBeenCalledWith({
        where: { id: 'mc-chicken' },
        data: {
          componentId: 'comp-salmon',
          quantity: 150,
          unit: 'g'
        },
        include: {
          component: true
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedMealComponent);
    });

    it('should preserve custom quantity when swapping', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };
      mockRequest.body = {
        newComponentId: 'comp-salmon',
        quantity: 200 // custom quantity
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        mealId: 'meal-1',
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g',
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      const newComponent = {
        id: 'comp-salmon',
        defaultQuantity: 150,
        unit: 'g'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.findUnique.mockResolvedValue(newComponent);

      await swapMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMealComponentModel.update).toHaveBeenCalledWith({
        where: { id: 'mc-chicken' },
        data: {
          componentId: 'comp-salmon',
          quantity: 200, // uses custom quantity
          unit: 'g'
        },
        include: {
          component: true
        }
      });
    });

    it('should return 404 if meal component not found', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'non-existent'
      };
      mockRequest.body = {
        newComponentId: 'comp-salmon'
      };

      mockMealComponentModel.findUnique.mockResolvedValue(null);

      await swapMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404
      }));
    });
  });

  describe('removeMealComponent', () => {
    it('should successfully remove a component from a meal', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        mealId: 'meal-1',
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockMealComponentModel.delete.mockResolvedValue(existingMealComponent);

      await removeMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMealComponentModel.delete).toHaveBeenCalledWith({
        where: { id: 'mc-chicken' }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Component removed from meal successfully'
      });
    });

    it('should return 404 if meal component not found', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'non-existent'
      };

      mockMealComponentModel.findUnique.mockResolvedValue(null);

      await removeMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404
      }));
    });

    it('should deny access if user is not a family member', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        mealId: 'meal-1',
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(null);

      await removeMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));
    });
  });

  describe('updateMealComponent', () => {
    it('should successfully update component quantity', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };
      mockRequest.body = {
        quantity: 200
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        mealId: 'meal-1',
        quantity: 150,
        unit: 'g',
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      const updatedMealComponent = {
        ...existingMealComponent,
        quantity: 200
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockMealComponentModel.update.mockResolvedValue(updatedMealComponent);

      await updateMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMealComponentModel.update).toHaveBeenCalledWith({
        where: { id: 'mc-chicken' },
        data: { quantity: 200 },
        include: {
          component: true
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedMealComponent);
    });

    it('should update multiple fields at once', async () => {
      mockRequest.params = {
        mealId: 'meal-1',
        componentId: 'mc-chicken'
      };
      mockRequest.body = {
        quantity: 200,
        role: 'SECONDARY_PROTEIN',
        order: 1
      };

      const existingMealComponent = {
        id: 'mc-chicken',
        meal: {
          weeklyPlan: {
            familyId: 'family-1'
          }
        }
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' };

      mockMealComponentModel.findUnique.mockResolvedValue(existingMealComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);

      await updateMealComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockMealComponentModel.update).toHaveBeenCalledWith({
        where: { id: 'mc-chicken' },
        data: {
          quantity: 200,
          role: 'SECONDARY_PROTEIN',
          order: 1
        },
        include: {
          component: true
        }
      });
    });
  });
});
