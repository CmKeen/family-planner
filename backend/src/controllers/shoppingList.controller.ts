import { Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateShoppingList as generateShoppingListService } from '../services/shoppingList.service';

export const generateShoppingList = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { weeklyPlanId } = req.params;

    const shoppingList = await generateShoppingListService(weeklyPlanId);

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
    const { listId, itemId } = req.params;

    const item = await prisma.shoppingItem.findUnique({
      where: {
        id: itemId,
        shoppingListId: listId
      }
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

