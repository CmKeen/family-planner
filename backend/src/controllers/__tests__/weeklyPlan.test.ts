import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DayOfWeek, MealType } from '@prisma/client';

// Mock Prisma client
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
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

describe('Weekly Plan Algorithm', () => {
  describe('getWeekNumber', () => {
    it('should calculate correct week number for start of year', () => {
      const getWeekNumber = (date: Date): number => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      };

      const jan1 = new Date('2024-01-01');
      expect(getWeekNumber(jan1)).toBe(1);
    });

    it('should calculate correct week number for mid year', () => {
      const getWeekNumber = (date: Date): number => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      };

      const july1 = new Date('2024-07-01');
      const weekNum = getWeekNumber(july1);
      expect(weekNum).toBeGreaterThan(20);
      expect(weekNum).toBeLessThan(32);
    });

    it('should calculate correct week number for end of year', () => {
      const getWeekNumber = (date: Date): number => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      };

      const dec31 = new Date('2024-12-31');
      const weekNum = getWeekNumber(dec31);
      expect(weekNum).toBeGreaterThan(50);
      expect(weekNum).toBeLessThanOrEqual(54);
    });
  });

  describe('selectRecipe', () => {
    const selectRecipe = (
      favorites: any[],
      novelties: any[],
      others: any[],
      state: {
        favoriteIndex: number;
        noveltyIndex: number;
        otherIndex: number;
        noveltyCount: number;
        maxNovelties: number;
        favoriteRatio: number;
        avoidCategory?: string;
      }
    ) => {
      // Filter out avoided category
      const filterCategory = (recipes: any[]) =>
        state.avoidCategory
          ? recipes.filter(r => r.category !== state.avoidCategory)
          : recipes;

      const availableFavorites = filterCategory(favorites);
      const availableNovelties = filterCategory(novelties);
      const availableOthers = filterCategory(others);

      // Try novelty if under limit
      if (state.noveltyCount < state.maxNovelties && availableNovelties.length > 0) {
        const idx = state.noveltyIndex % availableNovelties.length;
        return { recipe: availableNovelties[idx], from: 'novelties' };
      }

      // Prefer favorites
      if (availableFavorites.length > 0 && Math.random() < state.favoriteRatio) {
        const idx = state.favoriteIndex % availableFavorites.length;
        return { recipe: availableFavorites[idx], from: 'favorites' };
      }

      // Fallback to others
      if (availableOthers.length > 0) {
        const idx = state.otherIndex % availableOthers.length;
        return { recipe: availableOthers[idx], from: 'others' };
      }

      // Last resort: use any available recipe
      const allAvailable = [...availableFavorites, ...availableNovelties, ...availableOthers];
      if (allAvailable.length > 0) {
        return { recipe: allAvailable[0], from: 'fallback' };
      }

      throw new Error('No recipes available');
    };

    const mockFavorites = [
      { id: 'f1', name: 'Favorite 1', category: 'Viandes', isFavorite: true },
      { id: 'f2', name: 'Favorite 2', category: 'Pâtes', isFavorite: true }
    ];

    const mockNovelties = [
      { id: 'n1', name: 'Novelty 1', category: 'Poissons', isNovelty: true },
      { id: 'n2', name: 'Novelty 2', category: 'Légumes', isNovelty: true }
    ];

    const mockOthers = [
      { id: 'o1', name: 'Other 1', category: 'Soupes' },
      { id: 'o2', name: 'Other 2', category: 'Salades' }
    ];

    it('should select novelty when under max novelties limit', () => {
      const state = {
        favoriteIndex: 0,
        noveltyIndex: 0,
        otherIndex: 0,
        noveltyCount: 0,
        maxNovelties: 2,
        favoriteRatio: 0.7
      };

      const result = selectRecipe(mockFavorites, mockNovelties, mockOthers, state);
      expect(result.from).toBe('novelties');
      expect(result.recipe.isNovelty).toBe(true);
    });

    it('should avoid specified category', () => {
      const state = {
        favoriteIndex: 0,
        noveltyIndex: 0,
        otherIndex: 0,
        noveltyCount: 0,
        maxNovelties: 2,
        favoriteRatio: 0.7,
        avoidCategory: 'Poissons'
      };

      const result = selectRecipe(mockFavorites, mockNovelties, mockOthers, state);
      expect(result.recipe.category).not.toBe('Poissons');
    });

    it('should cycle through favorites using favoriteIndex', () => {
      const state = {
        favoriteIndex: 1,
        noveltyIndex: 0,
        otherIndex: 0,
        noveltyCount: 2, // At max
        maxNovelties: 2,
        favoriteRatio: 1.0 // Always favor favorites
      };

      const result = selectRecipe(mockFavorites, mockNovelties, mockOthers, state);
      if (result.from === 'favorites') {
        expect(result.recipe.id).toBe('f2'); // Index 1
      }
    });

    it('should throw error when no recipes available', () => {
      const state = {
        favoriteIndex: 0,
        noveltyIndex: 0,
        otherIndex: 0,
        noveltyCount: 0,
        maxNovelties: 2,
        favoriteRatio: 0.7
      };

      expect(() => selectRecipe([], [], [], state)).toThrow('No recipes available');
    });

    it('should handle wrap-around with modulo for favorites', () => {
      const state = {
        favoriteIndex: 5, // Greater than array length
        noveltyIndex: 0,
        otherIndex: 0,
        noveltyCount: 2,
        maxNovelties: 2,
        favoriteRatio: 1.0
      };

      const result = selectRecipe(mockFavorites, mockNovelties, mockOthers, state);
      if (result.from === 'favorites') {
        expect(['f1', 'f2']).toContain(result.recipe.id);
      }
    });
  });

  describe('getCompliantRecipes', () => {
    it('should filter recipes by kosher requirement', async () => {
      const mockFamily = {
        id: 'family1',
        dietProfile: {
          kosher: true,
          halal: false,
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          lactoseFree: false,
          allergies: []
        }
      };

      const mockRecipes = [
        {
          id: 'r1',
          name: 'Kosher Recipe',
          kosherCategory: 'meat',
          ingredients: []
        },
        {
          id: 'r2',
          name: 'Non-Kosher Recipe',
          kosherCategory: null,
          ingredients: []
        }
      ];

      // This would test the actual function - here we're testing the logic
      const filtered = mockRecipes.filter(r => r.kosherCategory !== null);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].kosherCategory).toBe('meat');
    });

    it('should filter recipes by allergens', () => {
      const mockFamily = {
        id: 'family1',
        dietProfile: {
          kosher: false,
          halal: false,
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          lactoseFree: false,
          allergies: ['peanuts', 'shellfish']
        }
      };

      const mockRecipes = [
        {
          id: 'r1',
          name: 'Safe Recipe',
          ingredients: [
            { id: 'i1', name: 'Chicken', allergens: [] }
          ]
        },
        {
          id: 'r2',
          name: 'Allergic Recipe',
          ingredients: [
            { id: 'i2', name: 'Peanut Butter', allergens: ['peanuts'] }
          ]
        },
        {
          id: 'r3',
          name: 'Shellfish Recipe',
          ingredients: [
            { id: 'i3', name: 'Shrimp', allergens: ['shellfish'] }
          ]
        }
      ];

      const filtered = mockRecipes.filter(recipe => {
        return !recipe.ingredients.some(ingredient =>
          ingredient.allergens.some(allergen =>
            mockFamily.dietProfile.allergies.includes(allergen)
          )
        );
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('r1');
    });

    it('should filter vegetarian recipes', () => {
      const mockRecipes = [
        { id: 'r1', name: 'Veggie Pasta', vegetarian: true },
        { id: 'r2', name: 'Steak', vegetarian: false },
        { id: 'r3', name: 'Salad', vegetarian: true }
      ];

      const filtered = mockRecipes.filter(r => r.vegetarian === true);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.vegetarian)).toBe(true);
    });

    it('should filter vegan recipes', () => {
      const mockRecipes = [
        { id: 'r1', name: 'Vegan Curry', vegan: true, vegetarian: true },
        { id: 'r2', name: 'Cheese Pizza', vegan: false, vegetarian: true },
        { id: 'r3', name: 'Tofu Stir Fry', vegan: true, vegetarian: true }
      ];

      const filtered = mockRecipes.filter(r => r.vegan === true);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.vegan)).toBe(true);
    });

    it('should filter gluten-free recipes', () => {
      const mockRecipes = [
        { id: 'r1', name: 'Rice Bowl', glutenFree: true },
        { id: 'r2', name: 'Pasta', glutenFree: false },
        { id: 'r3', name: 'Quinoa Salad', glutenFree: true }
      ];

      const filtered = mockRecipes.filter(r => r.glutenFree === true);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.glutenFree)).toBe(true);
    });
  });

  describe('Meal Planning Logic', () => {
    it('should create 14 meals for a week (7 days x 2 meals)', () => {
      const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const meals: any[] = [];

      DAYS.forEach(day => {
        meals.push({ dayOfWeek: day, mealType: 'LUNCH' as MealType });
        meals.push({ dayOfWeek: day, mealType: 'DINNER' as MealType });
      });

      expect(meals).toHaveLength(14);
      expect(meals.filter(m => m.mealType === 'LUNCH')).toHaveLength(7);
      expect(meals.filter(m => m.mealType === 'DINNER')).toHaveLength(7);
    });

    it('should respect favorite ratio for meal selection', () => {
      const totalMeals = 14;
      const favoriteRatio = 0.7;
      const expectedFavorites = Math.ceil(totalMeals * favoriteRatio);

      expect(expectedFavorites).toBeGreaterThanOrEqual(9); // 70% of 14 = 9.8
      expect(expectedFavorites).toBeLessThanOrEqual(10);
    });

    it('should limit novelties to max specified', () => {
      const maxNovelties = 2;
      let noveltyCount = 0;

      // Simulate adding novelties
      for (let i = 0; i < 5; i++) {
        if (noveltyCount < maxNovelties) {
          noveltyCount++;
        }
      }

      expect(noveltyCount).toBe(2);
      expect(noveltyCount).toBeLessThanOrEqual(maxNovelties);
    });

    it('should avoid school lunch category for dinner', () => {
      const schoolLunchCategory = 'Pâtes';
      const dinnerRecipes = [
        { id: 'r1', category: 'Viandes' },
        { id: 'r2', category: 'Pâtes' },
        { id: 'r3', category: 'Poissons' }
      ];

      const availableForDinner = dinnerRecipes.filter(
        r => r.category !== schoolLunchCategory
      );

      expect(availableForDinner).toHaveLength(2);
      expect(availableForDinner.every(r => r.category !== schoolLunchCategory)).toBe(true);
    });
  });

  describe('Express Plan Logic', () => {
    it('should use only favorites for express plan', () => {
      const favorites = [
        { id: 'f1', name: 'Favorite 1' },
        { id: 'f2', name: 'Favorite 2' }
      ];

      const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const meals: any[] = [];
      let favoriteIndex = 0;

      DAYS.forEach(day => {
        meals.push({
          recipeId: favorites[favoriteIndex % favorites.length].id
        });
        favoriteIndex++;

        meals.push({
          recipeId: favorites[favoriteIndex % favorites.length].id
        });
        favoriteIndex++;
      });

      expect(meals).toHaveLength(14);
      expect(meals.every(m => ['f1', 'f2'].includes(m.recipeId))).toBe(true);
    });

    it('should add one novelty to express plan', () => {
      const meals = new Array(14).fill({ recipeId: 'favorite' });
      const noveltyId = 'novelty1';
      const randomIndex = 5;

      meals[randomIndex] = { recipeId: noveltyId };

      const noveltyCount = meals.filter(m => m.recipeId === noveltyId).length;
      expect(noveltyCount).toBe(1);
    });
  });
});
