import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

interface AggregatedIngredient {
  name: string;
  nameEn?: string;
  quantity: number;
  unit: string;
  category: string;
  alternatives: string[];
  containsGluten?: boolean;
  containsLactose?: boolean;
  allergens: string[];
  recipeNames?: string[];
}

/**
 * Category translation map (BUG-009 FIX)
 * Translates English category names to French for shopping list display
 */
const translateCategory = (category: string): string => {
  const translations: Record<string, string> = {
    'meat': 'Boucherie',
    'pantry': 'Épicerie',
    'produce': 'Fruits & Légumes',
    'dairy': 'Produits Laitiers',
    'bakery': 'Boulangerie'
  };
  return translations[category] || category;
};

/**
 * Round quantities to reasonable values based on unit
 * Examples: 0.25kg increments, 10g/25g/50g increments, whole pieces
 */
function roundQuantity(quantity: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  if (unitLower.includes('kg')) {
    return Math.ceil(quantity * 4) / 4; // Round to 0.25 kg
  }

  if (unitLower.includes('g')) {
    if (quantity < 50) return Math.ceil(quantity / 10) * 10; // Round to 10g
    if (quantity < 200) return Math.ceil(quantity / 25) * 25; // Round to 25g
    return Math.ceil(quantity / 50) * 50; // Round to 50g
  }

  // Check ml before l to avoid matching 'ml' with 'l'
  if (unitLower.includes('ml')) {
    if (quantity < 100) return Math.ceil(quantity / 10) * 10;
    return Math.ceil(quantity / 50) * 50;
  }

  if (unitLower.includes('l')) {
    if (quantity < 0.5) return Math.ceil(quantity * 10) / 10; // Round to 0.1L
    return Math.ceil(quantity * 4) / 4; // Round to 0.25 L
  }

  if (['piece', 'pièce', 'unit', 'unité'].includes(unitLower)) {
    return Math.ceil(quantity); // Round to whole pieces
  }

  // Default: round to 2 decimals
  return Math.ceil(quantity * 100) / 100;
}

/**
 * Generate a shopping list from a weekly plan
 *
 * This function:
 * 1. Aggregates ingredients from all meals (recipes + components)
 * 2. Scales quantities by portions and guests
 * 3. Applies dietary substitutions (gluten-free, lactose-free)
 * 4. Checks inventory and deducts stock
 * 5. Deletes existing shopping list if present
 * 6. Creates new shopping list with items
 *
 * @param weeklyPlanId - The ID of the weekly plan to generate shopping list for
 * @returns The created shopping list with items
 * @throws AppError if weekly plan not found
 */
export async function generateShoppingList(weeklyPlanId: string) {
  const startTime = Date.now();

  // Fetch full plan data with all related entities
  const plan = await prisma.weeklyPlan.findUnique({
    where: { id: weeklyPlanId },
    include: {
      family: {
        include: {
          dietProfile: true,
          inventory: true
        }
      },
      meals: {
        where: {
          isSkipped: false // Exclude skipped meals from shopping list
        },
        include: {
          recipe: {
            include: {
              ingredients: true
            }
          },
          mealComponents: {
            include: {
              component: true
            }
          },
          guests: true
        }
      }
    }
  });

  if (!plan) {
    throw new AppError('Weekly plan not found', 404);
  }

  // Aggregate ingredients from both recipes AND components
  const ingredientMap = new Map<string, AggregatedIngredient>();

  for (const meal of plan.meals) {
    // Skip school meals and external meals (not shopping at home)
    if (meal.isSchoolMeal || meal.isExternal) continue;

    // Calculate scaling factor based on guests
    const totalGuests = meal.guests.reduce(
      (sum: number, g: any) => sum + g.adults + g.children * 0.7,
      0
    );

    // Aggregate recipe ingredients (if recipe exists)
    if (meal.recipe) {
      const servingFactor = meal.portions / (meal.recipe.servings || 4);
      const finalFactor = servingFactor * (1 + totalGuests / meal.portions);

      for (const ingredient of meal.recipe.ingredients) {
        // Translate category name (BUG-009 FIX)
        const translatedCategory = translateCategory(ingredient.category);
        const key = `${ingredient.name}|${ingredient.unit}|${translatedCategory}`;

        const existing = ingredientMap.get(key);
        if (existing) {
          existing.quantity += ingredient.quantity * finalFactor;
          // Track which recipes use this ingredient (BUG-014 FIX)
          if (existing.recipeNames && !existing.recipeNames.includes(meal.recipe.title)) {
            existing.recipeNames.push(meal.recipe.title);
          }
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            nameEn: ingredient.nameEn || undefined,
            quantity: ingredient.quantity * finalFactor,
            unit: ingredient.unit,
            category: translatedCategory,  // Use translated category (BUG-009 FIX)
            alternatives: ingredient.alternatives,
            containsGluten: ingredient.containsGluten,
            containsLactose: ingredient.containsLactose,
            allergens: ingredient.allergens,
            recipeNames: [meal.recipe.title]  // Track source recipe (BUG-014 FIX)
          });
        }
      }
    }

    // Aggregate meal components (for component-based meals)
    if (meal.mealComponents && meal.mealComponents.length > 0) {
      // Scale components by total servings (meal portions + guests)
      const totalServings = meal.portions + totalGuests;
      // Assume default is for 1 person per component quantity
      const componentFactor = totalServings;

      for (const mealComponent of meal.mealComponents) {
        const component = mealComponent.component;
        // Translate category name (BUG-009 FIX)
        const translatedCategory = translateCategory(component.shoppingCategory);
        const key = `${component.name}|${mealComponent.unit}|${translatedCategory}`;

        const existing = ingredientMap.get(key);
        if (existing) {
          existing.quantity += mealComponent.quantity * componentFactor;
        } else {
          ingredientMap.set(key, {
            name: component.name,
            nameEn: component.nameEn || undefined,
            quantity: mealComponent.quantity * componentFactor,
            unit: mealComponent.unit,
            category: translatedCategory,  // Use translated category (BUG-009 FIX)
            alternatives: [],
            containsGluten: !component.glutenFree,
            containsLactose: !component.lactoseFree,
            allergens: component.allergens,
            recipeNames: []  // Components don't have specific recipes
          });
        }
      }
    }
  }

  // Convert map to array and sort by category
  const items = Array.from(ingredientMap.values()).sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  // Apply dietary substitutions
  const dietProfile = plan.family.dietProfile;
  const substitutedItems = items.map(item => {
    const alternatives = [...item.alternatives];

    if (dietProfile.glutenFree && item.containsGluten) {
      alternatives.unshift('Version sans gluten');
    }

    if (dietProfile.lactoseFree && item.containsLactose) {
      alternatives.unshift('Version sans lactose (lait végétal, crème soja)');
    }

    return { ...item, alternatives };
  });

  // Check inventory and deduct stock
  const inventory = plan.family.inventory;
  const finalItems = substitutedItems.map((item, index) => {
    const stockItem = inventory.find(
      (inv: any) => inv.name.toLowerCase() === item.name.toLowerCase()
    );

    let finalQuantity = item.quantity;
    let inStock = false;

    if (stockItem && stockItem.quantity > 0) {
      finalQuantity = Math.max(0, item.quantity - stockItem.quantity);
      inStock = finalQuantity === 0;
    }

    // Round to reasonable quantities
    finalQuantity = roundQuantity(finalQuantity, item.unit);

    // Only include fields that exist in ShoppingItem schema
    return {
      name: item.name,
      nameEn: item.nameEn,
      quantity: finalQuantity,
      unit: item.unit,
      category: item.category,
      alternatives: item.alternatives || [],
      recipeNames: item.recipeNames || [],  // BUG-014 FIX: Include source recipes
      inStock,
      order: index
    };
  });

  // Delete old shopping list if exists
  const existingList = await prisma.shoppingList.findFirst({
    where: { weeklyPlanId }
  });

  if (existingList) {
    await prisma.shoppingList.delete({
      where: { id: existingList.id }
    });
  }

  // Create new shopping list
  const shoppingList = await prisma.shoppingList.create({
    data: {
      familyId: plan.familyId,
      weeklyPlanId,
      items: {
        create: finalItems
      }
    },
    include: {
      items: {
        orderBy: { order: 'asc' }
      }
    }
  });

  const duration = Date.now() - startTime;
  log.info('Shopping list generated', {
    weeklyPlanId,
    duration,
    mealCount: plan.meals.length,
    itemCount: shoppingList.items.length,
    inventoryItemsChecked: plan.family.inventory?.length || 0
  });

  return shoppingList;
}

/**
 * Regenerate an existing shopping list
 *
 * This is a convenience wrapper around generateShoppingList that
 * can be called when meals are updated to keep the list in sync.
 *
 * @param weeklyPlanId - The ID of the weekly plan to regenerate shopping list for
 * @returns The regenerated shopping list with items
 * @throws AppError if weekly plan not found
 */
export async function regenerateShoppingList(weeklyPlanId: string) {
  return generateShoppingList(weeklyPlanId);
}
