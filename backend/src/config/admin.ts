import AdminJS from 'adminjs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use require for @adminjs/prisma to avoid ESM/CommonJS conflicts
const AdminJSPrisma = require('@adminjs/prisma');
const { Database, Resource, getModelByName } = AdminJSPrisma;

// Register the Prisma adapter
AdminJS.registerAdapter({ Database, Resource });

// Initialize Prisma client
const prisma = new PrismaClient();

// Create AdminJS configuration
export const createAdminConfig = () => {
  return new AdminJS({
    databases: [],
    resources: [
      // User Management
      {
        resource: { model: getModelByName('User'), client: prisma },
        options: {
          properties: {
            password: {
              isVisible: { list: false, show: false, edit: true, filter: false },
            },
            isAdmin: {
              isVisible: true,
            },
            createdAt: {
              isVisible: { list: true, show: true, edit: false, filter: true },
            },
            updatedAt: {
              isVisible: { list: true, show: true, edit: false, filter: false },
            },
          },
          actions: {
            new: {
              before: async (request: any) => {
                if (request.payload?.password) {
                  request.payload.password = await bcrypt.hash(request.payload.password, 10);
                }
                return request;
              },
            },
            edit: {
              before: async (request: any) => {
                if (request.payload?.password) {
                  request.payload.password = await bcrypt.hash(request.payload.password, 10);
                }
                return request;
              },
            },
          },
          navigation: {
            name: 'User Management',
            icon: 'User',
          },
        },
      },
      // Family Management
      {
        resource: { model: getModelByName('Family'), client: prisma },
        options: {
          navigation: {
            name: 'Family Management',
            icon: 'Home',
          },
        },
      },
      {
        resource: { model: getModelByName('FamilyMember'), client: prisma },
        options: {
          navigation: {
            name: 'Family Management',
            icon: 'Users',
          },
        },
      },
      {
        resource: { model: getModelByName('DietProfile'), client: prisma },
        options: {
          navigation: {
            name: 'Family Management',
            icon: 'Heart',
          },
        },
      },
      // Recipe Management
      {
        resource: { model: getModelByName('Recipe'), client: prisma },
        options: {
          properties: {
            imageUrl: {
              type: 'string',
            },
            thumbnailUrl: {
              type: 'string',
            },
          },
          navigation: {
            name: 'Recipe Management',
            icon: 'Book',
          },
        },
      },
      {
        resource: { model: getModelByName('Ingredient'), client: prisma },
        options: {
          navigation: {
            name: 'Recipe Management',
            icon: 'ShoppingCart',
          },
        },
      },
      {
        resource: { model: getModelByName('Instruction'), client: prisma },
        options: {
          navigation: {
            name: 'Recipe Management',
            icon: 'List',
          },
        },
      },
      // Weekly Planning
      {
        resource: { model: getModelByName('WeeklyPlan'), client: prisma },
        options: {
          navigation: {
            name: 'Planning',
            icon: 'Calendar',
          },
        },
      },
      {
        resource: { model: getModelByName('Meal'), client: prisma },
        options: {
          navigation: {
            name: 'Planning',
            icon: 'Coffee',
          },
        },
      },
      {
        resource: { model: getModelByName('Wish'), client: prisma },
        options: {
          navigation: {
            name: 'Planning',
            icon: 'Star',
          },
        },
      },
      // Attendance & Feedback
      {
        resource: { model: getModelByName('Attendance'), client: prisma },
        options: {
          navigation: {
            name: 'Engagement',
            icon: 'CheckCircle',
          },
        },
      },
      {
        resource: { model: getModelByName('Guest'), client: prisma },
        options: {
          navigation: {
            name: 'Engagement',
            icon: 'UserPlus',
          },
        },
      },
      {
        resource: { model: getModelByName('Vote'), client: prisma },
        options: {
          navigation: {
            name: 'Engagement',
            icon: 'ThumbsUp',
          },
        },
      },
      {
        resource: { model: getModelByName('Feedback'), client: prisma },
        options: {
          navigation: {
            name: 'Engagement',
            icon: 'MessageCircle',
          },
        },
      },
      // Shopping & Inventory
      {
        resource: { model: getModelByName('ShoppingList'), client: prisma },
        options: {
          navigation: {
            name: 'Shopping & Inventory',
            icon: 'ShoppingBag',
          },
        },
      },
      {
        resource: { model: getModelByName('ShoppingItem'), client: prisma },
        options: {
          navigation: {
            name: 'Shopping & Inventory',
            icon: 'Package',
          },
        },
      },
      {
        resource: { model: getModelByName('InventoryItem'), client: prisma },
        options: {
          navigation: {
            name: 'Shopping & Inventory',
            icon: 'Archive',
          },
        },
      },
      // School Integration
      {
        resource: { model: getModelByName('SchoolMenu'), client: prisma },
        options: {
          navigation: {
            name: 'School Integration',
            icon: 'Briefcase',
          },
        },
      },
    ],
    branding: {
      companyName: 'Family Planner Admin',
      logo: false,
      withMadeWithLove: false,
    },
    rootPath: '/admin',
  });
};

export { prisma };
