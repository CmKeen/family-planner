# Admin Interface Documentation

This document explains how to set up and use the backend admin interface for the Family Planner application.

## Overview

The Family Planner backend includes a comprehensive admin interface powered by **AdminJS** (similar to Django Admin). This interface allows administrators to manage all backend objects including users, families, recipes, weekly plans, shopping lists, and more.

## Features

- **Automatic CRUD Interface**: All 16 database models are automatically exposed with create, read, update, and delete operations
- **Authentication**: Integrated with the existing JWT authentication system
- **Role-Based Access**: Only users with `isAdmin: true` can access the admin panel
- **Organized Navigation**: Models are grouped by category (User Management, Family Management, Recipe Management, etc.)
- **Data Relationships**: Full support for relationships between models
- **Search & Filter**: Built-in search and filtering capabilities
- **Pagination**: Automatic pagination for large datasets

## Available Models

The admin interface provides management for all these models:

### User Management
- **User** - System users with email, password, and admin privileges

### Family Management
- **Family** - Family groups
- **FamilyMember** - Members within families with roles (ADMIN, PARENT, MEMBER, CHILD)
- **DietProfile** - Dietary constraints and preferences

### Recipe Management
- **Recipe** - Recipe database with dietary tags and ratings
- **Ingredient** - Recipe ingredients with allergen tracking
- **Instruction** - Step-by-step cooking instructions

### Planning
- **WeeklyPlan** - Weekly meal schedules
- **Meal** - Individual meals in weekly plans
- **Wish** - Meal requests from family members

### Engagement
- **Attendance** - RSVP tracking for meals
- **Guest** - Guest tracking for meals
- **Vote** - Family member votes on meals
- **Feedback** - Post-meal feedback and ratings

### Shopping & Inventory
- **ShoppingList** - Generated shopping lists
- **ShoppingItem** - Individual shopping items
- **InventoryItem** - Pantry/fridge inventory

### School Integration
- **SchoolMenu** - School menu integration

## Setup Instructions

### 1. Run Database Migration

First, apply the database migration to add the `isAdmin` field to the User model:

```bash
cd backend
npx prisma migrate dev --name add_admin_flag_to_user
```

If you encounter network issues with Prisma, you can set the environment variable:

```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate dev --name add_admin_flag_to_user
```

### 2. Create Your First Admin User

You have two options:

#### Option A: Promote an Existing User

If you already have a user account, promote it to admin:

```bash
npm run make-admin your-email@example.com
```

Example:
```bash
npm run make-admin admin@familyplanner.com
```

#### Option B: Create a New User via API

1. Register a new user via the API:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@familyplanner.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

2. Then promote them to admin:
```bash
npm run make-admin admin@familyplanner.com
```

### 3. Start the Server

```bash
npm run dev
```

You should see output like:
```
🚀 Family Planner API Server Started Successfully!
   📍 Port: 3000
   📝 Environment: development
   🔑 Admin Panel: http://localhost:3000/admin (requires admin user)
   📚 API Documentation: http://localhost:3000/api-docs
```

## Accessing the Admin Panel

### 1. Get Your Authentication Token

Login via the API to get a JWT token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@familyplanner.com",
    "password": "YourSecurePassword123!"
  }'
```

This will return:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@familyplanner.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### 2. Access the Admin Panel

There are two ways to authenticate:

#### Method 1: Using Browser Developer Tools (Recommended)

1. Open your browser and go to `http://localhost:3000/admin`
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Set the token as a cookie:
```javascript
document.cookie = "token=YOUR_JWT_TOKEN_HERE; path=/; SameSite=Lax"
```
5. Refresh the page

#### Method 2: Using an HTTP Client Extension

Use a browser extension like:
- **ModHeader** (Chrome/Firefox)
- **Requestly** (Chrome/Firefox)

Add a header:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

Then navigate to `http://localhost:3000/admin`

## Managing Admin Users

### Promote a User to Admin

```bash
npm run make-admin user@example.com
```

Output:
```
✅ Successfully promoted user@example.com to admin

User details:
  ID: abc-123-def
  Name: John Doe
  Email: user@example.com
  Admin: true
```

### Revoke Admin Privileges

```bash
npm run revoke-admin user@example.com
```

Output:
```
✅ Successfully revoked admin privileges from user@example.com

User details:
  ID: abc-123-def
  Name: John Doe
  Email: user@example.com
  Admin: false
```

## Security Considerations

1. **Authentication Required**: The admin panel is protected by the `authenticateAdmin` middleware which:
   - Validates the JWT token
   - Checks if the user exists
   - Verifies the user has `isAdmin: true`

2. **No Public Access**: The admin panel cannot be accessed without a valid admin user token

3. **Session Secret**: The admin panel uses a session secret from `SESSION_SECRET` or falls back to `JWT_SECRET`

4. **HTTPS in Production**: In production, cookies are set with the `secure` flag (HTTPS only)

5. **Admin Audit**: All admin actions are logged through the Winston logger

## Environment Variables

The admin panel uses the following environment variables:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/family_planner
JWT_SECRET=your-secret-key-here

# Optional (for admin panel session)
SESSION_SECRET=your-session-secret-here

# Production settings
NODE_ENV=production
```

## Troubleshooting

### Issue: "Authentication required" when accessing /admin

**Solution**: Make sure you're authenticated. Set the JWT token as a cookie or authorization header.

### Issue: "Admin access required" when accessing /admin

**Solution**: Your user account doesn't have admin privileges. Run:
```bash
npm run make-admin your-email@example.com
```

### Issue: Admin panel shows empty/no data

**Solution**: Make sure your database has data. You can seed it with:
```bash
npm run prisma:seed
```

### Issue: Cannot promote user - "User not found"

**Solution**: Make sure the user exists first. Register via the API or check the email spelling.

## Advanced Usage

### Customizing the Admin Interface

The admin configuration is in `backend/src/config/admin.ts`. You can customize:

- Model properties visibility
- Custom actions
- Navigation grouping
- Icons
- Branding

### Adding Custom Actions

Edit `backend/src/config/admin.ts` and add custom actions to any resource:

```typescript
{
  resource: { model: getModelByName('User'), client: prisma },
  options: {
    actions: {
      sendWelcomeEmail: {
        actionType: 'record',
        handler: async (request, response, context) => {
          // Custom action logic
        },
      },
    },
  },
}
```

### Custom Filters

You can add custom filters in the admin config:

```typescript
properties: {
  createdAt: {
    isVisible: { list: true, show: true, edit: false, filter: true },
  },
}
```

## API Endpoints vs Admin Panel

**API Endpoints** (`/api/*`):
- Used by the frontend application
- Family-scoped access control
- Rate limited
- Public-facing

**Admin Panel** (`/admin`):
- Used by system administrators
- Global access to all data
- System-level management
- Internal use only

## Next Steps

1. Create your first admin user following the setup instructions above
2. Access the admin panel at `http://localhost:3000/admin`
3. Explore the different models and their relationships
4. Customize the admin interface as needed for your use case

## Support

For issues or questions:
1. Check the AdminJS documentation: https://docs.adminjs.co/
2. Review the Prisma documentation: https://www.prisma.io/docs/
3. Check the application logs for error messages
