import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import AdminJS from 'adminjs';
import * as AdminJSPrisma from '@adminjs/prisma';
import { ComponentLoader } from 'adminjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Database, Resource, getModelByName } = AdminJSPrisma;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Component loader for custom components
const componentLoader = new ComponentLoader();

// Load dashboard component
const DashboardComponent = componentLoader.add('Dashboard', '../admin/scraper-action');

// Load schedule editor component
const ScheduleEditorComponent = componentLoader.add(
  'ScheduleEditor',
  '../admin/components/ScheduleEditor'
);

// Register the Prisma adapter
AdminJS.registerAdapter({ Database, Resource });

// Initialize Prisma client
const prisma = new PrismaClient();

// Create AdminJS configuration
export const createAdminConfig = () => {
  const admin = new AdminJS({
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
        resource: { model: getModelByName('MealScheduleTemplate'), client: prisma },
        options: {
          properties: {
            // Hide all the flattened schedule properties
            ...Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [
                `schedule.${i}.dayOfWeek`,
                { isVisible: false },
              ])
            ),
            ...Object.fromEntries(
              Array.from({ length: 10 }, (_, i) => [
                `schedule.${i}.mealTypes`,
                { isVisible: false },
              ])
            ),
            // Create a custom schedule property with visual editor
            scheduleJson: {
              type: 'string',
              isVisible: { list: false, show: true, edit: true, filter: false },
              components: {
                edit: ScheduleEditorComponent,
              },
            },
            isSystem: {
              isVisible: { list: true, show: true, edit: true, filter: true },
            },
            familyId: {
              isVisible: { list: true, show: true, edit: true, filter: true },
            },
            description: {
              isVisible: { list: false, show: true, edit: true, filter: false },
            },
            createdAt: {
              isVisible: { list: true, show: true, edit: false, filter: true },
            },
            updatedAt: {
              isVisible: { list: true, show: true, edit: false, filter: false },
            },
          },
          actions: {
            show: {
              after: async (response: any) => {
                // Reconstruct schedule from flattened properties
                const schedule: any[] = [];
                const params = response.record.params;
                let i = 0;
                while (params[`schedule.${i}.dayOfWeek`]) {
                  const dayOfWeek = params[`schedule.${i}.dayOfWeek`];
                  const mealTypes: string[] = [];
                  let j = 0;
                  while (params[`schedule.${i}.mealTypes.${j}`]) {
                    mealTypes.push(params[`schedule.${i}.mealTypes.${j}`]);
                    j++;
                  }
                  schedule.push({ dayOfWeek, mealTypes });
                  i++;
                }
                response.record.params.scheduleJson = JSON.stringify(schedule, null, 2);
                return response;
              },
            },
            edit: {
              after: async (response: any) => {
                // Reconstruct schedule from flattened properties
                const schedule: any[] = [];
                const params = response.record.params;
                let i = 0;
                while (params[`schedule.${i}.dayOfWeek`]) {
                  const dayOfWeek = params[`schedule.${i}.dayOfWeek`];
                  const mealTypes: string[] = [];
                  let j = 0;
                  while (params[`schedule.${i}.mealTypes.${j}`]) {
                    mealTypes.push(params[`schedule.${i}.mealTypes.${j}`]);
                    j++;
                  }
                  schedule.push({ dayOfWeek, mealTypes });
                  i++;
                }
                response.record.params.scheduleJson = JSON.stringify(schedule, null, 2);
                return response;
              },
              before: async (request: any, context: any) => {
                if (request.payload?.scheduleJson) {
                  try {
                    const schedule = JSON.parse(request.payload.scheduleJson);
                    // Update the database directly with Prisma
                    await prisma.mealScheduleTemplate.update({
                      where: { id: context.record?.id() },
                      data: { schedule },
                    });
                    // Remove scheduleJson from payload to avoid saving it
                    delete request.payload.scheduleJson;
                  } catch (e: any) {
                    throw new Error('Invalid JSON format for schedule field: ' + e.message);
                  }
                }
                return request;
              },
            },
            new: {
              before: async (request: any) => {
                if (request.payload?.scheduleJson) {
                  try {
                    request.payload.schedule = JSON.parse(request.payload.scheduleJson);
                    delete request.payload.scheduleJson;
                  } catch (e: any) {
                    throw new Error('Invalid JSON format for schedule field: ' + e.message);
                  }
                }
                return request;
              },
            },
          },
          navigation: {
            name: 'Planning',
            icon: 'Clock',
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
    dashboard: {
      component: DashboardComponent,
    },
    branding: {
      companyName: 'Family Planner Admin',
      logo: false,
      withMadeWithLove: false,
    },
    rootPath: '/admin',
    componentLoader,
  });

  return admin;
};

export { prisma };
