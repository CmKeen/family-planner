import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

// Type aliases for Prisma enums
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const createWeeklyPlan = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId, weekStartDate } = req.body;

    const date = new Date(weekStartDate);
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();

    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        familyId,
        weekStartDate: date,
        weekNumber,
        year,
        status: 'DRAFT'
      },
      include: {
        meals: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: { weeklyPlan }
    });
  }
);

export const getWeeklyPlans = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { limit = 10 } = req.query;

    const plans = await prisma.weeklyPlan.findMany({
      where: { familyId },
      include: {
        meals: {
          include: {
            recipe: true,
            attendance: true,
            guests: true,
            votes: true
          }
        }
      },
      orderBy: { weekStartDate: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({
      status: 'success',
      data: { plans, count: plans.length }
    });
  }
);

export const getWeeklyPlan = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      include: {
        family: {
          include: {
            dietProfile: true,
            members: true
          }
        },
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: true,
                instructions: true
              }
            },
            attendance: {
              include: {
                member: true
              }
            },
            guests: true,
            votes: {
              include: {
                member: true
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        },
        wishes: true
      }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    res.json({
      status: 'success',
      data: { plan }
    });
  }
);

export const generateAutoPlan = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { weekStartDate } = req.body;

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        dietProfile: true,
        members: true
      }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    // Get school menus for the week
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const schoolMenus = await prisma.schoolMenu.findMany({
      where: {
        familyId,
        date: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    });

    // Get compliant recipes
    const recipes = await getCompliantRecipes(family);

    // Separate favorites and novelties
    const favorites = recipes.filter((r: any) => r.isFavorite);
    const novelties = recipes.filter((r: any) => r.isNovelty);
    const others = recipes.filter((r: any) => !r.isFavorite && !r.isNovelty);

    // Calculate meal counts
    const dietProfile = family.dietProfile;
    const totalMeals = 14; // 7 days * 2 meals (lunch + dinner)
    const favoriteMeals = Math.ceil(totalMeals * dietProfile.favoriteRatio);
    const noveltyMeals = Math.min(dietProfile.maxNovelties, 2);

    // Create weekly plan
    const date = new Date(weekStartDate);
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();

    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        familyId,
        weekStartDate: date,
        weekNumber,
        year,
        status: 'DRAFT'
      }
    });

    // Generate meals
    const meals = [];
    let favoriteIndex = 0;
    let noveltyIndex = 0;
    let otherIndex = 0;
    let noveltyCount = 0;

    for (const day of DAYS) {
      const dayDate = new Date(weekStart);
      const dayIndex = DAYS.indexOf(day);
      dayDate.setDate(dayDate.getDate() + dayIndex);

      // Check for school menu
      const schoolMenu = schoolMenus.find((sm: any) =>
        sm.date.toDateString() === dayDate.toDateString() && sm.mealType === 'LUNCH'
      );

      // Lunch
      if (schoolMenu) {
        meals.push({
          weeklyPlanId: weeklyPlan.id,
          dayOfWeek: day,
          mealType: 'LUNCH' as MealType,
          isSchoolMeal: true,
          portions: family.members.length
        });
      } else {
        // Select recipe for lunch
        const recipe = selectRecipe(favorites, novelties, others, {
          favoriteIndex,
          noveltyIndex,
          otherIndex,
          noveltyCount,
          maxNovelties: noveltyMeals,
          favoriteRatio: dietProfile.favoriteRatio
        });

        if (recipe.from === 'favorites') favoriteIndex++;
        if (recipe.from === 'novelties') { noveltyIndex++; noveltyCount++; }
        if (recipe.from === 'others') otherIndex++;

        meals.push({
          weeklyPlanId: weeklyPlan.id,
          dayOfWeek: day,
          mealType: 'LUNCH' as MealType,
          recipeId: recipe.recipe.id,
          portions: family.members.length
        });
      }

      // Dinner - avoid duplicating school lunch category
      const dinnerRecipe = selectRecipe(favorites, novelties, others, {
        favoriteIndex,
        noveltyIndex,
        otherIndex,
        noveltyCount,
        maxNovelties: noveltyMeals,
        favoriteRatio: dietProfile.favoriteRatio,
        avoidCategory: schoolMenu?.category || undefined
      });

      if (dinnerRecipe.from === 'favorites') favoriteIndex++;
      if (dinnerRecipe.from === 'novelties') { noveltyIndex++; noveltyCount++; }
      if (dinnerRecipe.from === 'others') otherIndex++;

      meals.push({
        weeklyPlanId: weeklyPlan.id,
        dayOfWeek: day,
        mealType: 'DINNER' as MealType,
        recipeId: dinnerRecipe.recipe.id,
        portions: family.members.length
      });
    }

    // Create all meals
    await prisma.meal.createMany({ data: meals });

    // Fetch complete plan
    const completePlan = await prisma.weeklyPlan.findUnique({
      where: { id: weeklyPlan.id },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { plan: completePlan }
    });
  }
);

export const generateExpressPlan = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    const { weekStartDate } = req.body;

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        dietProfile: true,
        members: true
      }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    const recipes = await getCompliantRecipes(family);
    const favorites = recipes.filter((r: any) => r.isFavorite);
    const novelties = recipes.filter((r: any) => r.isNovelty);

    if (favorites.length === 0) {
      throw new AppError('No favorite recipes found. Please mark some recipes as favorites first.', 400);
    }

    const date = new Date(weekStartDate);
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();

    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        familyId,
        weekStartDate: date,
        weekNumber,
        year,
        status: 'DRAFT'
      }
    });

    const meals = [];
    let favoriteIndex = 0;

    for (const day of DAYS) {
      // Lunch: favorite
      meals.push({
        weeklyPlanId: weeklyPlan.id,
        dayOfWeek: day,
        mealType: 'LUNCH' as MealType,
        recipeId: favorites[favoriteIndex % favorites.length].id,
        portions: family.members.length
      });
      favoriteIndex++;

      // Dinner: favorite
      meals.push({
        weeklyPlanId: weeklyPlan.id,
        dayOfWeek: day,
        mealType: 'DINNER' as MealType,
        recipeId: favorites[favoriteIndex % favorites.length].id,
        portions: family.members.length
      });
      favoriteIndex++;
    }

    // Add 1 novelty randomly
    if (novelties.length > 0 && meals.length > 0) {
      const randomMealIndex = Math.floor(Math.random() * meals.length);
      meals[randomMealIndex].recipeId = novelties[0].id;
    }

    await prisma.meal.createMany({ data: meals });

    const completePlan = await prisma.weeklyPlan.findUnique({
      where: { id: weeklyPlan.id },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { plan: completePlan }
    });
  }
);

export const updateMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { recipeId, portions } = req.body;

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { recipeId, portions },
      include: {
        recipe: true
      }
    });

    res.json({
      status: 'success',
      data: { meal }
    });
  }
);

export const swapMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { newRecipeId } = req.body;

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { recipeId: newRecipeId },
      include: {
        recipe: true
      }
    });

    res.json({
      status: 'success',
      data: { meal }
    });
  }
);

export const lockMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { locked } = req.body;

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { locked }
    });

    res.json({
      status: 'success',
      data: { meal }
    });
  }
);

export const addAttendance = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { memberId, status } = req.body;

    const attendance = await prisma.attendance.upsert({
      where: {
        mealId_memberId: {
          mealId,
          memberId
        }
      },
      create: {
        mealId,
        memberId,
        status
      },
      update: {
        status
      }
    });

    res.json({
      status: 'success',
      data: { attendance }
    });
  }
);

export const addGuests = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { adults, children, note } = req.body;

    const guests = await prisma.guest.create({
      data: {
        mealId,
        adults: adults || 0,
        children: children || 0,
        note
      }
    });

    res.json({
      status: 'success',
      data: { guests }
    });
  }
);

export const addVote = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { memberId, type, comment } = req.body;

    const vote = await prisma.vote.upsert({
      where: {
        mealId_memberId: {
          mealId,
          memberId
        }
      },
      create: {
        mealId,
        memberId,
        type,
        comment
      },
      update: {
        type,
        comment
      }
    });

    res.json({
      status: 'success',
      data: { vote }
    });
  }
);

export const addWish = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId } = req.params;
    const { text, memberId } = req.body;

    const wish = await prisma.wish.create({
      data: {
        weeklyPlanId: planId,
        text,
        memberId
      }
    });

    res.json({
      status: 'success',
      data: { wish }
    });
  }
);

export const validatePlan = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId } = req.params;

    const plan = await prisma.weeklyPlan.update({
      where: { id: planId },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date()
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { plan }
    });
  }
);

// Helper functions
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

async function getCompliantRecipes(family: any) {
  const dietProfile = family.dietProfile;
  const where: any = {
    OR: [
      { familyId: family.id },
      { familyId: null }
    ]
  };

  if (dietProfile.kosher) where.kosherCategory = { not: null };
  if (dietProfile.halal) where.halalFriendly = true;
  if (dietProfile.vegetarian) where.vegetarian = true;
  if (dietProfile.vegan) where.vegan = true;
  if (dietProfile.glutenFree) where.glutenFree = true;
  if (dietProfile.lactoseFree) where.lactoseFree = true;

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      ingredients: true
    }
  });

  // Filter by allergies
  if (dietProfile.allergies.length > 0) {
    return recipes.filter((recipe: any) => {
      return !recipe.ingredients.some((ingredient: any) =>
        ingredient.allergens.some((allergen: any) =>
          dietProfile.allergies.includes(allergen)
        )
      );
    });
  }

  return recipes;
}

function selectRecipe(
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
) {
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
}
