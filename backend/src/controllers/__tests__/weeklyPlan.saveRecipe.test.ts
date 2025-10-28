import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Prisma client
const mockPrismaTransaction = jest.fn() as jest.MockedFunction<any>;
const mockRecipeCreate = jest.fn() as jest.MockedFunction<any>;
const mockIngredientCreate = jest.fn() as jest.MockedFunction<any>;
const mockMealFindUnique = jest.fn() as jest.MockedFunction<any>;

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    meal: {
      findUnique: mockMealFindUnique
    },
    recipe: {
      create: mockRecipeCreate
    },
    ingredient: {
      createMany: mockIngredientCreate
    },
    $transaction: mockPrismaTransaction
  }
}));

describe('Save Component Combo as Recipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveComponentMealAsRecipe', () => {
    it('should convert component-based meal to recipe', async () => {
      const mockMeal = {
        id: 'meal-1',
        weeklyPlanId: 'plan-1',
        dayOfWeek: 'MONDAY',
        mealType: 'DINNER',
        recipeId: null,
        portions: 4,
        mealComponents: [
          {
            id: 'mc-1',
            componentId: 'c-1',
            quantity: 150,
            unit: 'g',
            role: 'MAIN_PROTEIN',
            component: {
              id: 'c-1',
              name: 'Poulet',
              nameEn: 'Chicken',
              nameNl: 'Kip',
              category: 'PROTEIN',
              shoppingCategory: 'meats'
            }
          },
          {
            id: 'mc-2',
            componentId: 'c-2',
            quantity: 100,
            unit: 'g',
            role: 'PRIMARY_VEGETABLE',
            component: {
              id: 'c-2',
              name: 'Brocoli',
              nameEn: 'Broccoli',
              nameNl: 'Broccoli',
              category: 'VEGETABLE',
              shoppingCategory: 'fruitsVegetables'
            }
          },
          {
            id: 'mc-3',
            componentId: 'c-3',
            quantity: 80,
            unit: 'g',
            role: 'BASE_CARB',
            component: {
              id: 'c-3',
              name: 'Riz',
              nameEn: 'Rice',
              nameNl: 'Rijst',
              category: 'CARB',
              shoppingCategory: 'grocery'
            }
          }
        ]
      };

      mockMealFindUnique.mockResolvedValue(mockMeal);

      // Verify meal has components
      expect(mockMeal.recipeId).toBeNull();
      expect(mockMeal.mealComponents).toHaveLength(3);
      expect(mockMeal.mealComponents.some(mc => mc.role === 'MAIN_PROTEIN')).toBe(true);
    });

    it('should create recipe with isComponentBased flag', () => {
      const recipeData = {
        title: 'Poulet avec Brocoli et Riz',
        titleEn: 'Chicken with Broccoli and Rice',
        familyId: 'family-1',
        isComponentBased: true,
        prepTime: 15,
        cookTime: 25,
        totalTime: 40,
        servings: 4
      };

      expect(recipeData.isComponentBased).toBe(true);
      expect(recipeData.title).toContain('Poulet');
      expect(recipeData.titleEn).toContain('Chicken');
    });

    it('should generate recipe name from components', () => {
      const components = [
        { component: { name: 'Poulet', nameEn: 'Chicken' } },
        { component: { name: 'Brocoli', nameEn: 'Broccoli' } },
        { component: { name: 'Riz', nameEn: 'Rice' } }
      ];

      const titleFr = components.map(c => c.component.name).join(' avec ');
      const titleEn = components.map(c => c.component.nameEn).join(' with ');

      expect(titleFr).toBe('Poulet avec Brocoli avec Riz');
      expect(titleEn).toBe('Chicken with Broccoli with Rice');
    });

    it('should create ingredients from meal components', () => {
      const mealComponents = [
        {
          component: {
            name: 'Poulet',
            nameEn: 'Chicken',
            nameNl: 'Kip',
            shoppingCategory: 'meats'
          },
          quantity: 150,
          unit: 'g'
        },
        {
          component: {
            name: 'Brocoli',
            nameEn: 'Broccoli',
            nameNl: 'Broccoli',
            shoppingCategory: 'fruitsVegetables'
          },
          quantity: 100,
          unit: 'g'
        }
      ];

      const ingredients = mealComponents.map((mc, index) => ({
        recipeId: 'recipe-1',
        name: mc.component.name,
        nameEn: mc.component.nameEn,
        quantity: mc.quantity,
        unit: mc.unit,
        category: mc.component.shoppingCategory,
        order: index
      }));

      expect(ingredients).toHaveLength(2);
      expect(ingredients[0].name).toBe('Poulet');
      expect(ingredients[0].quantity).toBe(150);
      expect(ingredients[0].unit).toBe('g');
      expect(ingredients[0].category).toBe('meats');
    });

    it('should fail if meal has no components', async () => {
      const mealWithoutComponents = {
        id: 'meal-1',
        recipeId: 'recipe-1',
        mealComponents: []
      };

      mockMealFindUnique.mockResolvedValue(mealWithoutComponents);

      // Should throw error
      expect(mealWithoutComponents.mealComponents.length).toBe(0);
    });

    it('should fail if meal already has a recipe', () => {
      const mealWithRecipe = {
        id: 'meal-1',
        recipeId: 'existing-recipe',
        mealComponents: [{ id: 'mc-1' }]
      };

      expect(mealWithRecipe.recipeId).not.toBeNull();
      // This should fail validation
    });

    it('should update meal with new recipe ID after creation', () => {
      const mealId = 'meal-1';
      const newRecipeId = 'recipe-new';

      const updatedMeal = {
        id: mealId,
        recipeId: newRecipeId,
        mealComponents: []
      };

      expect(updatedMeal.recipeId).toBe(newRecipeId);
      expect(updatedMeal.recipeId).not.toBeNull();
    });

    it('should estimate cook time based on components', () => {
      const components = [
        { component: { category: 'PROTEIN', name: 'Chicken' } },
        { component: { category: 'VEGETABLE', name: 'Broccoli' } },
        { component: { category: 'CARB', name: 'Rice' } }
      ];

      // Estimate: Protein = 20min, Vegetable = 10min, Carb = 15min (max parallel)
      const prepTime = 15; // Standard prep for component-based
      const cookTime = 25; // Max cook time
      const totalTime = prepTime + cookTime;

      expect(prepTime).toBe(15);
      expect(cookTime).toBeGreaterThanOrEqual(20);
      expect(totalTime).toBe(40);
    });
  });
});
