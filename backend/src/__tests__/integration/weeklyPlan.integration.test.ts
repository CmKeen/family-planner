import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import weeklyPlanRoutes from '../../routes/weeklyPlan.routes';

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    family: {
      findUnique: jest.fn()
    },
    weeklyPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    meal: {
      createMany: jest.fn(),
      update: jest.fn()
    },
    recipe: {
      findMany: jest.fn()
    },
    schoolMenu: {
      findMany: jest.fn()
    },
    attendance: {
      upsert: jest.fn()
    },
    guest: {
      create: jest.fn()
    },
    vote: {
      upsert: jest.fn()
    },
    wish: {
      create: jest.fn()
    }
  }
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

describe('Weekly Plan API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/weekly-plans', weeklyPlanRoutes);

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message
      });
    });
  });

  describe('POST /api/weekly-plans', () => {
    it('should create a new weekly plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStartDate: new Date('2024-01-01'),
        weekNumber: 1,
        year: 2024,
        status: 'DRAFT',
        meals: []
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.create as jest.Mock).mockResolvedValue(mockPlan);

      const response = await request(app)
        .post('/api/weekly-plans')
        .send({
          familyId: 'family-1',
          weekStartDate: '2024-01-01'
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.weeklyPlan).toEqual(mockPlan);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/weekly-plans')
        .send({
          familyId: 'family-1',
          weekStartDate: 'invalid-date'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /api/weekly-plans/family/:familyId', () => {
    it('should retrieve weekly plans for a family', async () => {
      const mockPlans = [
        {
          id: 'plan-1',
          familyId: 'family-1',
          weekStartDate: new Date('2024-01-01'),
          status: 'DRAFT',
          meals: []
        },
        {
          id: 'plan-2',
          familyId: 'family-1',
          weekStartDate: new Date('2024-01-08'),
          status: 'VALIDATED',
          meals: []
        }
      ];

      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.findMany as jest.Mock).mockResolvedValue(mockPlans);

      const response = await request(app)
        .get('/api/weekly-plans/family/family-1');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.plans).toHaveLength(2);
    });

    it('should limit number of plans returned', async () => {
      const mockPlans = new Array(5).fill(null).map((_, i) => ({
        id: `plan-${i}`,
        familyId: 'family-1'
      }));

      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.findMany as jest.Mock).mockResolvedValue(mockPlans);

      const response = await request(app)
        .get('/api/weekly-plans/family/family-1?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.data.plans).toHaveLength(5);
    });
  });

  describe('GET /api/weekly-plans/:id', () => {
    it('should retrieve a specific weekly plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStartDate: new Date('2024-01-01'),
        status: 'DRAFT',
        family: {
          id: 'family-1',
          name: 'Test Family',
          dietProfile: {},
          members: []
        },
        meals: [],
        wishes: []
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);

      const response = await request(app)
        .get('/api/weekly-plans/plan-1');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.plan.id).toBe('plan-1');
    });

    it('should return 404 for non-existent plan', async () => {
      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/weekly-plans/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/weekly-plans/family/:familyId/auto', () => {
    it('should generate an auto plan successfully', async () => {
      const mockFamily = {
        id: 'family-1',
        name: 'Test Family',
        dietProfile: {
          favoriteRatio: 0.7,
          maxNovelties: 2,
          kosher: false,
          halal: false,
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          lactoseFree: false,
          allergies: []
        },
        members: [
          { id: 'member-1', name: 'John' },
          { id: 'member-2', name: 'Jane' }
        ]
      };

      const mockRecipes = [
        {
          id: 'recipe-1',
          name: 'Recipe 1',
          isFavorite: true,
          isNovelty: false,
          category: 'Viandes',
          ingredients: []
        },
        {
          id: 'recipe-2',
          name: 'Recipe 2',
          isFavorite: false,
          isNovelty: true,
          category: 'Pâtes',
          ingredients: []
        }
      ];

      const mockWeeklyPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStartDate: new Date('2024-01-01'),
        weekNumber: 1,
        year: 2024,
        status: 'DRAFT',
        meals: []
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
      (prisma.schoolMenu.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.weeklyPlan.create as jest.Mock).mockResolvedValue(mockWeeklyPlan);
      (prisma.meal.createMany as jest.Mock).mockResolvedValue({ count: 14 });
      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue({
        ...mockWeeklyPlan,
        meals: new Array(14).fill({
          id: 'meal-1',
          recipe: mockRecipes[0]
        })
      });

      const response = await request(app)
        .post('/api/weekly-plans/family/family-1/auto')
        .send({ weekStartDate: '2024-01-01' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.plan.meals).toHaveLength(14);
    });

    it('should return 404 for non-existent family', async () => {
      const prisma = require('../../lib/prisma').default;
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/weekly-plans/family/non-existent/auto')
        .send({ weekStartDate: '2024-01-01' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/weekly-plans/family/:familyId/express', () => {
    it('should generate an express plan with favorites', async () => {
      const mockFamily = {
        id: 'family-1',
        name: 'Test Family',
        dietProfile: {
          favoriteRatio: 0.7,
          maxNovelties: 2,
          kosher: false,
          halal: false,
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          lactoseFree: false,
          allergies: []
        },
        members: [
          { id: 'member-1', name: 'John' }
        ]
      };

      const mockFavorites = [
        {
          id: 'recipe-1',
          name: 'Favorite 1',
          isFavorite: true,
          ingredients: []
        }
      ];

      const mockWeeklyPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        weekStartDate: new Date('2024-01-01'),
        status: 'DRAFT'
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockFavorites);
      (prisma.weeklyPlan.create as jest.Mock).mockResolvedValue(mockWeeklyPlan);
      (prisma.meal.createMany as jest.Mock).mockResolvedValue({ count: 14 });
      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue({
        ...mockWeeklyPlan,
        meals: new Array(14).fill({
          id: 'meal-1',
          recipe: mockFavorites[0]
        })
      });

      const response = await request(app)
        .post('/api/weekly-plans/family/family-1/express')
        .send({ weekStartDate: '2024-01-01' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
    });

    it('should return 400 when no favorites exist', async () => {
      const mockFamily = {
        id: 'family-1',
        dietProfile: {
          allergies: []
        },
        members: []
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(mockFamily);
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/weekly-plans/family/family-1/express')
        .send({ weekStartDate: '2024-01-01' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/weekly-plans/:planId/meals/:mealId/swap', () => {
    it('should swap a meal recipe', async () => {
      const mockUpdatedMeal = {
        id: 'meal-1',
        recipeId: 'new-recipe',
        recipe: {
          id: 'new-recipe',
          name: 'New Recipe'
        }
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.meal.update as jest.Mock).mockResolvedValue(mockUpdatedMeal);

      const response = await request(app)
        .patch('/api/weekly-plans/plan-1/meals/meal-1/swap')
        .send({ newRecipeId: 'new-recipe' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.meal.recipeId).toBe('new-recipe');
    });
  });

  describe('PATCH /api/weekly-plans/:planId/meals/:mealId/lock', () => {
    it('should lock a meal', async () => {
      const mockLockedMeal = {
        id: 'meal-1',
        locked: true
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.meal.update as jest.Mock).mockResolvedValue(mockLockedMeal);

      const response = await request(app)
        .patch('/api/weekly-plans/plan-1/meals/meal-1/lock')
        .send({ locked: true });

      expect(response.status).toBe(200);
      expect(response.body.data.meal.locked).toBe(true);
    });
  });

  describe('POST /api/weekly-plans/:planId/validate', () => {
    it('should validate a draft plan', async () => {
      const mockValidatedPlan = {
        id: 'plan-1',
        status: 'VALIDATED',
        validatedAt: new Date(),
        meals: []
      };

      const prisma = require('../../lib/prisma').default;
      (prisma.weeklyPlan.update as jest.Mock).mockResolvedValue(mockValidatedPlan);

      const response = await request(app)
        .post('/api/weekly-plans/plan-1/validate');

      expect(response.status).toBe(200);
      expect(response.body.data.plan.status).toBe('VALIDATED');
      expect(response.body.data.plan.validatedAt).toBeDefined();
    });
  });
});
