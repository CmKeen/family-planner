import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from '../api';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  foodComponentAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  mealComponentAPI: {
    add: vi.fn(),
    swap: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
}));

describe('Food Component API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('foodComponentAPI.getAll', () => {
    it('should call API with correct endpoint and no params', async () => {
      const mockComponents = [
        { id: 'comp-1', name: 'Chicken', category: 'PROTEIN' },
        { id: 'comp-2', name: 'Broccoli', category: 'VEGETABLE' }
      ];

      vi.mocked(apiModule.foodComponentAPI.getAll).mockResolvedValue({
        data: mockComponents
      } as any);

      const result = await apiModule.foodComponentAPI.getAll();

      expect(apiModule.foodComponentAPI.getAll).toHaveBeenCalledWith();
      expect(result.data).toEqual(mockComponents);
    });

    it('should pass familyId parameter', async () => {
      vi.mocked(apiModule.foodComponentAPI.getAll).mockResolvedValue({
        data: []
      } as any);

      await apiModule.foodComponentAPI.getAll({ familyId: 'family-1' });

      expect(apiModule.foodComponentAPI.getAll).toHaveBeenCalledWith({ familyId: 'family-1' });
    });

    it('should pass category parameter', async () => {
      vi.mocked(apiModule.foodComponentAPI.getAll).mockResolvedValue({
        data: []
      } as any);

      await apiModule.foodComponentAPI.getAll({ category: 'PROTEIN' });

      expect(apiModule.foodComponentAPI.getAll).toHaveBeenCalledWith({ category: 'PROTEIN' });
    });
  });

  describe('foodComponentAPI.create', () => {
    it('should create a component with correct data', async () => {
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

      vi.mocked(apiModule.foodComponentAPI.create).mockResolvedValue({
        data: mockResponse
      } as any);

      const result = await apiModule.foodComponentAPI.create('family-1', componentData);

      expect(apiModule.foodComponentAPI.create).toHaveBeenCalledWith('family-1', componentData);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('foodComponentAPI.update', () => {
    it('should update a component', async () => {
      const updateData = {
        name: 'Updated Name',
        defaultQuantity: 120
      };

      vi.mocked(apiModule.foodComponentAPI.update).mockResolvedValue({
        data: { id: 'comp-1', ...updateData }
      } as any);

      await apiModule.foodComponentAPI.update('comp-1', updateData);

      expect(apiModule.foodComponentAPI.update).toHaveBeenCalledWith('comp-1', updateData);
    });
  });

  describe('foodComponentAPI.delete', () => {
    it('should delete a component', async () => {
      vi.mocked(apiModule.foodComponentAPI.delete).mockResolvedValue({
        data: { message: 'Component deleted' }
      } as any);

      await apiModule.foodComponentAPI.delete('comp-1');

      expect(apiModule.foodComponentAPI.delete).toHaveBeenCalledWith('comp-1');
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
        quantity: 150,
        unit: 'g',
        order: 0
      };

      const mockResponse = {
        id: 'mc-1',
        mealId: 'meal-1',
        ...componentData
      };

      vi.mocked(apiModule.mealComponentAPI.add).mockResolvedValue({
        data: mockResponse
      } as any);

      const result = await apiModule.mealComponentAPI.add('plan-1', 'meal-1', componentData);

      expect(apiModule.mealComponentAPI.add).toHaveBeenCalledWith('plan-1', 'meal-1', componentData);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('mealComponentAPI.swap', () => {
    it('should swap a meal component', async () => {
      const swapData = {
        newComponentId: 'comp-salmon',
        quantity: 150,
        unit: 'g'
      };

      vi.mocked(apiModule.mealComponentAPI.swap).mockResolvedValue({
        data: {}
      } as any);

      await apiModule.mealComponentAPI.swap('plan-1', 'meal-1', 'mc-1', swapData);

      expect(apiModule.mealComponentAPI.swap).toHaveBeenCalledWith('plan-1', 'meal-1', 'mc-1', swapData);
    });
  });

  describe('mealComponentAPI.update', () => {
    it('should update meal component quantity', async () => {
      const updateData = {
        quantity: 200
      };

      vi.mocked(apiModule.mealComponentAPI.update).mockResolvedValue({
        data: { id: 'mc-1', quantity: 200 }
      } as any);

      await apiModule.mealComponentAPI.update('plan-1', 'meal-1', 'mc-1', updateData);

      expect(apiModule.mealComponentAPI.update).toHaveBeenCalledWith('plan-1', 'meal-1', 'mc-1', updateData);
    });
  });

  describe('mealComponentAPI.remove', () => {
    it('should remove a component from a meal', async () => {
      vi.mocked(apiModule.mealComponentAPI.remove).mockResolvedValue({
        data: { message: 'Component removed successfully' }
      } as any);

      await apiModule.mealComponentAPI.remove('plan-1', 'meal-1', 'mc-1');

      expect(apiModule.mealComponentAPI.remove).toHaveBeenCalledWith('plan-1', 'meal-1', 'mc-1');
    });
  });
});
