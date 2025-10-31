import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';

// Mock Prisma client
const mockPrismaClient = {
  mealScheduleTemplate: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  family: {
    findUnique: jest.fn(),
    update: jest.fn()
  }
};

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient
}));

import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate
} from '../mealScheduleTemplate.controller.js';

describe('MealScheduleTemplate Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'test-user-id' }
    };
    mockResponse = responseObject;
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return system and family templates', async () => {
      const familyId = 'test-family-id';
      mockRequest.params = { familyId };

      const mockTemplates = [
        {
          id: 'system-template-1',
          name: 'Full Week',
          description: 'Lunch and dinner for all 7 days',
          isSystem: true,
          familyId: null,
          schedule: [
            { dayOfWeek: 'MONDAY', mealTypes: ['LUNCH', 'DINNER'] }
          ]
        },
        {
          id: 'family-template-1',
          name: 'Custom Schedule',
          description: 'Family custom schedule',
          isSystem: false,
          familyId,
          schedule: [
            { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] }
          ]
        }
      ];

      mockPrismaClient.mealScheduleTemplate.findMany.mockResolvedValue(mockTemplates);

      await getTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.mealScheduleTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { isSystem: true, familyId: null },
            { familyId, isSystem: false }
          ]
        },
        orderBy: [
          { isSystem: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { templates: mockTemplates }
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { familyId: 'test-family-id' };
      const error = new Error('Database error');
      mockPrismaClient.mealScheduleTemplate.findMany.mockRejectedValue(error);

      await expect(
        getTemplates(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template', async () => {
      const familyId = 'test-family-id';
      const templateId = 'test-template-id';
      mockRequest.params = { familyId, templateId };

      const mockTemplate = {
        id: templateId,
        name: 'Test Template',
        description: 'Test description',
        isSystem: false,
        familyId,
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] }
        ]
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockTemplate);

      await getTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.mealScheduleTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          id: templateId,
          OR: [
            { isSystem: true, familyId: null },
            { familyId, isSystem: false }
          ]
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { template: mockTemplate }
      });
    });

    it('should return 404 if template not found', async () => {
      mockRequest.params = { familyId: 'test-family-id', templateId: 'non-existent' };
      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(null);

      await getTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Template not found'
      });
    });
  });

  describe('createTemplate', () => {
    it('should create a new family template', async () => {
      const familyId = 'test-family-id';
      mockRequest.params = { familyId };
      mockRequest.body = {
        name: 'New Template',
        description: 'Custom schedule',
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] },
          { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] }
        ]
      };

      const mockCreatedTemplate = {
        id: 'new-template-id',
        ...mockRequest.body,
        familyId,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrismaClient.mealScheduleTemplate.create.mockResolvedValue(mockCreatedTemplate);

      await createTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.mealScheduleTemplate.create).toHaveBeenCalledWith({
        data: {
          familyId,
          name: mockRequest.body.name,
          description: mockRequest.body.description,
          schedule: mockRequest.body.schedule,
          isSystem: false
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { template: mockCreatedTemplate }
      });
    });

    it('should validate required fields', async () => {
      mockRequest.params = { familyId: 'test-family-id' };
      mockRequest.body = {
        name: 'New Template'
        // Missing schedule
      };

      await createTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name and schedule are required'
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const familyId = 'test-family-id';
      const templateId = 'test-template-id';
      mockRequest.params = { familyId, templateId };
      mockRequest.body = {
        name: 'Updated Template',
        description: 'Updated description',
        schedule: [
          { dayOfWeek: 'MONDAY', mealTypes: ['LUNCH', 'DINNER'] }
        ]
      };

      const mockExistingTemplate = {
        id: templateId,
        name: 'Old Template',
        familyId,
        isSystem: false
      };

      const mockUpdatedTemplate = {
        ...mockExistingTemplate,
        ...mockRequest.body
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockExistingTemplate);
      mockPrismaClient.mealScheduleTemplate.update.mockResolvedValue(mockUpdatedTemplate);

      await updateTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.mealScheduleTemplate.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: {
          name: mockRequest.body.name,
          description: mockRequest.body.description,
          schedule: mockRequest.body.schedule
        }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { template: mockUpdatedTemplate }
      });
    });

    it('should not allow updating system templates', async () => {
      const templateId = 'system-template-id';
      mockRequest.params = { familyId: 'test-family-id', templateId };
      mockRequest.body = { name: 'Updated Name' };

      const mockSystemTemplate = {
        id: templateId,
        name: 'System Template',
        isSystem: true,
        familyId: null
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockSystemTemplate);

      await updateTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot modify system templates'
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a family template', async () => {
      const familyId = 'test-family-id';
      const templateId = 'test-template-id';
      mockRequest.params = { familyId, templateId };

      const mockTemplate = {
        id: templateId,
        name: 'Template to Delete',
        familyId,
        isSystem: false
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrismaClient.mealScheduleTemplate.delete.mockResolvedValue(mockTemplate);

      await deleteTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.mealScheduleTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateId }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template deleted successfully'
      });
    });

    it('should not allow deleting system templates', async () => {
      const templateId = 'system-template-id';
      mockRequest.params = { familyId: 'test-family-id', templateId };

      const mockSystemTemplate = {
        id: templateId,
        isSystem: true,
        familyId: null
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockSystemTemplate);

      await deleteTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete system templates'
      });
    });
  });

  describe('setDefaultTemplate', () => {
    it('should set a template as family default', async () => {
      const familyId = 'test-family-id';
      mockRequest.params = { familyId };
      mockRequest.body = { templateId: 'template-id' };

      const mockTemplate = {
        id: 'template-id',
        name: 'Default Template',
        familyId,
        isSystem: false
      };

      const mockUpdatedFamily = {
        id: familyId,
        defaultTemplateId: 'template-id'
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrismaClient.family.update.mockResolvedValue(mockUpdatedFamily);

      await setDefaultTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.family.update).toHaveBeenCalledWith({
        where: { id: familyId },
        data: { defaultTemplateId: 'template-id' }
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Default template updated successfully'
      });
    });

    it('should allow setting system templates as default', async () => {
      const familyId = 'test-family-id';
      mockRequest.params = { familyId };
      mockRequest.body = { templateId: 'system-template-id' };

      const mockSystemTemplate = {
        id: 'system-template-id',
        isSystem: true,
        familyId: null
      };

      mockPrismaClient.mealScheduleTemplate.findFirst.mockResolvedValue(mockSystemTemplate);
      mockPrismaClient.family.update.mockResolvedValue({ id: familyId });

      await setDefaultTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.family.update).toHaveBeenCalledWith({
        where: { id: familyId },
        data: { defaultTemplateId: 'system-template-id' }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should allow clearing default template with null', async () => {
      const familyId = 'test-family-id';
      mockRequest.params = { familyId };
      mockRequest.body = { templateId: null };

      mockPrismaClient.family.update.mockResolvedValue({ id: familyId });

      await setDefaultTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockPrismaClient.family.update).toHaveBeenCalledWith({
        where: { id: familyId },
        data: { defaultTemplateId: null }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
