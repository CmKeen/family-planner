import { generateShoppingList, regenerateShoppingList } from '../shoppingList.service';
import prisma from '../../lib/prisma';

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    weeklyPlan: {
      findUnique: jest.fn()
    },
    shoppingList: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      create: jest.fn()
    }
  }
}));

describe('ShoppingList Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShoppingList', () => {
    it('should throw error if weekly plan not found', async () => {
      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(generateShoppingList('nonexistent-plan-id')).rejects.toThrow(
        'Weekly plan not found'
      );
    });

    it('should generate shopping list from recipe ingredients', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              id: 'recipe-1',
              title: 'Pasta Carbonara',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  nameEn: 'Pasta',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  containsGluten: true,
                  containsLactose: false,
                  allergens: []
                },
                {
                  name: 'Lardons',
                  nameEn: 'Bacon',
                  quantity: 200,
                  unit: 'g',
                  category: 'meat',
                  alternatives: [],
                  containsGluten: false,
                  containsLactose: false,
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        familyId: 'family-1',
        weeklyPlanId: 'plan-1',
        items: []
      });

      const result = await generateShoppingList('plan-1');

      expect(result).toBeDefined();
      expect(prisma.shoppingList.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-1',
          weeklyPlanId: 'plan-1',
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                name: 'Pâtes',
                nameEn: 'Pasta',
                quantity: 400,
                unit: 'g',
                category: 'Épicerie'
              }),
              expect.objectContaining({
                name: 'Lardons',
                nameEn: 'Bacon',
                quantity: 200,
                unit: 'g',
                category: 'Boucherie'
              })
            ])
          }
        },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    it('should skip school meals and external meals', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: true,
            isExternal: false,
            recipe: {
              title: 'School Lunch',
              servings: 4,
              ingredients: [
                {
                  name: 'Bread',
                  quantity: 100,
                  unit: 'g',
                  category: 'bakery',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          },
          {
            id: 'meal-2',
            portions: 4,
            isSchoolMeal: false,
            isExternal: true,
            recipe: {
              title: 'Restaurant Dinner',
              servings: 4,
              ingredients: [
                {
                  name: 'Pizza',
                  quantity: 1,
                  unit: 'piece',
                  category: 'other',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.items.create).toHaveLength(0);
    });

    it('should aggregate same ingredients from multiple meals', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta Dish 1',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  nameEn: 'Pasta',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          },
          {
            id: 'meal-2',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta Dish 2',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  nameEn: 'Pasta',
                  quantity: 300,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.items.create).toHaveLength(1);
      expect(createCall.data.items.create[0]).toMatchObject({
        name: 'Pâtes',
        quantity: 700,
        unit: 'g',
        recipeNames: ['Pasta Dish 1', 'Pasta Dish 2']
      });
    });

    it('should scale ingredients based on portions and guests', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 6, // 6 portions instead of 4 (recipe servings)
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: [
              {
                adults: 2,
                children: 0
              }
            ]
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      const pastaItem = createCall.data.items.create[0];

      // servingFactor = 6/4 = 1.5
      // totalGuests = 2
      // finalFactor = 1.5 * (1 + 2/6) = 1.5 * 1.333 = 2
      // expected quantity = 400 * 2 = 800g (rounded)
      expect(pastaItem.quantity).toBeGreaterThan(600);
    });

    it('should apply gluten-free substitutions when dietProfile requires it', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: true,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  containsGluten: true,
                  containsLactose: false,
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      const pastaItem = createCall.data.items.create[0];

      expect(pastaItem.alternatives).toContain('Version sans gluten');
    });

    it('should apply lactose-free substitutions when dietProfile requires it', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: true
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta Carbonara',
              servings: 4,
              ingredients: [
                {
                  name: 'Crème fraîche',
                  quantity: 200,
                  unit: 'ml',
                  category: 'dairy',
                  alternatives: [],
                  containsGluten: false,
                  containsLactose: true,
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      const creamItem = createCall.data.items.create[0];

      expect(creamItem.alternatives).toContain('Version sans lactose (lait végétal, crème soja)');
    });

    it('should deduct inventory quantities', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: [
            {
              name: 'Pâtes',
              quantity: 200,
              unit: 'g'
            }
          ]
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      const pastaItem = createCall.data.items.create[0];

      // Should deduct 200g from 400g = 200g
      expect(pastaItem.quantity).toBeLessThan(400);
      expect(pastaItem.inStock).toBe(false);
    });

    it('should mark item as inStock if inventory covers full quantity', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: [
            {
              name: 'Pâtes',
              quantity: 500,
              unit: 'g'
            }
          ]
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: {
              title: 'Pasta',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      const pastaItem = createCall.data.items.create[0];

      expect(pastaItem.quantity).toBe(0);
      expect(pastaItem.inStock).toBe(true);
    });

    it('should delete existing shopping list before creating new one', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: []
      };

      const existingList = {
        id: 'existing-list-1',
        weeklyPlanId: 'plan-1'
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(existingList);
      (prisma.shoppingList.delete as jest.Mock).mockResolvedValue(existingList);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      expect(prisma.shoppingList.delete).toHaveBeenCalledWith({
        where: { id: 'existing-list-1' }
      });
      expect(prisma.shoppingList.create).toHaveBeenCalled();
    });

    it('should include meal components in shopping list', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            recipe: null,
            mealComponents: [
              {
                quantity: 1,
                unit: 'piece',
                component: {
                  name: 'Baguette',
                  nameEn: 'Baguette',
                  shoppingCategory: 'bakery',
                  glutenFree: false,
                  lactoseFree: true,
                  allergens: []
                }
              }
            ],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.items.create).toHaveLength(1);
      expect(createCall.data.items.create[0]).toMatchObject({
        name: 'Baguette',
        nameEn: 'Baguette',
        quantity: 4, // 1 piece * 4 servings
        unit: 'piece',
        category: 'Boulangerie'
      });
    });

    it('should exclude skipped meals from shopping list', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: [
          {
            id: 'meal-1',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            isSkipped: false,
            recipe: {
              title: 'Pasta',
              servings: 4,
              ingredients: [
                {
                  name: 'Pâtes',
                  quantity: 400,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          },
          {
            id: 'meal-2',
            portions: 4,
            isSchoolMeal: false,
            isExternal: false,
            isSkipped: true, // Skipped meal
            skipReason: 'Eating out',
            recipe: {
              title: 'Pizza',
              servings: 4,
              ingredients: [
                {
                  name: 'Farine',
                  quantity: 300,
                  unit: 'g',
                  category: 'pantry',
                  alternatives: [],
                  allergens: []
                }
              ]
            },
            mealComponents: [],
            guests: []
          }
        ]
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await generateShoppingList('plan-1');

      const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
      // Should only have 1 item (Pâtes from meal-1), not 2
      expect(createCall.data.items.create).toHaveLength(1);
      expect(createCall.data.items.create[0].name).toBe('Pâtes');
      // Should NOT include Farine from the skipped meal
      expect(createCall.data.items.create.find((item: any) => item.name === 'Farine')).toBeUndefined();
    });
  });

  describe('regenerateShoppingList', () => {
    it('should regenerate shopping list for existing plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: []
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-list',
        weeklyPlanId: 'plan-1'
      });
      (prisma.shoppingList.delete as jest.Mock).mockResolvedValue({});
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'new-list',
        items: []
      });

      await regenerateShoppingList('plan-1');

      expect(prisma.shoppingList.delete).toHaveBeenCalled();
      expect(prisma.shoppingList.create).toHaveBeenCalled();
    });

    it('should be callable multiple times (idempotent)', async () => {
      const mockPlan = {
        id: 'plan-1',
        familyId: 'family-1',
        family: {
          dietProfile: {
            glutenFree: false,
            lactoseFree: false
          },
          inventory: []
        },
        meals: []
      };

      (prisma.weeklyPlan.findUnique as jest.Mock).mockResolvedValue(mockPlan);
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
        id: 'list-1',
        items: []
      });

      await regenerateShoppingList('plan-1');
      await regenerateShoppingList('plan-1');
      await regenerateShoppingList('plan-1');

      expect(prisma.shoppingList.create).toHaveBeenCalledTimes(3);
    });
  });
});
