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
            mealComponents: {
              include: {
                component: true
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
    const { weekStartDate, templateId } = req.body;

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        dietProfile: true,
        members: true,
        defaultTemplate: true
      }
    });

    if (!family) {
      throw new AppError('Family not found', 404);
    }

    // Get meal schedule template
    let template;
    if (templateId) {
      template = await prisma.mealScheduleTemplate.findFirst({
        where: {
          id: templateId,
          OR: [
            { isSystem: true },
            { familyId }
          ]
        }
      });
      if (!template) {
        throw new AppError('Template not found', 404);
      }
    } else {
      // Use family default or fall back to system default
      template = family.defaultTemplate;
      if (!template) {
        // Get "Standard Work Week" system template as fallback
        template = await prisma.mealScheduleTemplate.findFirst({
          where: { isSystem: true, name: 'Standard Work Week' }
        });
      }
    }

    if (!template) {
      throw new AppError('No meal schedule template found', 404);
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

    // Get compliant components
    const components = await getCompliantComponents(family);
    const proteins = components.filter((c: any) => c.category === 'PROTEIN');
    const vegetables = components.filter((c: any) => c.category === 'VEGETABLE');
    const carbs = components.filter((c: any) => c.category === 'CARB');
    console.log('🔍 DEBUG: Components loaded:', { total: components.length, proteins: proteins.length, vegetables: vegetables.length, carbs: carbs.length });

    // Parse template schedule
    const scheduleData = template.schedule as any[];

    // Calculate total meals from template
    const totalMeals = scheduleData.reduce((sum, day) => sum + day.mealTypes.length, 0);
    const dietProfile = family.dietProfile;
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
        status: 'DRAFT',
        templateId: template.id
      }
    });

    // Generate meals based on template schedule
    const meals = [];
    const mealComponentsToCreate: any[] = [];
    let favoriteIndex = 0;
    let noveltyIndex = 0;
    let otherIndex = 0;
    let noveltyCount = 0;
    let mealIndex = 0;
    const recentProteins: string[] = [];

    for (const scheduleItem of scheduleData) {
      const day = scheduleItem.dayOfWeek as DayOfWeek;
      const dayIndex = DAYS.indexOf(day);
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + dayIndex);

      // Check for school menu for this day
      const schoolMenu = schoolMenus.find((sm: any) =>
        sm.date.toDateString() === dayDate.toDateString() && sm.mealType === 'LUNCH'
      );

      // Generate each meal type specified in the schedule
      for (const mealType of scheduleItem.mealTypes) {
        // If it's lunch and there's a school menu, create school meal instead
        if (mealType === 'LUNCH' && schoolMenu) {
          meals.push({
            weeklyPlanId: weeklyPlan.id,
            dayOfWeek: day,
            mealType: mealType as MealType,
            isSchoolMeal: true,
            portions: family.members.length
          });
        } else {
          // Decide if this meal should be component-based (~30% chance)
          const shouldBeComponentBased = Math.random() < 0.3 &&
            proteins.length > 0 && vegetables.length > 0 && carbs.length > 0;

          console.log(`🎲 Meal ${day} ${mealType}: shouldBeComponentBased=${shouldBeComponentBased}, proteins=${proteins.length}, vegetables=${vegetables.length}, carbs=${carbs.length}`);

          if (shouldBeComponentBased) {
            console.log('✅ Creating component-based meal!');
            // Create component-based meal
            try {
              const selectedComponents = selectMealComponents(
                proteins,
                vegetables,
                carbs,
                recentProteins
              );

              // Track recent proteins (keep last 2)
              const proteinComponent = selectedComponents.find(c => c.role === 'MAIN_PROTEIN');
              if (proteinComponent) {
                recentProteins.push(proteinComponent.id);
                if (recentProteins.length > 2) {
                  recentProteins.shift();
                }
              }

              meals.push({
                weeklyPlanId: weeklyPlan.id,
                dayOfWeek: day,
                mealType: mealType as MealType,
                recipeId: null,
                portions: family.members.length,
                mealIndex // Temporary index to match with components
              });

              // Store components to create after meals are created
              mealComponentsToCreate.push({
                mealIndex,
                components: selectedComponents
              });

              mealIndex++;
            } catch (error) {
              // Fall back to recipe-based if component selection fails
              const recipe = selectRecipe(favorites, novelties, others, {
                favoriteIndex,
                noveltyIndex,
                otherIndex,
                noveltyCount,
                maxNovelties: noveltyMeals,
                favoriteRatio: dietProfile.favoriteRatio,
                avoidCategory: (mealType === 'DINNER' && schoolMenu?.category) ? schoolMenu.category : undefined
              });

              if (recipe.from === 'favorites') favoriteIndex++;
              if (recipe.from === 'novelties') { noveltyIndex++; noveltyCount++; }
              if (recipe.from === 'others') otherIndex++;

              meals.push({
                weeklyPlanId: weeklyPlan.id,
                dayOfWeek: day,
                mealType: mealType as MealType,
                recipeId: recipe.recipe.id,
                portions: family.members.length
              });
            }
          } else {
            // Create recipe-based meal
            const recipe = selectRecipe(favorites, novelties, others, {
              favoriteIndex,
              noveltyIndex,
              otherIndex,
              noveltyCount,
              maxNovelties: noveltyMeals,
              favoriteRatio: dietProfile.favoriteRatio,
              avoidCategory: (mealType === 'DINNER' && schoolMenu?.category) ? schoolMenu.category : undefined
            });

            if (recipe.from === 'favorites') favoriteIndex++;
            if (recipe.from === 'novelties') { noveltyIndex++; noveltyCount++; }
            if (recipe.from === 'others') otherIndex++;

            meals.push({
              weeklyPlanId: weeklyPlan.id,
              dayOfWeek: day,
              mealType: mealType as MealType,
              recipeId: recipe.recipe.id,
              portions: family.members.length
            });
          }
        }
      }
    }

    // Create all meals first
    const createdMeals = await prisma.$transaction(
      meals.map((meal: any) => {
        const { mealIndex: _, ...mealData } = meal;
        return prisma.meal.create({ data: mealData });
      })
    );

    // Create meal components for component-based meals
    if (mealComponentsToCreate.length > 0) {
      const componentData: any[] = [];

      mealComponentsToCreate.forEach(({ mealIndex: idx, components }) => {
        const meal = createdMeals[idx];
        components.forEach((comp: any) => {
          componentData.push({
            mealId: meal.id,
            componentId: comp.id,
            quantity: comp.defaultQuantity,
            unit: comp.unit,
            role: comp.role
          });
        });
      });

      if (componentData.length > 0) {
        await prisma.mealComponent.createMany({ data: componentData });
      }
    }

    // Fetch complete plan
    const completePlan = await prisma.weeklyPlan.findUnique({
      where: { id: weeklyPlan.id },
      include: {
        meals: {
          include: {
            recipe: true,
            mealComponents: {
              include: {
                component: true
              }
            }
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

// Add single meal to draft plan
export const addMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId } = req.params;
    const { dayOfWeek, mealType, recipeId } = req.body;

    // Verify plan exists and is in DRAFT status
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: { family: { include: { members: true } } }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    if (plan.status !== 'DRAFT') {
      throw new AppError('Can only add meals to draft plans', 400);
    }

    // Check if meal already exists for this day/mealType
    const existingMeal = await prisma.meal.findFirst({
      where: {
        weeklyPlanId: planId,
        dayOfWeek,
        mealType
      }
    });

    if (existingMeal) {
      throw new AppError('A meal already exists for this day and meal type', 400);
    }

    // Create the meal
    const meal = await prisma.meal.create({
      data: {
        weeklyPlanId: planId,
        dayOfWeek,
        mealType,
        recipeId: recipeId || null,
        portions: plan.family.members.length
      },
      include: {
        recipe: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: { meal }
    });
  }
);

// Remove meal from draft plan
export const removeMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;

    // Verify plan exists and is in DRAFT status
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    if (plan.status !== 'DRAFT') {
      throw new AppError('Can only remove meals from draft plans', 400);
    }

    // Verify meal belongs to this plan
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        weeklyPlanId: planId
      }
    });

    if (!meal) {
      throw new AppError('Meal not found or does not belong to this plan', 404);
    }

    // Ensure at least one meal remains
    const mealCount = await prisma.meal.count({
      where: { weeklyPlanId: planId }
    });

    if (mealCount <= 1) {
      throw new AppError('Cannot remove the last meal from a plan', 400);
    }

    await prisma.meal.delete({
      where: { id: mealId }
    });

    res.json({
      status: 'success',
      message: 'Meal removed successfully'
    });
  }
);

// Switch template for draft plan (regenerates all meals)
// Save component-based meal as a reusable recipe
export const saveComponentMealAsRecipe = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;
    const { recipeName, recipeNameEn } = req.body;

    // Fetch meal with components
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        mealComponents: {
          include: {
            component: true
          }
        },
        weeklyPlan: {
          include: {
            family: true
          }
        }
      }
    });

    if (!meal) {
      throw new AppError('Meal not found', 404);
    }

    if (meal.weeklyPlanId !== planId) {
      throw new AppError('Meal does not belong to this plan', 400);
    }

    if (meal.recipeId) {
      throw new AppError('Meal already has a recipe. Cannot save component-based meal that has been converted to recipe.', 400);
    }

    if (!meal.mealComponents || meal.mealComponents.length === 0) {
      throw new AppError('Meal has no components to save as recipe', 400);
    }

    // Generate recipe name if not provided
    const componentNames = meal.mealComponents.map(mc => mc.component.name);
    const componentNamesEn = meal.mealComponents.map(mc => mc.component.nameEn || mc.component.name);

    const defaultTitle = componentNames.join(' avec ');
    const defaultTitleEn = componentNamesEn.join(' with ');

    // Estimate cooking time based on components
    const prepTime = 15; // Standard prep time for component-based meals
    const cookTime = 25; // Estimated max cook time
    const totalTime = prepTime + cookTime;

    // Create recipe and ingredients in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the recipe
      const recipe = await tx.recipe.create({
        data: {
          title: recipeName || defaultTitle,
          titleEn: recipeNameEn || defaultTitleEn,
          description: `Recette à base de composants: ${defaultTitle}`,
          descriptionEn: `Component-based recipe: ${defaultTitleEn}`,
          familyId: meal.weeklyPlan.familyId,
          isComponentBased: true,
          prepTime,
          cookTime,
          totalTime,
          servings: meal.portions,
          difficulty: 2, // Medium difficulty (1-5 scale)
          cuisine: 'other',
          category: 'other',
          mealType: [meal.mealType.toLowerCase()],
          season: ['all']
        }
      });

      // Create ingredients from meal components
      const ingredientsData = meal.mealComponents.map((mc, index) => ({
        recipeId: recipe.id,
        name: mc.component.name,
        nameEn: mc.component.nameEn || mc.component.name,
        quantity: mc.quantity,
        unit: mc.unit,
        category: mc.component.shoppingCategory,
        order: index,
        allergens: mc.component.allergens || []
      }));

      await tx.ingredient.createMany({
        data: ingredientsData
      });

      // Update meal to use the new recipe
      await tx.meal.update({
        where: { id: mealId },
        data: {
          recipeId: recipe.id
        }
      });

      // Optionally: Delete meal components since meal now uses recipe
      await tx.mealComponent.deleteMany({
        where: { mealId }
      });

      return recipe;
    });

    // Fetch complete recipe with ingredients
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: result.id },
      include: {
        ingredients: true
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Component-based meal saved as recipe',
      data: { recipe: completeRecipe }
    });
  }
);

export const switchTemplate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId } = req.params;
    const { templateId } = req.body;

    // Verify plan exists and is in DRAFT status
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: {
        family: {
          include: {
            dietProfile: true,
            members: true
          }
        }
      }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    if (plan.status !== 'DRAFT') {
      throw new AppError('Can only switch templates for draft plans', 400);
    }

    // Verify template exists and is accessible
    const template = await prisma.mealScheduleTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { isSystem: true },
          { familyId: plan.familyId }
        ]
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    // Delete existing meals
    await prisma.meal.deleteMany({
      where: { weeklyPlanId: planId }
    });

    // Get data needed for meal generation
    const weekStart = new Date(plan.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const schoolMenus = await prisma.schoolMenu.findMany({
      where: {
        familyId: plan.familyId,
        date: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    });

    const recipes = await getCompliantRecipes(plan.family);
    const favorites = recipes.filter((r: any) => r.isFavorite);
    const novelties = recipes.filter((r: any) => r.isNovelty);
    const others = recipes.filter((r: any) => !r.isFavorite && !r.isNovelty);

    // Parse template schedule
    const scheduleData = template.schedule as any[];
    const totalMeals = scheduleData.reduce((sum: number, day: any) => sum + day.mealTypes.length, 0);
    const dietProfile = plan.family.dietProfile;
    const favoriteMeals = Math.ceil(totalMeals * dietProfile.favoriteRatio);
    const noveltyMeals = Math.min(dietProfile.maxNovelties, 2);

    // Generate new meals
    const meals = [];
    let favoriteIndex = 0;
    let noveltyIndex = 0;
    let otherIndex = 0;
    let noveltyCount = 0;

    for (const scheduleItem of scheduleData) {
      const day = scheduleItem.dayOfWeek as DayOfWeek;
      const dayIndex = DAYS.indexOf(day);
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + dayIndex);

      const schoolMenu = schoolMenus.find((sm: any) =>
        sm.date.toDateString() === dayDate.toDateString() && sm.mealType === 'LUNCH'
      );

      for (const mealType of scheduleItem.mealTypes) {
        if (mealType === 'LUNCH' && schoolMenu) {
          meals.push({
            weeklyPlanId: plan.id,
            dayOfWeek: day,
            mealType: mealType as MealType,
            isSchoolMeal: true,
            portions: plan.family.members.length
          });
        } else {
          const recipe = selectRecipe(favorites, novelties, others, {
            favoriteIndex,
            noveltyIndex,
            otherIndex,
            noveltyCount,
            maxNovelties: noveltyMeals,
            favoriteRatio: dietProfile.favoriteRatio,
            avoidCategory: (mealType === 'DINNER' && schoolMenu?.category) ? schoolMenu.category : undefined
          });

          if (recipe.from === 'favorites') favoriteIndex++;
          if (recipe.from === 'novelties') { noveltyIndex++; noveltyCount++; }
          if (recipe.from === 'others') otherIndex++;

          meals.push({
            weeklyPlanId: plan.id,
            dayOfWeek: day,
            mealType: mealType as MealType,
            recipeId: recipe.recipe.id,
            portions: plan.family.members.length
          });
        }
      }
    }

    await prisma.meal.createMany({ data: meals });

    // Update plan with new template
    const updatedPlan = await prisma.weeklyPlan.update({
      where: { id: planId },
      data: { templateId },
      include: {
        meals: {
          include: {
            recipe: true
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      }
    });

    res.json({
      status: 'success',
      data: { plan: updatedPlan }
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

// ============================================
// Component-Based Meal Generation Helpers
// ============================================

/**
 * Filter components based on family diet profile
 */
async function getCompliantComponents(family: any) {
  const dietProfile = family.dietProfile;
  const where: any = {
    OR: [
      { isSystemComponent: true },
      { familyId: family.id }
    ]
  };

  if (dietProfile.kosher) where.kosherCategory = { not: null };
  if (dietProfile.halal) where.halalFriendly = true;
  if (dietProfile.vegetarian) where.vegetarian = true;
  if (dietProfile.vegan) where.vegan = true;
  if (dietProfile.glutenFree) where.glutenFree = true;
  if (dietProfile.lactoseFree) where.lactoseFree = true;

  const components = await prisma.foodComponent.findMany({
    where
  });

  // Filter by allergies
  if (dietProfile.allergies.length > 0) {
    return components.filter((component: any) => {
      return !component.allergens.some((allergen: string) =>
        dietProfile.allergies.includes(allergen)
      );
    });
  }

  return components;
}

/**
 * Select components for a component-based meal
 * Returns 1 protein + 1-2 vegetables + 1 carb
 */
function selectMealComponents(
  proteins: any[],
  vegetables: any[],
  carbs: any[],
  recentProteins: string[] = []
): any[] {
  if (proteins.length === 0 || vegetables.length === 0 || carbs.length === 0) {
    throw new Error('Insufficient components available');
  }

  // Select protein (avoid recent ones if possible)
  const availableProteins = proteins.filter(p => !recentProteins.includes(p.id));
  const proteinPool = availableProteins.length > 0 ? availableProteins : proteins;
  const selectedProtein = proteinPool[Math.floor(Math.random() * proteinPool.length)];

  // Select 1-2 vegetables randomly
  const numVegetables = Math.random() < 0.6 ? 2 : 1; // 60% chance for 2 vegetables
  const selectedVegetables: any[] = [];
  const vegetablesCopy = [...vegetables];

  for (let i = 0; i < Math.min(numVegetables, vegetables.length); i++) {
    const randomIndex = Math.floor(Math.random() * vegetablesCopy.length);
    selectedVegetables.push(vegetablesCopy.splice(randomIndex, 1)[0]);
  }

  // Select carb
  const selectedCarb = carbs[Math.floor(Math.random() * carbs.length)];

  return [
    { ...selectedProtein, role: 'MAIN_PROTEIN' },
    ...selectedVegetables.map((v, i) => ({
      ...v,
      role: i === 0 ? 'PRIMARY_VEGETABLE' : 'SECONDARY_VEGETABLE'
    })),
    { ...selectedCarb, role: 'BASE_CARB' }
  ];
}
