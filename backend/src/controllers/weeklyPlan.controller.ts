import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';
import { logChange } from '../utils/auditLogger';
import { notificationService } from '../services/notification.service';
import { generateShoppingList as generateShoppingListService } from '../services/shoppingList.service';
import { log } from '../config/logger';
import { updateMealSchema } from '../validators/weeklyPlan.validators';

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

    // Send notification to family members
    if (req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true }
      });
      const createdByName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      await notificationService.notifyDraftPlanCreated(
        familyId,
        weeklyPlan.id,
        date,
        createdByName
      );
    }

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
    const startTime = Date.now();

    const plan = await prisma.weeklyPlan.findUnique({
      where: { id },
      select: {
        id: true,
        weekStartDate: true,
        weekNumber: true,
        year: true,
        status: true,
        cutoffDate: true,
        cutoffTime: true,
        allowCommentsAfterCutoff: true,
        validatedAt: true,
        createdAt: true,
        updatedAt: true,
        family: {
          select: {
            id: true,
            name: true,
            language: true,
            units: true,
            dietProfile: {
              select: {
                id: true,
                kosher: true,
                kosherType: true,
                halal: true,
                halalType: true,
                vegetarian: true,
                vegan: true,
                pescatarian: true,
                glutenFree: true,
                lactoseFree: true,
                allergies: true,
                favoriteRatio: true,
                maxNovelties: true
              }
            },
            members: {
              select: {
                id: true,
                name: true,
                role: true,
                age: true,
                portionFactor: true,
                aversions: true,
                favorites: true,
                canViewAuditLog: true
              }
            }
          }
        },
        meals: {
          select: {
            id: true,
            dayOfWeek: true,
            mealType: true,
            portions: true,
            locked: true,
            isSchoolMeal: true,
            isExternal: true,
            externalNote: true,
            isSkipped: true,
            skipReason: true,
            createdAt: true,
            updatedAt: true,
            recipe: {
              select: {
                id: true,
                title: true,
                titleEn: true,
                prepTime: true,
                cookTime: true,
                totalTime: true,
                category: true,
                cuisine: true,
                imageUrl: true,
                thumbnailUrl: true,
                isFavorite: true,
                isNovelty: true,
                isComponentBased: true,
                servings: true,
                // ✅ NO ingredients, NO instructions for list view
              }
            },
            mealComponents: {
              select: {
                id: true,
                quantity: true,
                unit: true,
                order: true,
                component: {
                  select: {
                    id: true,
                    name: true,
                    nameEn: true,
                    nameNl: true,
                    category: true,
                    unit: true
                  }
                }
              },
              orderBy: {
                order: 'asc'
              }
            },
            attendance: {
              select: {
                id: true,
                status: true,
                member: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            guests: {
              select: {
                id: true,
                adults: true,
                children: true,
                note: true
              }
            },
            votes: {
              select: {
                id: true,
                type: true,
                comment: true,
                createdAt: true,
                member: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        },
        wishes: {
          select: {
            id: true,
            text: true,
            memberId: true,
            fulfilled: true,
            fulfilledWithRecipeId: true,
            createdAt: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            isSystem: true,
            schedule: true
          }
        }
      }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    const duration = Date.now() - startTime;
    const mealCount = plan.meals?.length || 0;

    log.info('Weekly plan loaded', {
      planId: id,
      duration,
      mealCount,
      status: plan.status
    });

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

    // Variable to store plan ID for shopping list generation
    let createdPlanId: string;

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
    log.debug('Components loaded for meal plan generation', {
      familyId,
      total: components.length,
      proteins: proteins.length,
      vegetables: vegetables.length,
      carbs: carbs.length
    });

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

    // Create weekly plan and meals in a transaction
    const completePlan = await prisma.$transaction(async (tx) => {
      const weeklyPlan = await tx.weeklyPlan.create({
        data: {
          familyId,
          weekStartDate: date,
          weekNumber,
          year,
          status: 'DRAFT',
          templateId: template.id
        }
      });

      // Store plan ID for shopping list generation
      createdPlanId = weeklyPlan.id;

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

            log.debug('Evaluating meal composition strategy', {
              day,
              mealType,
              shouldBeComponentBased,
              availableComponents: {
                proteins: proteins.length,
                vegetables: vegetables.length,
                carbs: carbs.length
              }
            });

            if (shouldBeComponentBased) {
              log.debug('Creating component-based meal', { day, mealType });
              // Create component-based meal
              try {
                const selectedComponents = selectMealComponents(
                  proteins,
                  vegetables,
                  carbs,
                  recentProteins
                );

                // Track recent proteins (keep last 2)
                const proteinComponent = selectedComponents.find(c => c.category === 'PROTEIN');
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
      const createdMeals = await Promise.all(
        meals.map((meal: any) => {
          const { mealIndex: _, ...mealData } = meal;
          return tx.meal.create({ data: mealData });
        })
      );

      // Create meal components for component-based meals
      if (mealComponentsToCreate.length > 0) {
        const componentData: any[] = [];

        mealComponentsToCreate.forEach(({ mealIndex: idx, components }) => {
          const meal = createdMeals[idx];
          components.forEach((comp: any, order: number) => {
            componentData.push({
              mealId: meal.id,
              componentId: comp.id,
              quantity: comp.defaultQuantity,
              unit: comp.unit,
              order
            });
          });
        });

        if (componentData.length > 0) {
          await tx.mealComponent.createMany({ data: componentData });
        }
      }

      // Fetch complete plan
      return await tx.weeklyPlan.findUnique({
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
    });

    // Send notification to family members
    if (req.user && completePlan) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true }
      });
      const createdByName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      await notificationService.notifyDraftPlanCreated(
        familyId,
        completePlan.id,
        date,
        createdByName
      );
    }

    // Auto-generate shopping list on plan creation (OBU-7)
    // Shopping list is available immediately for DRAFT plans
    try {
      if (completePlan) {
        await generateShoppingListService(completePlan.id);
      }
    } catch (error) {
      log.error('Failed to auto-generate shopping list for new plan', {
        weeklyPlanId: completePlan?.id,
        familyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail plan creation if shopping list generation fails
    }

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

    // Create weekly plan and meals in a transaction
    const completePlan = await prisma.$transaction(async (tx) => {
      const weeklyPlan = await tx.weeklyPlan.create({
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

      await tx.meal.createMany({ data: meals });

      return await tx.weeklyPlan.findUnique({
        where: { id: weeklyPlan.id },
        include: {
          meals: {
            include: {
              recipe: true
            }
          }
        }
      });
    });

    // Send notification to family members
    if (req.user && completePlan) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true }
      });
      const createdByName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      await notificationService.notifyDraftPlanCreated(
        familyId,
        completePlan.id,
        date,
        createdByName
      );
    }

    // Auto-generate shopping list on plan creation (OBU-7 FIX)
    try {
      if (completePlan) {
        await generateShoppingListService(completePlan.id);
      }
    } catch (error) {
      log.error('Failed to auto-generate shopping list for express plan', {
        weeklyPlanId: completePlan?.id,
        familyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail plan creation if shopping list generation fails
    }

    res.status(201).json({
      status: 'success',
      data: { plan: completePlan }
    });
  }
);

export const updateMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const userId = req.user!.id;

    // Validate and sanitize input - only allowed fields will be processed
    const validatedData = updateMealSchema.parse(req.body);

    // Fetch old meal data for audit logging
    const oldMeal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { recipe: true, weeklyPlan: true }
    });

    if (!oldMeal) {
      throw new AppError('Meal not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: oldMeal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: validatedData,
      include: {
        recipe: true
      }
    });

    // Log portion change
    if (validatedData.portions && oldMeal.portions !== validatedData.portions) {
      await logChange({
        weeklyPlanId: oldMeal.weeklyPlanId,
        mealId: meal.id,
        changeType: 'PORTIONS_CHANGED',
        memberId: member.id,
        oldValue: oldMeal.portions.toString(),
        newValue: validatedData.portions.toString(),
        description: `Portions changed from ${oldMeal.portions} to ${validatedData.portions}`,
        descriptionEn: `Portions changed from ${oldMeal.portions} to ${validatedData.portions}`,
        descriptionNl: `Porties gewijzigd van ${oldMeal.portions} naar ${validatedData.portions}`
      });
    }

    // Log recipe change
    if (validatedData.recipeId && oldMeal.recipeId !== validatedData.recipeId) {
      await logChange({
        weeklyPlanId: oldMeal.weeklyPlanId,
        mealId: meal.id,
        changeType: 'RECIPE_CHANGED',
        memberId: member.id,
        oldValue: oldMeal.recipe?.title || 'None',
        newValue: meal.recipe?.title || 'None',
        description: `Recette changée de "${oldMeal.recipe?.title || 'None'}" à "${meal.recipe?.title || 'None'}"`,
        descriptionEn: `Recipe changed from "${oldMeal.recipe?.title || 'None'}" to "${meal.recipe?.title || 'None'}"`,
        descriptionNl: `Recept gewijzigd van "${oldMeal.recipe?.title || 'None'}" naar "${meal.recipe?.title || 'None'}"`
      });
    }

    // Regenerate shopping list to keep it in sync (OBU-12)
    try {
      await generateShoppingListService(meal.weeklyPlanId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after meal update', {
        weeklyPlanId: meal.weeklyPlanId,
        mealId: meal.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail update if shopping list regeneration fails
    }

    res.json({
      status: 'success',
      data: { meal }
    });
  }
);

export const adjustMealPortions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { mealId } = req.params;
    const { portions } = req.body;
    const userId = req.user!.id;

    // Validate portions
    if (!portions || typeof portions !== 'number' || portions < 1 || !Number.isInteger(portions)) {
      throw new AppError('Portions must be a positive integer', 400);
    }

    // Fetch old meal data for audit logging
    const oldMeal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { recipe: true, weeklyPlan: true }
    });

    if (!oldMeal) {
      throw new AppError('Meal not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: oldMeal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Update meal portions
    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { portions },
      include: {
        recipe: true
      }
    });

    // Log portion change
    await logChange({
      weeklyPlanId: oldMeal.weeklyPlanId,
      mealId: meal.id,
      changeType: 'PORTIONS_CHANGED',
      memberId: member.id,
      oldValue: oldMeal.portions.toString(),
      newValue: portions.toString(),
      description: `Portions changées de ${oldMeal.portions} à ${portions}`,
      descriptionEn: `Portions changed from ${oldMeal.portions} to ${portions}`,
      descriptionNl: `Porties gewijzigd van ${oldMeal.portions} naar ${portions}`
    });

    // Regenerate shopping list to keep it in sync (OBU-12)
    try {
      await generateShoppingListService(meal.weeklyPlanId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after meal update', {
        weeklyPlanId: meal.weeklyPlanId,
        mealId: meal.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail update if shopping list regeneration fails
    }

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
    const userId = req.user!.id;

    // Fetch old meal for audit logging
    const oldMeal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        recipe: true,
        weeklyPlan: true
      }
    });

    if (!oldMeal) {
      throw new AppError('Meal not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: oldMeal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { recipeId: newRecipeId },
      include: {
        recipe: true
      }
    });

    // Log recipe swap
    await logChange({
      weeklyPlanId: meal.weeklyPlanId,
      mealId: meal.id,
      changeType: 'RECIPE_CHANGED',
      memberId: member.id,
      oldValue: oldMeal?.recipe?.title || 'None',
      newValue: meal.recipe?.title || 'None',
      description: `Recette échangée de "${oldMeal?.recipe?.title || 'None'}" à "${meal.recipe?.title || 'None'}"`,
      descriptionEn: `Recipe swapped from "${oldMeal?.recipe?.title || 'None'}" to "${meal.recipe?.title || 'None'}"`,
      descriptionNl: `Recept gewisseld van "${oldMeal?.recipe?.title || 'None'}" naar "${meal.recipe?.title || 'None'}"`
    });

    // Regenerate shopping list to keep it in sync (OBU-12)
    try {
      await generateShoppingListService(meal.weeklyPlanId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after recipe swap', {
        weeklyPlanId: meal.weeklyPlanId,
        mealId: meal.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail swap if shopping list regeneration fails
    }

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
    const userId = req.user!.id;

    // First, fetch the meal to get family context
    const existingMeal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { weeklyPlan: true }
    });

    if (!existingMeal) {
      throw new AppError('Meal not found', 404);
    }

    // Validate user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: existingMeal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this meal', 403);
    }

    // Now proceed with update
    const meal = await prisma.meal.update({
      where: { id: mealId },
      data: { locked },
      include: { weeklyPlan: true }
    });

    // Log lock/unlock with validated member
    await logChange({
      weeklyPlanId: meal.weeklyPlanId,
      mealId: meal.id,
      changeType: locked ? 'MEAL_LOCKED' : 'MEAL_UNLOCKED',
      memberId: member.id,
      description: locked ? 'Repas verrouillé' : 'Repas déverrouillé',
      descriptionEn: locked ? 'Meal locked' : 'Meal unlocked',
      descriptionNl: locked ? 'Maaltijd vergrendeld' : 'Maaltijd ontgrendeld'
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
    const userId = req.user!.id;

    // Get old plan status before update
    const oldPlan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      select: { status: true, familyId: true }
    });

    if (!oldPlan) {
      throw new AppError('Plan not found', 404);
    }

    // Check if user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: oldPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to validate this plan', 403);
    }

    // Auto-skip all empty meals before validating (removes ambiguity)
    // Only affects truly empty meals (no recipe, no components, not already skipped)
    // Auto-skip all empty meals before validating (removes ambiguity)
    // Only affects truly empty meals (no recipe, no components, not already skipped)
    console.log('validatePlan: calling transaction', !!prisma.$transaction);
    const plan = await prisma.$transaction(async (tx) => {
      await tx.meal.updateMany({
        where: {
          weeklyPlanId: planId,
          recipeId: null,
          isSkipped: false,
          mealComponents: { none: {} }
        },
        data: {
          isSkipped: true,
          skipReason: null // Auto-skipped meals have no reason
        }
      });

      return await tx.weeklyPlan.update({
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
    });

    // Log plan validation
    await logChange({
      weeklyPlanId: planId,
      changeType: 'PLAN_STATUS_CHANGED',
      memberId: member.id,
      oldValue: oldPlan?.status,
      newValue: 'VALIDATED',
      description: `Statut du plan changé de ${oldPlan?.status} à VALIDATED`,
      descriptionEn: `Plan status changed from ${oldPlan?.status} to VALIDATED`,
      descriptionNl: `Planstatus gewijzigd van ${oldPlan?.status} naar VALIDATED`
    });

    // Shopping list already exists from plan creation (OBU-7)
    // No need to regenerate on validation (OBU-12 FIX)

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
    const userId = req.user!.id;

    // Verify plan exists and is in DRAFT status
    const plan = await prisma.weeklyPlan.findUnique({
      where: { id: planId },
      include: { family: { include: { members: true } } }
    });

    if (!plan) {
      throw new AppError('Weekly plan not found', 404);
    }

    // Validate user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: plan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this plan', 403);
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

    // Log meal addition with validated member
    await logChange({
      weeklyPlanId: planId,
      mealId: meal.id,
      changeType: 'MEAL_ADDED',
      memberId: member.id,
      newValue: `${dayOfWeek} ${mealType}${meal.recipe ? `: ${meal.recipe.title}` : ''}`,
      description: `Repas ajouté: ${dayOfWeek} ${mealType}${meal.recipe ? `: ${meal.recipe.title}` : ''}`,
      descriptionEn: `Meal added: ${dayOfWeek} ${mealType}${meal.recipe ? `: ${meal.recipe.title}` : ''}`,
      descriptionNl: `Maaltijd toegevoegd: ${dayOfWeek} ${mealType}${meal.recipe ? `: ${meal.recipe.title}` : ''}`
    });

    // Regenerate shopping list to keep it in sync (OBU-12)
    try {
      await generateShoppingListService(planId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after adding meal', {
        weeklyPlanId: planId,
        mealId: meal.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail meal addition if shopping list regeneration fails
    }

    res.status(201).json({
      status: 'success',
      data: { meal }
    });
  }
);

// Skip meal in draft plan (non-destructive, marks as skipped instead of deleting)
export const removeMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;
    const { skipReason } = req.body; // Optional skip reason
    const userId = req.user!.id;

    // Verify meal exists and belongs to this plan
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        weeklyPlanId: planId
      },
      include: {
        recipe: true,
        weeklyPlan: true,
        mealComponents: true
      }
    });

    if (!meal) {
      throw new AppError('Meal not found', 404);
    }

    // Validate user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this plan', 403);
    }

    if (meal.weeklyPlan.status !== 'DRAFT') {
      throw new AppError('Can only skip meals in draft plans', 400);
    }

    // Delete meal components first (if any)
    if (meal.mealComponents && meal.mealComponents.length > 0) {
      await prisma.mealComponent.deleteMany({
        where: { mealId }
      });
    }

    // Mark meal as skipped (non-destructive) and clear recipe
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isSkipped: true,
        skipReason: skipReason || null,
        recipeId: null // Clear recipe when skipping
      },
      include: {
        recipe: true,
        mealComponents: {
          include: {
            component: true
          }
        }
      }
    });

    // Log meal skip with validated member (non-blocking)
    try {
      await logChange({
        weeklyPlanId: planId,
        mealId,
        changeType: 'MEAL_REMOVED',
        memberId: member.id,
        oldValue: `${meal.dayOfWeek} ${meal.mealType}${meal.recipe ? `: ${meal.recipe.title}` : ''}`,
        description: `Repas ignoré: ${meal.dayOfWeek} ${meal.mealType}${skipReason ? ` (${skipReason})` : ''}`,
        descriptionEn: `Meal skipped: ${meal.dayOfWeek} ${meal.mealType}${skipReason ? ` (${skipReason})` : ''}`,
        descriptionNl: `Maaltijd overgeslagen: ${meal.dayOfWeek} ${meal.mealType}${skipReason ? ` (${skipReason})` : ''}`
      });
    } catch (logError) {
      log.warn('Failed to log meal skip audit entry', {
        weeklyPlanId: planId,
        mealId,
        memberId: member.id,
        error: logError instanceof Error ? logError.message : 'Unknown error'
      });
      // Continue anyway - meal skip succeeded
    }

    // Regenerate shopping list to keep it in sync (OBU-12)
    try {
      await generateShoppingListService(planId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after skipping meal', {
        weeklyPlanId: planId,
        mealId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail meal skip if shopping list regeneration fails
    }

    res.json({
      status: 'success',
      message: 'Meal skipped successfully',
      data: { meal: updatedMeal }
    });
  }
);

// Restore skipped meal to empty state
export const restoreMeal = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { planId, mealId } = req.params;
    const userId = req.user!.id;

    // Verify meal exists and belongs to this plan
    const meal = await prisma.meal.findFirst({
      where: {
        id: mealId,
        weeklyPlanId: planId
      },
      include: {
        weeklyPlan: true
      }
    });

    if (!meal) {
      throw new AppError('Meal not found', 404);
    }

    // Validate user is a member of the family
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: meal.weeklyPlan.familyId,
        userId
      }
    });

    if (!member) {
      throw new AppError('You do not have permission to modify this plan', 403);
    }

    if (meal.weeklyPlan.status !== 'DRAFT') {
      throw new AppError('Can only restore meals in draft plans', 400);
    }

    // Restore meal to empty state
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: {
        isSkipped: false,
        skipReason: null
      },
      include: {
        recipe: true,
        mealComponents: {
          include: {
            component: true
          }
        }
      }
    });

    // Log meal restoration (non-blocking)
    try {
      await logChange({
        weeklyPlanId: planId,
        mealId,
        changeType: 'MEAL_ADDED', // Reusing MEAL_ADDED as it's essentially re-adding the meal
        memberId: member.id,
        newValue: `${meal.dayOfWeek} ${meal.mealType}`,
        description: `Repas restauré: ${meal.dayOfWeek} ${meal.mealType}`,
        descriptionEn: `Meal restored: ${meal.dayOfWeek} ${meal.mealType}`,
        descriptionNl: `Maaltijd hersteld: ${meal.dayOfWeek} ${meal.mealType}`
      });
    } catch (logError) {
      log.warn('Failed to log meal restoration audit entry', {
        weeklyPlanId: planId,
        mealId,
        memberId: member.id,
        error: logError instanceof Error ? logError.message : 'Unknown error'
      });
      // Continue anyway - meal restoration succeeded
    }

    // Regenerate shopping list to keep it in sync
    try {
      await generateShoppingListService(planId);
    } catch (error) {
      log.error('Failed to regenerate shopping list after restoring meal', {
        weeklyPlanId: planId,
        mealId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Don't fail meal restoration if shopping list regeneration fails
    }

    res.json({
      status: 'success',
      message: 'Meal restored successfully',
      data: { meal: updatedMeal }
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
    const componentNames = meal.mealComponents.map((mc: typeof meal.mealComponents[number]) => mc.component.name);
    const componentNamesEn = meal.mealComponents.map((mc: typeof meal.mealComponents[number]) => mc.component.nameEn || mc.component.name);

    const defaultTitle = componentNames.join(' avec ');
    const defaultTitleEn = componentNamesEn.join(' with ');

    // Estimate cooking time based on components
    const prepTime = 15; // Standard prep time for component-based meals
    const cookTime = 25; // Estimated max cook time
    const totalTime = prepTime + cookTime;

    // Create recipe and ingredients in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
      const ingredientsData = meal.mealComponents.map((mc: typeof meal.mealComponents[number], index: number) => ({
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
    selectedProtein,
    ...selectedVegetables,
    selectedCarb
  ];
}
