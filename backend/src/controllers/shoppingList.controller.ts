import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

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
}

export const generateShoppingList = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { weeklyPlanId } = req.params;

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
          include: {
            recipe: {
              include: {
                ingredients: true
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

    // Aggregate ingredients
    const ingredientMap = new Map<string, AggregatedIngredient>();

    for (const meal of plan.meals) {
      if (!meal.recipe || meal.isSchoolMeal || meal.isExternal) continue;

      const servingFactor = meal.portions / (meal.recipe.servings || 4);

      // Add guest portions
      const totalGuests = meal.guests.reduce(
        (sum: number, g: any) => sum + g.adults + g.children * 0.7,
        0
      );
      const finalFactor = servingFactor * (1 + totalGuests / meal.portions);

      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name}|${ingredient.unit}|${ingredient.category}`;

        const existing = ingredientMap.get(key);
        if (existing) {
          existing.quantity += ingredient.quantity * finalFactor;
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            nameEn: ingredient.nameEn || undefined,
            quantity: ingredient.quantity * finalFactor,
            unit: ingredient.unit,
            category: ingredient.category,
            alternatives: ingredient.alternatives,
            containsGluten: ingredient.containsGluten,
            containsLactose: ingredient.containsLactose,
            allergens: ingredient.allergens
          });
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

      return {
        ...item,
        quantity: finalQuantity,
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

    res.status(201).json({
      status: 'success',
      data: { shoppingList }
    });
  }
);

export const getShoppingList = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { weeklyPlanId } = req.params;

    const shoppingList = await prisma.shoppingList.findFirst({
      where: { weeklyPlanId },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!shoppingList) {
      throw new AppError('Shopping list not found', 404);
    }

    // Group by category
    const groupedItems = shoppingList.items.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof shoppingList.items>);

    res.json({
      status: 'success',
      data: {
        shoppingList,
        groupedItems
      }
    });
  }
);

export const updateShoppingItem = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { itemId } = req.params;
    const { quantity, unit, checked, inStock } = req.body;

    const item = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        quantity,
        unit,
        checked,
        inStock
      }
    });

    res.json({
      status: 'success',
      data: { item }
    });
  }
);

export const toggleItemChecked = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { itemId } = req.params;

    const item = await prisma.shoppingItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    const updated = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: { checked: !item.checked }
    });

    res.json({
      status: 'success',
      data: { item: updated }
    });
  }
);

// Helper function to round quantities to reasonable values
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

  if (unitLower.includes('l')) {
    return Math.ceil(quantity * 4) / 4; // Round to 0.25 L
  }

  if (unitLower.includes('ml')) {
    if (quantity < 100) return Math.ceil(quantity / 10) * 10;
    return Math.ceil(quantity / 50) * 50;
  }

  if (['piece', 'pièce', 'unit', 'unité'].includes(unitLower)) {
    return Math.ceil(quantity); // Round to whole pieces
  }

  // Default: round to 2 decimals
  return Math.ceil(quantity * 100) / 100;
}
