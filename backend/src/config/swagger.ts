import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Family Planner API',
    version: '1.0.0',
    description: `
Family meal planning application with multi-dietary constraint support.

## Features
- **Multi-Dietary Constraints**: Kosher, Halal, Vegetarian, Vegan, Gluten-Free, Lactose-Free, Custom Allergies
- **Smart Weekly Planning**: Auto-generate weekly meal plans with 60-80% favorites + 1-2 novelties
- **Express Plan Mode**: Quick planning with only favorites (< 5 min validation)
- **Recipe Management**: Comprehensive recipe database with filtering
- **Shopping Lists**: Auto-generated, consolidated shopping lists with portion calculations
- **School Menu Integration**: Import school menus and avoid duplication
- **Family Collaboration**: RSVP, voting, guest management, wish lists

## Authentication
All protected endpoints require a JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Tokens can also be sent as HTTP-only cookies.

## Base URL
- Development: \`http://localhost:3001/api\`
- Production: \`https://your-domain.com/api\`
    `,
    contact: {
      name: 'Family Planner Support',
      email: 'support@familyplanner.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.familyplanner.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT token in HTTP-only cookie'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error'
          },
          message: {
            type: 'string',
            example: 'Error message'
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          firstName: {
            type: 'string'
          },
          lastName: {
            type: 'string'
          },
          language: {
            type: 'string',
            enum: ['fr', 'en', 'nl']
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      DietProfile: {
        type: 'object',
        properties: {
          kosher: {
            type: 'boolean',
            description: 'Follow kosher dietary laws'
          },
          kosherType: {
            type: 'string',
            enum: ['strict', 'moderate', 'flexible'],
            nullable: true
          },
          meatToMilkDelayHours: {
            type: 'integer',
            description: 'Hours to wait between meat and dairy (kosher)',
            default: 3
          },
          shabbatMode: {
            type: 'boolean',
            description: 'Observe Shabbat restrictions'
          },
          halal: {
            type: 'boolean'
          },
          halalType: {
            type: 'string',
            enum: ['strict', 'moderate'],
            nullable: true
          },
          vegetarian: {
            type: 'boolean'
          },
          vegan: {
            type: 'boolean'
          },
          pescatarian: {
            type: 'boolean'
          },
          glutenFree: {
            type: 'boolean'
          },
          lactoseFree: {
            type: 'boolean'
          },
          allergies: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of allergens to avoid'
          },
          favoriteRatio: {
            type: 'number',
            format: 'float',
            minimum: 0,
            maximum: 1,
            default: 0.6,
            description: 'Ratio of favorite recipes in weekly plan (0.6 = 60%)'
          },
          maxNovelties: {
            type: 'integer',
            minimum: 0,
            default: 2,
            description: 'Maximum number of new recipes per week'
          }
        }
      },
      Recipe: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          title: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          prepTime: {
            type: 'integer',
            description: 'Preparation time in minutes'
          },
          cookTime: {
            type: 'integer',
            description: 'Cooking time in minutes'
          },
          totalTime: {
            type: 'integer',
            description: 'Total time in minutes'
          },
          difficulty: {
            type: 'integer',
            minimum: 1,
            maximum: 5
          },
          kidsRating: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'How much kids typically like this recipe'
          },
          kosherCategory: {
            type: 'string',
            enum: ['meat', 'dairy', 'parve'],
            nullable: true
          },
          halalFriendly: {
            type: 'boolean'
          },
          glutenFree: {
            type: 'boolean'
          },
          lactoseFree: {
            type: 'boolean'
          },
          vegetarian: {
            type: 'boolean'
          },
          vegan: {
            type: 'boolean'
          },
          category: {
            type: 'string',
            description: 'Recipe category (pasta, chicken, fish, etc.)'
          },
          mealType: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['breakfast', 'lunch', 'dinner', 'snack']
            }
          },
          imageUrl: {
            type: 'string',
            format: 'uri'
          },
          servings: {
            type: 'integer',
            default: 4
          },
          budget: {
            type: 'string',
            enum: ['low', 'medium', 'high']
          },
          isFavorite: {
            type: 'boolean'
          },
          isNovelty: {
            type: 'boolean'
          },
          avgRating: {
            type: 'number',
            format: 'float',
            nullable: true
          }
        }
      },
      WeeklyPlan: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          familyId: {
            type: 'string',
            format: 'uuid'
          },
          weekStartDate: {
            type: 'string',
            format: 'date-time'
          },
          weekNumber: {
            type: 'integer'
          },
          year: {
            type: 'integer'
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'IN_VALIDATION', 'VALIDATED', 'LOCKED']
          },
          validatedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User registration, login, and authentication'
    },
    {
      name: 'Families',
      description: 'Family and member management'
    },
    {
      name: 'Recipes',
      description: 'Recipe management and catalog'
    },
    {
      name: 'Weekly Plans',
      description: 'Weekly meal planning and generation'
    },
    {
      name: 'Shopping Lists',
      description: 'Shopping list generation and management'
    },
    {
      name: 'School Menus',
      description: 'School menu integration'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './dist/routes/*.js',
    './dist/controllers/*.js'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
