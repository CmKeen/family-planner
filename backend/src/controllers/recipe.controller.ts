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
      favorites
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
