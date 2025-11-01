import { describe, it, expect, vi, beforeEach } from 'vitest';
import { foodComponentAPI, mealComponentAPI } from '../api';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}));

// Mock the API instance
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

// Override the api export
vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    api: mockApi
  };
});

describe('Food Component API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('foodComponentAPI.getAll', () => {
    it('should fetch all components without parameters', async () => {
      const mockComponents = [
        { id: 'comp-1', name: 'Chicken', category: 'PROTEIN' },
        { id: 'comp-2', name: 'Broccoli', category: 'VEGETABLE' }
      ];

      mockApi.get.mockResolvedValue({ data: mockComponents });

      const result = await foodComponentAPI.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/components', { params: undefined });
      expect(result.data).toEqual(mockComponents);
    });

    it('should fetch components with familyId filter', async () => {
      const mockComponents = [
        { id: 'comp-1', name: 'Special Sauce', familyId: 'family-1' }
      ];

      mockApi.get.mockResolvedValue({ data: mockComponents });

      await foodComponentAPI.getAll({ familyId: 'family-1' });

      expect(mockApi.get).toHaveBeenCalledWith('/components', {
        params: { familyId: 'family-1' }
      });
    });

    it('should fetch components with category filter', async () => {
      const mockComponents = [
        { id: 'comp-1', name: 'Chicken', category: 'PROTEIN' }
      ];

      mockApi.get.mockResolvedValue({ data: mockComponents });

      await foodComponentAPI.getAll({ category: 'PROTEIN' });

      expect(mockApi.get).toHaveBeenCalledWith('/components', {
        params: { category: 'PROTEIN' }
      });
    });
  });

  describe('foodComponentAPI.create', () => {
    it('should create a custom component', async () => {
      const componentData = {
        name: 'My Special Sauce',
        category: 'SAUCE',
        defaultQuantity: 50,
        unit: 'ml'
      };

      const mockResponse = {
        id: 'comp-new',
        ...componentData,
        familyId: 'family-1'
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await foodComponentAPI.create('family-1', componentData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/families/family-1/components',
        componentData
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('foodComponentAPI.update', () => {
    it('should update a component', async () => {
      const updateData = {
        name: 'Updated Name',
        defaultQuantity: 120
      };

      const mockResponse = {
        id: 'comp-1',
        ...updateData
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      await foodComponentAPI.update('comp-1', updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/components/comp-1', updateData);
    });
  });

  describe('foodComponentAPI.delete', () => {
    it('should delete a component', async () => {
      mockApi.delete.mockResolvedValue({ data: { message: 'Component deleted' } });

      await foodComponentAPI.delete('comp-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/components/comp-1');
    });
  });
});

describe('Meal Component API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mealComponentAPI.add', () => {
    it('should add a component to a meal', async () => {
      const componentData = {
        componentId: 'comp-chicken',
        role: 'MAIN_PROTEIN',
        quantity: 150,
        unit: 'g',
        order: 0
      };

      const mockResponse = {
        id: 'mc-1',
        mealId: 'meal-1',
        ...componentData
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await mealComponentAPI.add('plan-1', 'meal-1', componentData);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components',
        componentData
      );
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('mealComponentAPI.swap', () => {
    it('should swap a meal component with another', async () => {
      const swapData = {
        newComponentId: 'comp-salmon',
        quantity: 150,
        unit: 'g'
      };

      const mockResponse = {
        id: 'mc-1',
        componentId: 'comp-salmon',
        quantity: 150,
        unit: 'g'
      };

      mockApi.put.mockResolvedValue({ data: mockResponse });

      await mealComponentAPI.swap('plan-1', 'meal-1', 'mc-1', swapData);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components/mc-1/swap',
        swapData
      );
    });

    it('should swap without specifying quantity (uses default)', async () => {
      const swapData = {
        newComponentId: 'comp-salmon'
      };

      mockApi.put.mockResolvedValue({ data: {} });

      await mealComponentAPI.swap('plan-1', 'meal-1', 'mc-1', swapData);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components/mc-1/swap',
        swapData
      );
    });
  });

  describe('mealComponentAPI.update', () => {
    it('should update meal component quantity', async () => {
      const updateData = {
        quantity: 200
      };

      const mockResponse = {
        id: 'mc-1',
        quantity: 200
      };

      mockApi.patch.mockResolvedValue({ data: mockResponse });

      await mealComponentAPI.update('plan-1', 'meal-1', 'mc-1', updateData);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components/mc-1',
        updateData
      );
    });

    it('should update multiple fields', async () => {
      const updateData = {
        quantity: 200,
        role: 'SECONDARY_PROTEIN',
        order: 1
      };

      mockApi.patch.mockResolvedValue({ data: {} });

      await mealComponentAPI.update('plan-1', 'meal-1', 'mc-1', updateData);

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components/mc-1',
        updateData
      );
    });
  });

  describe('mealComponentAPI.remove', () => {
    it('should remove a component from a meal', async () => {
      mockApi.delete.mockResolvedValue({
        data: { message: 'Component removed successfully' }
      });

      await mealComponentAPI.remove('plan-1', 'meal-1', 'mc-1');

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/weekly-plans/plan-1/meals/meal-1/components/mc-1'
      );
    });
  });
});
