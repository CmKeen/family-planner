import { vi } from 'vitest';
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  toggleItemChecked,
  getShoppingList,
  generateShoppingList,
  updateShoppingItem
} from '../shoppingList.controller';
import prisma from '../../lib/prisma';

// Mock logger
vi.mock('../../config/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock prisma
vi.mock('../../lib/prisma', () => {
  const mockPrisma = {
    shoppingItem: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    shoppingList: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn()
    },
    weeklyPlan: {
      findUnique: vi.fn()
    }
  };

  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma
  };
});

// Mock shopping list service
vi.mock('../../services/shoppingList.service', () => ({
  generateShoppingList: vi.fn()
}));

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('ShoppingList Controller', () => {
  let mockReq: AuthRequest;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      params: {
        listId: 'list-123',
        itemId: 'item-123',
        weeklyPlanId: 'plan-123'
      },
      body: {},
      user: {
        id: 'user-123',
        email: 'test@example.com'
      },
      member: {
        id: 'member-123',
        name: 'Test User',
        role: 'PARENT',
        familyId: 'family-123'
      }
    } as unknown as AuthRequest;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('toggleItemChecked', () => {
    it('should toggle item from unchecked to checked', async () => {
      const mockItem = {
        id: 'item-123',
        name: 'Tomatoes',
        quantity: 500,
        unit: 'g',
        checked: false,
        category: 'produce',
        shoppingListId: 'list-123'
      };

      const mockUpdatedItem = {
        ...mockItem,
        checked: true
      };

      (prisma.shoppingItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
      (prisma.shoppingItem.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

      await toggleItemChecked(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.shoppingItem.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'item-123',
          shoppingListId: 'list-123'
        }
      });

      expect(prisma.shoppingItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { checked: true }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { item: mockUpdatedItem }
      });
    });

    it('should toggle item from checked to unchecked', async () => {
      const mockItem = {
        id: 'item-123',
        name: 'Tomatoes',
        quantity: 500,
        unit: 'g',
        checked: true,
        category: 'produce',
        shoppingListId: 'list-123'
      };

      const mockUpdatedItem = {
        ...mockItem,
        checked: false
      };

      (prisma.shoppingItem.findUnique as jest.Mock).mockResolvedValue(mockItem);
      (prisma.shoppingItem.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

      await toggleItemChecked(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.shoppingItem.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'item-123',
          shoppingListId: 'list-123'
        }
      });

      expect(prisma.shoppingItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { checked: false }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { item: mockUpdatedItem }
      });
    });

    it('should throw 404 error if item not found', async () => {
      (prisma.shoppingItem.findUnique as jest.Mock).mockResolvedValue(null);

      await toggleItemChecked(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.shoppingItem.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'item-123',
          shoppingListId: 'list-123'
        }
      });

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Item not found',
          statusCode: 404
        })
      );

      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.shoppingItem.findUnique as jest.Mock).mockRejectedValue(dbError);

      await toggleItemChecked(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith(dbError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('getShoppingList', () => {
    it('should return shopping list with grouped items', async () => {
      const mockShoppingList = {
        id: 'list-123',
        weeklyPlanId: 'plan-123',
        items: [
          {
            id: 'item-1',
            name: 'Tomatoes',
            quantity: 500,
            unit: 'g',
            category: 'produce',
            checked: false,
            order: 1
          },
          {
            id: 'item-2',
            name: 'Chicken',
            quantity: 1000,
            unit: 'g',
            category: 'meat',
            checked: false,
            order: 2
          }
        ]
      };

      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(mockShoppingList);

      await getShoppingList(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.shoppingList.findFirst).toHaveBeenCalledWith({
        where: { weeklyPlanId: 'plan-123' },
        include: {
          items: {
            orderBy: { order: 'asc' }
          }
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          shoppingList: mockShoppingList,
          groupedItems: expect.any(Object)
        })
      });
    });

    it('should throw 404 error if shopping list not found', async () => {
      (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

      await getShoppingList(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Shopping list not found',
          statusCode: 404
        })
      );
    });
  });

  describe('updateShoppingItem', () => {
    it('should update shopping item properties', async () => {
      const updateData = {
        quantity: 750,
        unit: 'g',
        checked: true,
        inStock: false
      };

      mockReq.body = updateData;

      const mockUpdatedItem = {
        id: 'item-123',
        name: 'Tomatoes',
        ...updateData,
        category: 'produce',
        shoppingListId: 'list-123'
      };

      (prisma.shoppingItem.update as jest.Mock).mockResolvedValue(mockUpdatedItem);

      await updateShoppingItem(mockReq, mockRes as Response, mockNext);
      await waitForAsync();

      expect(prisma.shoppingItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: updateData
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: { item: mockUpdatedItem }
      });
    });
  });
});
