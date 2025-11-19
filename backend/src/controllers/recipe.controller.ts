import { Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const createRecipeSchema = z.object({
  title: z.string().min(1),
  titleEn: z.string().optional(),
  description: z.string().optional(),
  prepTime: z.number().min(0),
  cookTime: z.number().min(0),
  difficulty: z.number().min(1).max(5).optional(),
  kidsRating: z.number().min(1).max(5).optional(),
  kosherCategory: z.enum(['meat', 'dairy', 'parve']).optional(),
  halalFriendly: z.boolean().optional(),
  glutenFree: z.boolean().optional(),
  lactoseFree: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  pescatarian: z.boolean().optional(),
  category: z.string(),
  mealType: z.array(z.string()),
  cuisine: z.string().optional(),
  season: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  servings: z.number().optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    nameEn: z.string().optional(),
    quantity: z.number(),
    unit: z.string(),
    category: z.string(),
    containsGluten: z.boolean().optional(),
    containsLactose: z.boolean().optional(),
    allergens: z.array(z.string()).optional(),
    alternatives: z.array(z.string()).optional()
  })),
  instructions: z.array(z.object({
    stepNumber: z.number(),
    text: z.string(),
    textEn: z.string().optional(),
    duration: z.number().optional()
  })),
  familyId: z.string().optional()
});

// Component-based recipe creation schema
const createComponentBasedRecipeSchema = z.object({
  familyId: z.string(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  nameNl: z.string().optional(),
  description: z.string().max(500).optional(),
  servings: z.number().min(1).max(12).optional().default(4),
  mealTypes: z.array(z.string()).min(1),
  components: z.array(z.object({
    componentId: z.string(),
    quantity: z.number().positive(),
    unit: z.string().min(1).optional()
  })).min(1)
});

export const createRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = createRecipeSchema.parse(req.body);

    const totalTime = data.prepTime + data.cookTime;

    const recipe = await prisma.recipe.create({
      data: {
        ...data,
        totalTime,
        ingredients: {
          create: data.ingredients.map((ing, idx) => ({
            ...ing,
            order: idx
          }))
        },
        instructions: {
          create: data.instructions
        }
      },
      include: {
        ingredients: true,
        instructions: {
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { recipe }
    });
  }
);

/**
 * Create a component-based recipe directly in the recipe section
 * OBU-109: Add the possibility to create recipes based on components
 */
export const createComponentBasedRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Validate request data
    const data = createComponentBasedRecipeSchema.parse(req.body);

    // Fetch components to validate they exist and get their properties
    const componentIds = data.components.map(c => c.componentId);
    const components = await prisma.foodComponent.findMany({
      where: { id: { in: componentIds } }
    });

    // Verify all component IDs were found
    if (components.length !== componentIds.length) {
      const foundIds = components.map(c => c.id);
      const missingIds = componentIds.filter(id => !foundIds.includes(id));
      throw new AppError(
        `Component IDs not found: ${missingIds.join(', ')}`,
        400
      );
    }

    // Auto-detect dietary properties
    // Recipe is only marked as vegetarian/vegan/etc if ALL components meet the criteria
    const isVegetarian = components.every(c => c.vegetarian);
    const isVegan = components.every(c => c.vegan);
    const isPescatarian = components.every(c => c.pescatarian || c.vegetarian);
    const isGlutenFree = components.every(c => c.glutenFree);
    const isLactoseFree = components.every(c => c.lactoseFree);
    const isHalalFriendly = components.every(c => c.halalFriendly);

    // Determine kosher category (meat, dairy, or parve)
    const hasKosher = components.every(c => c.kosherCategory !== null);
    let kosherCategory: string | null = null;
    if (hasKosher) {
      const hasMeat = components.some(c => c.kosherCategory === 'meat');
      const hasDairy = components.some(c => c.kosherCategory === 'dairy');
      if (hasMeat && hasDairy) {
        kosherCategory = null; // Mixing meat and dairy is not kosher
      } else if (hasMeat) {
        kosherCategory = 'meat';
      } else if (hasDairy) {
        kosherCategory = 'dairy';
      } else {
        kosherCategory = 'parve';
      }
    }

    // Auto-estimate timing
    const prepTime = 15; // Standard prep time for component-based recipes
    const cookTime = 25; // Standard cook time
    const totalTime = prepTime + cookTime;

    // Create recipe and ingredients in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create the recipe
      const recipe = await tx.recipe.create({
        data: {
          title: data.name,
          titleEn: data.nameEn || data.name,
          description: data.description,
          familyId: data.familyId,
          isComponentBased: true,
          prepTime,
          cookTime,
          totalTime,
          servings: data.servings || 4,
          difficulty: 2, // Medium difficulty for component-based recipes
          cuisine: 'other',
          category: 'other',
          mealType: data.mealTypes.map(mt => mt.toLowerCase()),
          season: ['all'],
          // Auto-detected dietary properties
          vegetarian: isVegetarian,
          vegan: isVegan,
          pescatarian: isPescatarian,
          glutenFree: isGlutenFree,
          lactoseFree: isLactoseFree,
          halalFriendly: isHalalFriendly,
          kosherCategory: kosherCategory as any
        }
      });

      // Create map of components for quick lookup
      const componentMap = new Map(components.map(c => [c.id, c]));

      // Create ingredients from components
      const ingredientsData = data.components.map((compData, index) => {
        const component = componentMap.get(compData.componentId);
        if (!component) {
          throw new AppError(`Component ${compData.componentId} not found in map`, 500);
        }

        return {
          recipeId: recipe.id,
          name: component.name,
          nameEn: component.nameEn || component.name,
          quantity: compData.quantity,
          unit: compData.unit || component.unit, // Use component's unit if not provided
          category: component.shoppingCategory,
          order: index,
          allergens: component.allergens || [],
          containsGluten: !component.glutenFree,
          containsLactose: !component.lactoseFree
        };
      });

      await tx.ingredient.createMany({
        data: ingredientsData
      });

      return recipe;
    });

    // Fetch complete recipe with ingredients
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: result.id },
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Component-based recipe created successfully',
      data: { recipe: completeRecipe }
    });
  }
);

export const getRecipes = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const {
      familyId,
      category,
      mealType,
      maxTime,
      kosher,
      halal,
      vegetarian,
      vegan,
      glutenFree,
      lactoseFree,
      favorites,
      search,
      language
    } = req.query;

    const where: any = {};

    if (familyId) where.familyId = familyId as string;
    if (category) where.category = category as string;
    if (mealType) where.mealType = { has: mealType as string };
    if (maxTime) where.totalTime = { lte: parseInt(maxTime as string) };
    if (kosher === 'true') where.kosherCategory = { not: null };
    if (halal === 'true') where.halalFriendly = true;
    if (vegetarian === 'true') where.vegetarian = true;
    if (vegan === 'true') where.vegan = true;
    if (glutenFree === 'true') where.glutenFree = true;
    if (lactoseFree === 'true') where.lactoseFree = true;
    if (favorites === 'true') where.isFavorite = true;

    // Handle search - search in the appropriate language field (accent-insensitive)
    if (search) {
      const searchTerm = search as string;
      const lang = language as string || 'fr';

      // Fetch all recipes first if there are other filters, then filter by search
      // This is more reliable than trying to use complex Prisma queries
      let allRecipes = await prisma.recipe.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: {
          ingredients: true,
          instructions: {
            orderBy: { stepNumber: 'asc' }
          }
        },
        orderBy: [
          { isFavorite: 'desc' },
          { avgRating: 'desc' },
          { timesCooked: 'desc' }
        ]
      });

      // Normalize function to remove accents for comparison
      const normalize = (str: string | null): string => {
        if (!str) return '';
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      };

      const normalizedSearch = normalize(searchTerm);

      // Filter recipes based on accent-insensitive search
      const filteredRecipes = allRecipes.filter((recipe: typeof allRecipes[number]) => {
        if (lang === 'en') {
          // Search in English fields first, then fall back to French
          const searchFields = [
            recipe.titleEn,
            recipe.descriptionEn,
            recipe.title,
            recipe.description
          ];
          return searchFields.some(field =>
            normalize(field).includes(normalizedSearch)
          );
        } else {
          // Search in French fields
          const searchFields = [recipe.title, recipe.description];
          return searchFields.some(field =>
            normalize(field).includes(normalizedSearch)
          );
        }
      });

      res.json({
        status: 'success',
        data: { recipes: filteredRecipes, count: filteredRecipes.length }
      });
      return;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: true,
        instructions: {
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: [
        { isFavorite: 'desc' },
        { avgRating: 'desc' },
        { timesCooked: 'desc' }
      ]
    });

    res.json({
      status: 'success',
      data: { recipes, count: recipes.length }
    });
  }
);

export const getRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { stepNumber: 'asc' }
        },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!recipe) {
      throw new AppError('Recipe not found', 404);
    }

    res.json({
      status: 'success',
      data: { recipe }
    });
  }
);

export const updateRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...data,
        totalTime: data.prepTime && data.cookTime ? data.prepTime + data.cookTime : undefined
      },
      include: {
        ingredients: true,
        instructions: true
      }
    });

    res.json({
      status: 'success',
      data: { recipe }
    });
  }
);

export const deleteRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.recipe.delete({ where: { id } });

    res.json({
      status: 'success',
      message: 'Recipe deleted successfully'
    });
  }
);

export const getWeeklyCatalog = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { weekStartDate } = req.query;

    // Get family's diet profile
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: { dietProfile: true }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    const dietProfile = family.dietProfile;

    // Build filters based on diet profile
    const where: any = {
      OR: [
        { familyId },
        { familyId: null } // Public recipes
      ]
    };

    if (dietProfile.kosher) {
      where.kosherCategory = { not: null };
    }

    if (dietProfile.halal) {
      where.halalFriendly = true;
    }

    if (dietProfile.vegetarian) {
      where.vegetarian = true;
    }

    if (dietProfile.vegan) {
      where.vegan = true;
    }

    if (dietProfile.glutenFree) {
      where.glutenFree = true;
    }

    if (dietProfile.lactoseFree) {
      where.lactoseFree = true;
    }

    // Get recipes
    const allRecipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: true
      }
    });

    // Filter by allergies
    let filteredRecipes = allRecipes;
    if (dietProfile.allergies.length > 0) {
      filteredRecipes = allRecipes.filter((recipe: any) => {
        return !recipe.ingredients.some((ingredient: any) =>
          ingredient.allergens.some((allergen: any) =>
            dietProfile.allergies.includes(allergen)
          )
        );
      });
    }

    // Separate favorites and new recipes
    const favorites = filteredRecipes.filter((r: any) => r.isFavorite);
    const novelties = filteredRecipes.filter((r: any) => r.isNovelty);
    const others = filteredRecipes.filter((r: any) => !r.isFavorite && !r.isNovelty);

    // Calculate counts based on diet profile settings
    const favoritesCount = Math.ceil(12 * dietProfile.favoriteRatio);
    const noveltiesCount = Math.min(dietProfile.maxNovelties, 2);
    const othersCount = 12 - favoritesCount - noveltiesCount;

    // Build catalog (12-20 recipes)
    const catalog = [
      ...favorites.slice(0, favoritesCount),
      ...novelties.slice(0, noveltiesCount),
      ...others.slice(0, othersCount)
    ];

    // Shuffle to add variety
    const shuffled = catalog.sort(() => Math.random() - 0.5);

    res.json({
      status: 'success',
      data: {
        catalog: shuffled,
        counts: {
          favorites: favoritesCount,
          novelties: noveltiesCount,
          total: shuffled.length
        }
      }
    });
  }
);

export const toggleFavorite = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { isFavorite: true }
    });

    if (!recipe) {
      throw new AppError('Recipe not found', 404);
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: { isFavorite: !recipe.isFavorite }
    });

    res.json({
      status: 'success',
      data: { recipe: updated }
    });
  }
);

export const submitFeedback = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { mealId, rating, kidsLiked, tooLong, comment } = req.body;

    const feedback = await prisma.feedback.create({
      data: {
        recipeId: id,
        mealId,
        rating,
        kidsLiked,
        tooLong,
        comment
      }
    });

    // Update recipe stats
    const avgRating = await prisma.feedback.aggregate({
      where: { recipeId: id },
      _avg: { rating: true }
    });

    await prisma.recipe.update({
      where: { id },
      data: {
        avgRating: avgRating._avg.rating || undefined,
        timesCooked: { increment: 1 }
      }
    });

    res.json({
      status: 'success',
      data: { feedback }
    });
  }
);
