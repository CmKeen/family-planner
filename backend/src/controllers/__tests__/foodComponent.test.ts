import { vi } from 'vitest';
import { Request, Response } from 'express';

// Type aliases for Prisma enums
type ComponentCategory = 'PROTEIN' | 'VEGETABLE' | 'CARB' | 'FRUIT' | 'SAUCE' | 'CONDIMENT' | 'SPICE' | 'OTHER';

// Mock Prisma client with proper typing
const mockFoodComponent = {
  findMany: vi.fn() as any,
  findUnique: vi.fn() as any,
  create: vi.fn() as any,
  update: vi.fn() as any,
  delete: vi.fn() as any
};

const mockFamilyMember = {
  findFirst: vi.fn() as any
};

vi.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    foodComponent: mockFoodComponent,
    familyMember: mockFamilyMember
  }
}));

import prisma from '../../lib/prisma';
import {
  getAllComponents,
  createCustomComponent,
  updateComponent,
  deleteComponent
} from '../foodComponent.controller';
import { AuthRequest } from '../../middleware/auth';

// Helper to wait for async operations
const waitForAsync = () => new Promise(resolve => setImmediate(resolve));

describe('Food Component Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: {
        id: 'user-1',
        email: 'test@example.com'
      }
    } as any;

    mockResponse = {
      status: vi.fn().mockReturnThis() as any,
      json: vi.fn().mockReturnThis() as any
    };

    nextFunction = vi.fn();
  });

  describe('getAllComponents', () => {
    it('should return all system components', async () => {
      const mockComponents = [
        {
          id: 'comp-1',
          name: 'Poulet',
          nameEn: 'Chicken',
          nameNl: 'Kip',
          category: 'PROTEIN' as ComponentCategory,
          defaultQuantity: 150,
          unit: 'g',
          isSystemComponent: true,
          vegetarian: false,
          vegan: false
        },
        {
          id: 'comp-2',
          name: 'Brocoli',
          nameEn: 'Broccoli',
          nameNl: 'Broccoli',
          category: 'VEGETABLE' as ComponentCategory,
          defaultQuantity: 200,
          unit: 'g',
          isSystemComponent: true,
          vegetarian: true,
          vegan: true
        }
      ];

      mockFoodComponent.findMany.mockResolvedValue(mockComponents);

      await getAllComponents(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFoodComponent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isSystemComponent: true },
            { familyId: null }
          ]
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComponents);
    });

    it('should return system and family components when familyId provided', async () => {
      mockRequest.query = { familyId: 'family-1' };

      const mockComponents = [
        {
          id: 'comp-1',
          name: 'Poulet',
          category: 'PROTEIN' as ComponentCategory,
          isSystemComponent: true
        },
        {
          id: 'comp-3',
          name: 'Special Sauce',
          category: 'SAUCE' as ComponentCategory,
          isSystemComponent: false,
          familyId: 'family-1'
        }
      ];

      mockFoodComponent.findMany.mockResolvedValue(mockComponents);

      await getAllComponents(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFoodComponent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isSystemComponent: true },
            { familyId: 'family-1' }
          ]
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComponents);
    });

    it('should filter by category when provided', async () => {
      mockRequest.query = { category: 'PROTEIN' };

      const mockComponents = [
        {
          id: 'comp-1',
          name: 'Poulet',
          category: 'PROTEIN' as ComponentCategory,
          isSystemComponent: true
        }
      ];

      mockFoodComponent.findMany.mockResolvedValue(mockComponents);

      await getAllComponents(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFoodComponent.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isSystemComponent: true },
            { familyId: null }
          ],
          category: 'PROTEIN'
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComponents);
    });

    it('should handle database errors', async () => {
      mockFoodComponent.findMany.mockRejectedValue(new Error('Database error'));

      await getAllComponents(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Database error'
      }));
    });
  });

  describe('createCustomComponent', () => {
    it('should successfully create a custom component for family admin', async () => {
      mockRequest.params = { familyId: 'family-1' };
      mockRequest.body = {
        name: 'Ma sauce spéciale',
        nameEn: 'My Special Sauce',
        nameNl: 'Mijn speciale saus',
        category: 'SAUCE',
        defaultQuantity: 50,
        unit: 'ml',
        vegetarian: true,
        vegan: true,
        shoppingCategory: 'pantry'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };
      const mockComponent = {
        id: 'comp-new',
        ...mockRequest.body,
        isSystemComponent: false,
        familyId: 'family-1'
      };

      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.create.mockResolvedValue(mockComponent);

      await createCustomComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFamilyMember.findFirst).toHaveBeenCalledWith({
        where: {
          familyId: 'family-1',
          userId: 'user-1'
        }
      });

      expect(mockFoodComponent.create).toHaveBeenCalledWith({
        data: {
          ...mockRequest.body,
          // Zod schema adds default values for missing fields
          allergens: [],
          glutenFree: true,
          halalFriendly: true,
          lactoseFree: true,
          pescatarian: false,
          seasonality: ['all'],
          isSystemComponent: false,
          familyId: 'family-1'
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComponent);
    });

    it('should deny access if user is not a family member', async () => {
      mockRequest.params = { familyId: 'family-1' };
      mockRequest.body = {
        name: 'Test Component',
        category: 'PROTEIN',
        defaultQuantity: 100,
        unit: 'g'
      };

      mockFamilyMember.findFirst.mockResolvedValue(null);

      await createCustomComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));

      expect(mockFoodComponent.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      mockRequest.params = { familyId: 'family-1' };
      mockRequest.body = {
        name: 'Test Component'
        // missing required fields: category, defaultQuantity, unit
      };

      const mockMember = { id: 'member-1', role: 'ADMIN' };
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);

      await createCustomComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      // Zod validation throws ZodError, not AppError
      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ZodError'
      }));
    });
  });

  describe('updateComponent', () => {
    it('should successfully update a custom component', async () => {
      mockRequest.params = { id: 'comp-custom-1' };
      mockRequest.body = {
        name: 'Updated Name',
        defaultQuantity: 120
      };

      const existingComponent = {
        id: 'comp-custom-1',
        name: 'Original Name',
        isSystemComponent: false,
        familyId: 'family-1',
        defaultQuantity: 100
      };

      const updatedComponent = {
        ...existingComponent,
        ...mockRequest.body
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockFoodComponent.findUnique.mockResolvedValue(existingComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.update.mockResolvedValue(updatedComponent);

      await updateComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFoodComponent.findUnique).toHaveBeenCalledWith({
        where: { id: 'comp-custom-1' }
      });

      expect(mockFoodComponent.update).toHaveBeenCalledWith({
        where: { id: 'comp-custom-1' },
        data: mockRequest.body
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedComponent);
    });

    it('should prevent updating system components', async () => {
      mockRequest.params = { id: 'comp-system-1' };
      mockRequest.body = { name: 'Updated Name' };

      const systemComponent = {
        id: 'comp-system-1',
        name: 'Chicken',
        isSystemComponent: true,
        familyId: null
      };

      mockFoodComponent.findUnique.mockResolvedValue(systemComponent);

      await updateComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Cannot modify system components'
      }));

      expect(mockFoodComponent.update).not.toHaveBeenCalled();
    });

    it('should return 404 if component not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { name: 'Updated Name' };

      mockFoodComponent.findUnique.mockResolvedValue(null);

      await updateComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404
      }));
    });

    it('should deny access if user is not from the component family', async () => {
      mockRequest.params = { id: 'comp-custom-1' };
      mockRequest.body = { name: 'Updated Name' };

      const existingComponent = {
        id: 'comp-custom-1',
        isSystemComponent: false,
        familyId: 'family-1'
      };

      mockFoodComponent.findUnique.mockResolvedValue(existingComponent);
      mockFamilyMember.findFirst.mockResolvedValue(null);

      await updateComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));
    });
  });

  describe('deleteComponent', () => {
    it('should successfully delete a custom component', async () => {
      mockRequest.params = { id: 'comp-custom-1' };

      const existingComponent = {
        id: 'comp-custom-1',
        name: 'Custom Component',
        isSystemComponent: false,
        familyId: 'family-1'
      };

      const mockMember = { id: 'member-1', role: 'ADMIN', familyId: 'family-1' };

      mockFoodComponent.findUnique.mockResolvedValue(existingComponent);
      mockFamilyMember.findFirst.mockResolvedValue(mockMember);
      mockFoodComponent.delete.mockResolvedValue(existingComponent);

      await deleteComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(mockFoodComponent.delete).toHaveBeenCalledWith({
        where: { id: 'comp-custom-1' }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Component deleted successfully'
      });
    });

    it('should prevent deleting system components', async () => {
      mockRequest.params = { id: 'comp-system-1' };

      const systemComponent = {
        id: 'comp-system-1',
        name: 'Chicken',
        isSystemComponent: true,
        familyId: null
      };

      mockFoodComponent.findUnique.mockResolvedValue(systemComponent);

      await deleteComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Cannot delete system components'
      }));

      expect(mockFoodComponent.delete).not.toHaveBeenCalled();
    });

    it('should return 404 if component not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockFoodComponent.findUnique.mockResolvedValue(null);

      await deleteComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404
      }));
    });

    it('should deny access if user is not an admin of the component family', async () => {
      mockRequest.params = { id: 'comp-custom-1' };

      const existingComponent = {
        id: 'comp-custom-1',
        isSystemComponent: false,
        familyId: 'family-1'
      };

      mockFoodComponent.findUnique.mockResolvedValue(existingComponent);
      mockFamilyMember.findFirst.mockResolvedValue(null);

      await deleteComponent(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      await waitForAsync();

      expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403
      }));
    });
  });
});
