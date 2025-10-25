# Family Planner - Comprehensive Codebase Documentation

**Last Updated:** October 25, 2025

> A full-stack family meal planning SaaS application with multi-dietary constraint support, flexible scheduling, and smart recipe selection.

---

## Table of Contents

1. [Development Philosophy & Requirements](#1-development-philosophy--requirements)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Key Features Implementation](#8-key-features-implementation)
9. [Development Workflow](#9-development-workflow)
10. [Configuration](#10-configuration)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment](#12-deployment)
13. [Admin Panel](#13-admin-panel)

---

## 1. Development Philosophy & Requirements

### 🚨 CRITICAL: Test-Driven Development (TDD)

**This project REQUIRES test-driven development. You MUST write tests BEFORE implementing features.**

#### TDD Workflow (MANDATORY)

```bash
# RED → GREEN → REFACTOR cycle

1. RED: Write a failing test first
   - Define expected behavior
   - Test should fail (feature doesn't exist yet)

2. GREEN: Write minimal code to pass the test
   - Implement just enough to make test pass
   - Don't over-engineer

3. REFACTOR: Clean up code
   - Optimize implementation
   - Maintain passing tests
```

#### When to Write Tests

**Backend:**
- ✅ **BEFORE** implementing any controller method
- ✅ **BEFORE** adding new API endpoints
- ✅ **BEFORE** modifying business logic
- ✅ **BEFORE** adding database queries

**Frontend:**
- ✅ **BEFORE** creating new pages
- ✅ **BEFORE** adding complex components
- ✅ **BEFORE** implementing user interactions
- ✅ **BEFORE** modifying state management

#### Test Coverage Requirements

```typescript
// Minimum coverage thresholds:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

// Critical paths require 100% coverage:
- Authentication & authorization
- Payment processing (if applicable)
- Data mutations (create, update, delete)
- Security-sensitive operations
```

#### Example TDD Flow

**Backend Example:**
```typescript
// 1. RED: Write failing test FIRST
describe('POST /api/recipes', () => {
  it('should create a new recipe with valid data', async () => {
    const newRecipe = {
      title: 'Pasta Carbonara',
      prepTime: 15,
      cookTime: 20,
      // ... other fields
    };

    const response = await request(app)
      .post('/api/recipes')
      .send(newRecipe)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.recipe.title).toBe('Pasta Carbonara');
  });
});

// 2. GREEN: Run test (it fails)
// npm test -- recipe.controller.test.ts
// Expected: 201, Received: 404 (endpoint doesn't exist)

// 3. GREEN: Implement controller
export const createRecipe = asyncHandler(async (req, res) => {
  // Implementation here...
});

// 4. GREEN: Run test again (it passes)

// 5. REFACTOR: Clean up code while keeping tests green
```

**Frontend Example:**
```typescript
// 1. RED: Write failing test FIRST
describe('RecipeCard', () => {
  it('should display recipe title and cooking time', () => {
    const recipe = {
      id: '1',
      title: 'Pasta Carbonara',
      totalTime: 35,
      imageUrl: 'https://example.com/pasta.jpg'
    };

    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText('35 min')).toBeInTheDocument();
  });
});

// 2. GREEN: Run test (it fails - component doesn't exist)
// 3. GREEN: Create component
// 4. REFACTOR: Clean up
```

#### No Exceptions Policy

**❌ NEVER:**
- Write code without tests
- "Test later" (you won't)
- Skip tests for "quick fixes"
- Commit untested code

**✅ ALWAYS:**
- Write tests first
- Run tests before committing
- Maintain test coverage
- Update tests when changing code

---

### 🌍 CRITICAL: Multi-Lingual Requirements

**This is a multi-lingual application. ALL user-facing content MUST be translated.**

#### Supported Languages

```typescript
Languages (in order of priority):
1. French (fr) - Default language
2. English (en)
3. Dutch (nl)
```

#### What Needs Translation

**Backend (Database):**
```prisma
// Multi-lingual fields in models
Recipe:
  - title / titleEn
  - description / descriptionEn

Ingredient:
  - name / nameEn

Instruction:
  - text / textEn

ShoppingItem:
  - name / nameEn
```

**Frontend (i18n):**
```typescript
// ALL user-facing text must be in locales/*.json

❌ WRONG:
<button>Create Recipe</button>
<h1>Welcome to Family Planner</h1>

✅ CORRECT:
<button>{t('recipes.create')}</button>
<h1>{t('dashboard.welcome', { name: user.firstName })}</h1>
```

#### Translation Workflow (MANDATORY)

```typescript
// 1. Add keys to ALL locale files
// locales/fr.json
{
  "recipes": {
    "create": "Créer une recette",
    "edit": "Modifier"
  }
}

// locales/en.json
{
  "recipes": {
    "create": "Create Recipe",
    "edit": "Edit"
  }
}

// locales/nl.json
{
  "recipes": {
    "create": "Recept maken",
    "edit": "Bewerken"
  }
}

// 2. Use in components
import { useTranslation } from 'react-i18next';

const RecipesPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('recipes.title')}</h1>
      <button>{t('recipes.create')}</button>
    </div>
  );
};
```

#### Translation Checklist

**Before committing ANY UI change:**
- [ ] All text extracted to i18n keys
- [ ] Keys added to fr.json (French)
- [ ] Keys added to en.json (English)
- [ ] Keys added to nl.json (Dutch)
- [ ] Tested in all 3 languages
- [ ] No hardcoded strings in JSX
- [ ] Pluralization handled correctly
- [ ] Date/time formatting uses i18n

#### Common Mistakes to Avoid

```typescript
❌ NEVER DO THIS:
<p>There are {count} recipes</p>
<p>{new Date().toLocaleDateString()}</p>
<p>€{price.toFixed(2)}</p>

✅ ALWAYS DO THIS:
<p>{t('recipes.count', { count })}</p>  // Uses pluralization
<p>{formatDate(date, i18n.language)}</p>
<p>{formatCurrency(price, i18n.language)}</p>
```

---

### 🐳 Docker-First Development

**This project uses Docker for ALL development. NO local installations required.**

#### Why Docker?

```bash
✅ Consistent environment across team
✅ No "works on my machine" issues
✅ Isolated dependencies
✅ Easy onboarding for new developers
✅ Production parity
```

#### Docker Development Stack

```yaml
# docker-compose.dev.yml
services:
  postgres:      # PostgreSQL 15 database
  backend:       # Node.js + Express API
  frontend:      # React + Vite dev server
  adminer:       # Database GUI (optional)
```

#### MANDATORY: Use Docker Commands

```bash
# ❌ NEVER run locally:
npm install
npm run dev
node index.js

# ✅ ALWAYS use Docker:
docker-compose -f docker-compose.dev.yml up
docker-compose exec backend npm install
docker-compose exec backend npm test
```

#### Development Workflow with Docker

```bash
# Start entire stack
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run commands in containers
docker-compose exec backend npm test
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run make-admin -- user@example.com

# Install new dependencies
docker-compose exec backend npm install <package>
docker-compose restart backend  # Restart after install

# Stop stack
docker-compose down

# Rebuild after changes (Dockerfile, package.json)
docker-compose build
```

#### Hot Reloading

```bash
# Both backend and frontend support hot reloading
# Changes to source files automatically reload

Backend: Nodemon watches src/**/*.ts
Frontend: Vite HMR watches src/**/*.tsx

# No restart needed for code changes!
```

#### Troubleshooting Docker

```bash
# Containers not starting?
docker-compose down -v  # Remove volumes
docker-compose build --no-cache
docker-compose up

# Permission issues?
docker-compose exec backend chown -R node:node /app

# Database issues?
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend npm run prisma:migrate

# View container status
docker-compose ps

# Shell into containers
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres
```

---

### 🔍 Chrome DevTools MCP - Verification Required

**CRITICAL: You MUST verify your work using Chrome DevTools MCP before marking tasks complete.**

#### What is Chrome MCP?

Chrome MCP (Model Context Protocol) allows AI assistants to:
- Navigate web applications
- Take screenshots
- Interact with UI elements
- Verify functionality
- Check console errors
- Monitor network requests

#### Verification Workflow (MANDATORY)

```typescript
// After implementing ANY feature:

1. START: Launch the application
   - docker-compose -f docker-compose.dev.yml up
   - Wait for services to be ready

2. NAVIGATE: Open the relevant page
   - Use Chrome MCP to navigate to feature
   - Take snapshot of page state

3. INTERACT: Test the feature
   - Click buttons
   - Fill forms
   - Submit data
   - Verify responses

4. VERIFY: Check results
   - Screenshot before/after states
   - Check console for errors
   - Verify network requests (status codes, payloads)
   - Confirm UI updates correctly

5. LANGUAGES: Test in all 3 languages
   - Switch to French → verify
   - Switch to English → verify
   - Switch to Dutch → verify

6. DOCUMENT: Report findings
   - Screenshot working feature
   - Note any issues found
   - Confirm all acceptance criteria met
```

#### Example Verification Process

**Feature: Create Recipe**

```typescript
// Step 1: Navigate to recipes page
await mcp.navigate('http://localhost:5173/recipes');
await mcp.takeSnapshot();  // Verify page loads

// Step 2: Open create dialog
await mcp.click('[data-testid="create-recipe-button"]');
await mcp.takeSnapshot();  // Verify dialog opens

// Step 3: Fill form
await mcp.fill('[name="title"]', 'Test Recipe');
await mcp.fill('[name="prepTime"]', '15');
await mcp.fill('[name="cookTime"]', '30');

// Step 4: Submit
await mcp.click('[type="submit"]');
await mcp.waitFor('Test Recipe');  // Wait for success

// Step 5: Verify
await mcp.takeSnapshot();  // Confirm recipe in list

// Step 6: Check console
const consoleErrors = await mcp.listConsoleMessages({ types: ['error'] });
// Should be empty!

// Step 7: Check network
const requests = await mcp.listNetworkRequests();
const createRequest = requests.find(r => r.url.includes('/api/recipes'));
// Verify: POST /api/recipes → 201 Created

// Step 8: Test translations
await mcp.click('[data-testid="language-switcher"]');
await mcp.click('[data-language="en"]');
await mcp.takeSnapshot();  // Verify English UI

await mcp.click('[data-language="nl"]');
await mcp.takeSnapshot();  // Verify Dutch UI
```

#### Verification Checklist

**Before marking ANY task complete:**
- [ ] Feature works in browser (Chrome MCP verified)
- [ ] No console errors
- [ ] Network requests succeed (2xx status codes)
- [ ] UI updates correctly
- [ ] Works in French
- [ ] Works in English
- [ ] Works in Dutch
- [ ] Mobile responsive (test viewport resize)
- [ ] Error cases handled gracefully
- [ ] Loading states display correctly

#### What to Verify

**Backend Features:**
```typescript
✓ API endpoints return correct status codes
✓ Response data matches expected schema
✓ Database records created/updated correctly
✓ Authentication/authorization working
✓ Error messages translated
✓ Rate limiting enforced
```

**Frontend Features:**
```typescript
✓ Page renders without errors
✓ Forms submit successfully
✓ Validation messages display
✓ Loading spinners show during requests
✓ Success/error toasts appear
✓ Data refreshes after mutations
✓ All text translated
✓ Images load
✓ Responsive design works
```

#### Chrome MCP Commands Reference

```typescript
// Navigation
mcp.navigate(url)
mcp.navigate_page_history('back' | 'forward')

// Interaction
mcp.click(selector)
mcp.fill(selector, value)
mcp.fill_form([{ selector, value }, ...])
mcp.hover(selector)

// Observation
mcp.take_snapshot()
mcp.take_screenshot()
mcp.list_console_messages()
mcp.list_network_requests()
mcp.get_network_request(requestId)

// Waiting
mcp.wait_for(text, timeout)

// Inspection
mcp.evaluate_script(functionString)
```

---

### 📋 Coding Standards & Best Practices

**These standards are MANDATORY for all code contributions.**

#### TypeScript Standards

**Type Safety:**
```typescript
// ❌ NEVER use 'any'
function processData(data: any) { }

// ✅ ALWAYS use proper types
interface Recipe {
  id: string;
  title: string;
  prepTime: number;
}

function processRecipe(recipe: Recipe) { }

// ✅ Use generics for reusable functions
function getById<T>(id: string, collection: T[]): T | undefined {
  return collection.find(item => item.id === id);
}
```

**Strict Mode:**
```json
// tsconfig.json - ALL projects
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**Interfaces vs Types:**
```typescript
// ✅ Use interfaces for object shapes (can be extended)
interface User {
  id: string;
  email: string;
}

interface AdminUser extends User {
  isAdmin: true;
}

// ✅ Use types for unions, intersections, primitives
type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;
```

#### Naming Conventions

```typescript
// Variables & Functions: camelCase
const userName = 'John';
function getUserById(id: string) { }

// Classes & Interfaces: PascalCase
class RecipeService { }
interface WeeklyPlan { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// Private class members: _camelCase (prefix with underscore)
class AuthService {
  private _token: string;

  private _validateToken() { }
}

// Boolean variables: is/has/can prefix
const isAuthenticated = true;
const hasPermission = false;
const canEdit = true;

// Arrays: plural nouns
const recipes = [];
const users = [];

// Functions: verb + noun
function createRecipe() { }
function updateUser() { }
function deleteWeeklyPlan() { }
function validateInput() { }
```

#### File Naming

```bash
# React Components: PascalCase
RecipesPage.tsx
RecipeCard.tsx
LanguageSwitcher.tsx

# Other TypeScript files: camelCase
auth.controller.ts
recipe.service.ts
api.utils.ts

# Test files: same name + .test
recipe.controller.test.ts
RecipeCard.test.tsx

# Config files: kebab-case
docker-compose.yml
tsconfig.json
.eslintrc.js
```

#### Code Organization

**File Length Limits:**
```typescript
// ⚠️ If file exceeds these limits, split it:
Controllers: 300 lines max
Components: 200 lines max
Services: 400 lines max

// Split large files into:
recipe.controller.ts
  ↓ splits into ↓
recipe-create.controller.ts
recipe-update.controller.ts
recipe-query.controller.ts
```

**Imports Order:**
```typescript
// 1. External libraries
import express from 'express';
import { z } from 'zod';

// 2. Internal modules (absolute paths)
import { prisma } from '@/lib/prisma';
import { logger } from '@/config/logger';

// 3. Relative imports (same directory)
import { hashPassword } from './auth.utils';
import { validateRecipe } from './validators';

// 4. Types
import type { Request, Response } from 'express';
import type { Recipe } from '@prisma/client';
```

**Function Organization:**
```typescript
// Order within files:
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Main exported functions (most important first)
// 5. Helper functions (private/internal)
// 6. Exports

// Example:
import { prisma } from '../lib/prisma';

interface CreateRecipeDto {
  title: string;
  prepTime: number;
}

const MAX_TITLE_LENGTH = 100;

export async function createRecipe(dto: CreateRecipeDto) {
  validateTitle(dto.title);
  return await saveRecipe(dto);
}

function validateTitle(title: string) {
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error('Title too long');
  }
}

async function saveRecipe(dto: CreateRecipeDto) {
  return prisma.recipe.create({ data: dto });
}
```

#### Error Handling

**Backend:**
```typescript
// ✅ ALWAYS use custom error classes
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// ✅ Throw meaningful errors
if (!recipe) {
  throw new AppError('Recipe not found', 404);
}

if (!user.isAdmin) {
  throw new AppError('Insufficient permissions', 403);
}

// ✅ Use asyncHandler wrapper
export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: req.params.id }
  });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  res.json({ status: 'success', data: { recipe } });
});

// ❌ NEVER swallow errors silently
try {
  await doSomething();
} catch (error) {
  // Don't do this!
}

// ✅ Log and re-throw or handle appropriately
try {
  await doSomething();
} catch (error) {
  logger.error('Failed to do something', { error });
  throw new AppError('Operation failed', 500);
}
```

**Frontend:**
```typescript
// ✅ Use try-catch with async/await
async function createRecipe(data: RecipeFormData) {
  try {
    setLoading(true);
    const recipe = await recipeAPI.create(data);
    toast.success(t('recipes.createSuccess'));
    return recipe;
  } catch (error) {
    const message = error.response?.data?.message || t('errors.generic');
    toast.error(message);
    logger.error('Failed to create recipe', { error });
  } finally {
    setLoading(false);
  }
}

// ✅ Error boundaries for component errors
<ErrorBoundary fallback={<ErrorFallback />}>
  <RecipesPage />
</ErrorBoundary>
```

#### Async/Await Best Practices

```typescript
// ✅ Use async/await (not .then/.catch)
async function getRecipes() {
  const recipes = await prisma.recipe.findMany();
  return recipes;
}

// ❌ Don't use .then/.catch
function getRecipes() {
  return prisma.recipe.findMany()
    .then(recipes => recipes)
    .catch(error => console.error(error));
}

// ✅ Parallel execution for independent operations
const [recipes, families, users] = await Promise.all([
  prisma.recipe.findMany(),
  prisma.family.findMany(),
  prisma.user.findMany()
]);

// ✅ Sequential for dependent operations
const user = await prisma.user.create({ data: userData });
const family = await prisma.family.create({
  data: { ...familyData, creatorId: user.id }
});
```

#### Comments & Documentation

```typescript
// ✅ Write self-documenting code (prefer clear names over comments)
// BAD:
// Get user by id
function gubi(i: string) { }

// GOOD:
function getUserById(id: string) { }

// ✅ Comment WHY, not WHAT
// BAD:
// Loop through recipes
for (const recipe of recipes) { }

// GOOD:
// Skip recipes with missing images to avoid broken UI
for (const recipe of recipes.filter(r => r.imageUrl)) { }

// ✅ JSDoc for public APIs
/**
 * Creates a new weekly meal plan for a family.
 *
 * @param familyId - The UUID of the family
 * @param weekStartDate - Monday of the target week
 * @param templateId - Optional meal schedule template to use
 * @returns The created weekly plan with generated meals
 * @throws {AppError} 404 if family not found
 * @throws {AppError} 400 if invalid date provided
 */
export async function generateWeeklyPlan(
  familyId: string,
  weekStartDate: Date,
  templateId?: string
): Promise<WeeklyPlan> {
  // Implementation...
}

// ✅ TODO comments with context
// TODO(oliver): Implement caching after user feedback - 2025-10-25
// TODO: Optimize query performance (n+1 issue) - see ticket #123

// ❌ NEVER commit commented-out code
// const oldFunction = () => {
//   // old implementation
// };
```

#### Performance Best Practices

**Database Queries:**
```typescript
// ✅ Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    firstName: true
    // Don't select password!
  }
});

// ✅ Use includes for relations (avoid n+1)
const recipes = await prisma.recipe.findMany({
  include: {
    ingredients: true,
    instructions: true
  }
});

// ✅ Paginate large datasets
const recipes = await prisma.recipe.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});

// ✅ Use transactions for multiple mutations
await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.family.create({ data: familyData }),
  prisma.dietProfile.create({ data: profileData })
]);
```

**React Performance:**
```typescript
// ✅ Use React.memo for expensive components
export const RecipeCard = React.memo(({ recipe }: Props) => {
  // Component implementation
});

// ✅ Use useMemo for expensive calculations
const sortedRecipes = useMemo(() => {
  return recipes.sort((a, b) => a.title.localeCompare(b.title));
}, [recipes]);

// ✅ Use useCallback for functions passed to children
const handleClick = useCallback(() => {
  setSelected(recipe.id);
}, [recipe.id]);

// ✅ Lazy load routes
const RecipesPage = lazy(() => import('./pages/RecipesPage'));
```

#### Security Best Practices

```typescript
// ✅ Validate ALL user input
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const validated = schema.parse(req.body);

// ✅ Sanitize user input
import validator from 'validator';

const cleanEmail = validator.normalizeEmail(email);
const escapedText = validator.escape(userInput);

// ✅ Never expose sensitive data
const user = await prisma.user.findUnique({ where: { id } });
const { password, ...safeUser } = user;  // Remove password
res.json({ data: { user: safeUser } });

// ✅ Use parameterized queries (Prisma does this automatically)
// BAD (SQL injection):
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// GOOD:
await prisma.user.findUnique({ where: { email } });

// ✅ Rate limit sensitive endpoints
app.post('/api/auth/login', authLimiter, loginController);

// ✅ Hash passwords before storing
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
```

#### Git Commit Conventions

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting, semicolons, etc.)
refactor: Code refactoring (no functional changes)
perf:     Performance improvements
test:     Adding or updating tests
chore:    Build process, dependencies, etc.

# Examples:
git commit -m "feat(recipes): add multi-language recipe search"
git commit -m "fix(auth): resolve JWT expiration issue"
git commit -m "test(weeklyPlan): add integration tests for meal generation"
git commit -m "docs(api): update Swagger documentation for recipes endpoint"
git commit -m "refactor(controllers): extract validation logic to middleware"
git commit -m "chore(deps): upgrade Prisma to v5.7.0"

# Breaking changes:
git commit -m "feat(api): redesign recipe search API

BREAKING CHANGE: /api/recipes/search now requires 'familyId' parameter"
```

#### Code Review Checklist

**Before submitting PR:**
- [ ] Tests written FIRST (TDD)
- [ ] All tests pass
- [ ] Code coverage meets thresholds
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Formatted with Prettier (`npm run format`)
- [ ] Translations added for all 3 languages
- [ ] Verified with Chrome MCP
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No hardcoded credentials or secrets
- [ ] Documentation updated
- [ ] Meaningful commit messages

**Reviewers should verify:**
- [ ] Code follows TDD approach
- [ ] Tests are meaningful (not just for coverage)
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Error handling appropriate
- [ ] Translations complete
- [ ] API backward compatible (or breaking change documented)
- [ ] Database migrations safe (reversible)

#### DRY Principle (Don't Repeat Yourself)

```typescript
// ❌ BAD: Duplicated logic
function createRecipe(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
  if (!data.prepTime || data.prepTime < 0) {
    throw new Error('Invalid prepTime');
  }
  // ...
}

function updateRecipe(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
  if (!data.prepTime || data.prepTime < 0) {
    throw new Error('Invalid prepTime');
  }
  // ...
}

// ✅ GOOD: Extract common logic
function validateRecipeData(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
  if (!data.prepTime || data.prepTime < 0) {
    throw new Error('Invalid prepTime');
  }
}

function createRecipe(data) {
  validateRecipeData(data);
  // ...
}

function updateRecipe(data) {
  validateRecipeData(data);
  // ...
}
```

#### SOLID Principles

**Single Responsibility:**
```typescript
// ❌ BAD: Class doing too much
class RecipeManager {
  createRecipe() { }
  deleteRecipe() { }
  sendEmail() { }  // Not recipe management!
  generatePDF() { }  // Not recipe management!
}

// ✅ GOOD: Separate concerns
class RecipeService {
  createRecipe() { }
  deleteRecipe() { }
}

class EmailService {
  sendEmail() { }
}

class PDFService {
  generatePDF() { }
}
```

**Dependency Injection:**
```typescript
// ❌ BAD: Hard-coded dependencies
class RecipeService {
  private db = new Database();  // Tightly coupled!

  async getRecipe(id: string) {
    return this.db.query('...');
  }
}

// ✅ GOOD: Inject dependencies
class RecipeService {
  constructor(private db: Database) { }

  async getRecipe(id: string) {
    return this.db.query('...');
  }
}

// Easy to test:
const mockDb = new MockDatabase();
const service = new RecipeService(mockDb);
```

#### Environment-Specific Code

```typescript
// ✅ Use environment variables
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

if (isDevelopment) {
  // Development-only features
  app.use('/api-docs', swaggerUI);
}

// ✅ Never commit secrets
// .env (gitignored)
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...

// ✅ Provide .env.example
// .env.example (committed)
JWT_SECRET=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## 2. Architecture Overview

### Tech Stack

**Backend:**
- **Runtime:** Node.js 20+
- **Framework:** Express 4.18 with TypeScript
- **Database:** PostgreSQL 15 with Prisma ORM 5.7
- **Authentication:** JWT with bcrypt password hashing
- **Admin Panel:** AdminJS (database management UI)
- **Documentation:** Swagger/OpenAPI
- **Validation:** Zod schemas
- **Logging:** Winston (development console + production JSON)
- **Security:** Helmet.js, CORS, rate limiting

**Frontend:**
- **Framework:** React 18.2 with TypeScript
- **Build Tool:** Vite 5.0
- **Styling:** Tailwind CSS 3.4
- **Components:** Radix UI (accessible primitives)
- **State Management:** Zustand (global) + React Query (server state)
- **Internationalization:** i18next (French, English, Dutch)
- **PWA:** Offline support enabled
- **HTTP Client:** Axios with interceptors

**Infrastructure:**
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Database Migrations:** Prisma Migrate

---

## 2. Directory Structure

### Root Structure
```
family-planner/
├── backend/               # Node.js + Express API
│   ├── src/              # Source code
│   ├── prisma/           # Database schema & migrations
│   ├── public/           # Static files (recipe images)
│   ├── logs/             # Application logs
│   ├── dist/             # Compiled JavaScript (production)
│   └── package.json
├── frontend/             # React SPA
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── dist/             # Production build
│   └── package.json
├── .github/
│   └── workflows/        # CI/CD pipelines
├── docker-compose.yml    # Production containers
├── docker-compose.dev.yml # Development containers
├── package.json          # Root workspace scripts
└── CLAUDE.md            # This file
```

### Backend Structure (`backend/src/`)
```
src/
├── config/                        # Configuration modules
│   ├── admin.ts                  # AdminJS panel config
│   ├── env.ts                    # Environment variable validation
│   ├── errorTracker.ts           # Error monitoring
│   ├── logger.ts                 # Winston logger setup
│   └── swagger.ts                # OpenAPI documentation
│
├── controllers/                   # Request handlers (business logic)
│   ├── admin.controller.ts       # Admin operations
│   ├── auth.controller.ts        # register, login, logout, getMe
│   ├── family.controller.ts      # Family CRUD + members + diet profile
│   ├── invitation.controller.ts  # Family invitation system
│   ├── mealScheduleTemplate.controller.ts  # Template management
│   ├── recipe.controller.ts      # Recipe CRUD + catalog + favorites
│   ├── schoolMenu.controller.ts  # School menu integration
│   ├── shoppingList.controller.ts # Shopping list generation
│   ├── weeklyPlan.controller.ts  # Meal plan generation & management
│   ├── health.controller.ts      # Health checks
│   └── __tests__/                # Controller unit tests
│
├── middleware/                    # Express middleware
│   ├── auth.ts                   # JWT authentication
│   ├── adminAuth.ts              # Admin panel authentication
│   ├── errorHandler.ts           # Global error handling
│   ├── rateLimiter.ts            # Rate limiting configs
│   ├── requestLogger.ts          # HTTP request logging
│   └── security.ts               # Security headers (Helmet)
│
├── routes/                        # Route definitions
│   ├── admin.routes.ts           # /admin panel routes
│   ├── admin.api.routes.ts       # Admin API routes
│   ├── auth.routes.ts            # /api/auth
│   ├── family.routes.ts          # /api/families
│   ├── health.routes.ts          # /api/health
│   ├── mealScheduleTemplate.routes.ts  # /api/families/:id/meal-templates
│   ├── recipe.routes.ts          # /api/recipes
│   ├── schoolMenu.routes.ts      # /api/school-menus
│   ├── shoppingList.routes.ts    # /api/shopping-lists
│   └── weeklyPlan.routes.ts      # /api/weekly-plans
│
├── utils/                         # Utility functions
│   └── auth.utils.ts             # hashPassword, generateToken
│
├── lib/                           # Shared libraries
│   └── prisma.ts                 # Prisma client singleton
│
├── admin/                         # AdminJS customizations
│   ├── actions/                  # Custom admin actions
│   ├── dashboard.tsx             # Admin dashboard
│   └── scraper-action.tsx        # HelloFresh scraper UI
│
├── scripts/                       # Utility scripts
│   ├── makeAdmin.ts              # Grant admin privileges
│   ├── revokeAdmin.ts            # Revoke admin privileges
│   ├── fixBrokenImages.ts        # Image URL repair
│   └── scrapeHelloFresh.ts       # Recipe scraping
│
├── __tests__/                     # Integration tests
│   └── integration/
│
└── index.ts                       # Application entry point
```

### Frontend Structure (`frontend/src/`)
```
src/
├── components/                    # React components
│   ├── ui/                       # Radix UI primitives (shadcn/ui pattern)
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── tabs.tsx
│   ├── ErrorBoundary.tsx         # Error boundary wrapper
│   ├── ErrorFallback.tsx         # Error UI
│   └── LanguageSwitcher.tsx      # FR/EN/NL switcher
│
├── pages/                         # Route pages (top-level views)
│   ├── DashboardPage.tsx         # / - Family dashboard
│   ├── LoginPage.tsx             # /login
│   ├── RegisterPage.tsx          # /register
│   ├── OnboardingPage.tsx        # /onboarding - First-time setup
│   ├── WeeklyPlanPage.tsx        # /plan/:id - Meal planning
│   ├── RecipesPage.tsx           # /recipes - Recipe catalog
│   ├── ShoppingListPage.tsx      # /shopping/:id - Shopping list
│   ├── FamilySettingsPage.tsx    # /family/settings - Family config
│   ├── InvitationsPage.tsx       # /invitations - Invite management
│   └── __tests__/                # Page tests
│
├── stores/                        # State management
│   └── authStore.ts              # Zustand store (auth, user, family)
│
├── hooks/                         # Custom React hooks
│   └── use-toast.ts              # Toast notifications
│
├── lib/                           # Utilities
│   ├── api.ts                    # Axios client with interceptors
│   ├── i18n.ts                   # i18next configuration
│   └── utils.ts                  # Helper functions (cn, formatters)
│
├── locales/                       # Translation files
│   ├── fr.json                   # French (default)
│   ├── en.json                   # English
│   └── nl.json                   # Dutch
│
├── config/                        # Frontend configuration
│   └── env.ts                    # Environment variable validation
│
├── test/                          # Test setup
│   └── setup.ts
│
├── App.tsx                        # Root component + routing
├── main.tsx                       # React entry point
└── index.css                      # Tailwind imports + globals
```

---

## 3. Database Schema

**Location:** `backend/prisma/schema.prisma`

### Models Overview (19 total)

#### User Management
- **User** - Authentication & user profiles
- **Family** - Family units with settings
- **FamilyMember** - Members with roles and preferences
- **FamilyInvitation** - Token-based invitation system

#### Dietary & Preferences
- **DietProfile** - Comprehensive dietary constraints

#### Recipe System
- **Recipe** - Recipes with multilingual support
- **Ingredient** - Recipe ingredients with dietary flags
- **Instruction** - Step-by-step cooking instructions

#### Planning System
- **WeeklyPlan** - Weekly meal plans (state machine)
- **Meal** - Individual meals in a plan
- **MealScheduleTemplate** - Flexible meal scheduling
- **Attendance** - RSVP tracking per meal
- **Guest** - Guest management for meals
- **Vote** - Meal voting (LIKE, DISLIKE, LOVE)
- **Wish** - Meal wish list

#### Shopping & Feedback
- **ShoppingList** - Auto-generated shopping lists
- **ShoppingItem** - Individual items with alternatives
- **Feedback** - Post-meal recipe feedback
- **InventoryItem** - Pantry inventory tracking

#### School Integration
- **SchoolMenu** - School menu integration

### Key Model Details

#### **User**
```prisma
- id, email (unique), password (bcrypt), firstName, lastName
- language (fr/en/nl), units (metric/imperial)
- isAdmin (boolean) - system admin flag
- Relations: families, createdFamilies, sentInvitations
```

#### **Family**
```prisma
- id, name, language, units
- dietProfileId (1-to-1 with DietProfile)
- defaultTemplateId (optional MealScheduleTemplate)
- Relations: members, recipes, weeklyPlans, shoppingLists, etc.
```

#### **DietProfile**
```prisma
Constraints:
- kosher (boolean, kosherType, meatToMilkDelayHours, shabbatMode)
- halal (boolean, halalType)
- vegetarian, vegan, pescatarian (booleans)
- glutenFree, lactoseFree (booleans)
- allergies (String[]) - array of allergen names

Preferences:
- favoriteRatio (0.6 default) - 60% favorites in plan
- maxNovelties (2 default) - max new recipes per plan
- diversityEnabled (boolean) - avoid recipe repetition
```

#### **FamilyMember**
```prisma
- id, familyId, userId (optional - can be non-users)
- name, role (ADMIN, PARENT, MEMBER, CHILD)
- age, portionFactor (1.0 adult, 0.7 child)
- aversions (String[]), favorites (String[])
```

#### **Recipe**
```prisma
Multilingual:
- title, titleEn, description, descriptionEn

Timing:
- prepTime, cookTime, totalTime (minutes)

Dietary:
- kosherCategory (meat/dairy/parve)
- halalFriendly, glutenFree, lactoseFree
- vegetarian, vegan, pescatarian

Categories:
- category (pasta, chicken, fish, beef, etc.)
- mealType (String[]) - breakfast, lunch, dinner, snack
- cuisine (french, italian, asian, etc.)
- season (String[]) - spring, summer, fall, winter, all

Metadata:
- imageUrl, thumbnailUrl
- servings, difficulty (1-5), kidsRating (1-5)
- isFavorite, isNovelty, timesCooked, avgRating
- source, sourceUrl
```

#### **WeeklyPlan**
```prisma
Status states (enum PlanStatus):
- DRAFT → IN_VALIDATION → VALIDATED → LOCKED

Fields:
- weekStartDate (Monday), weekNumber, year
- templateId (MealScheduleTemplate)
- cutoffDate, cutoffTime, allowDeltaAfterCutoff
- validatedAt
```

#### **Meal**
```prisma
- dayOfWeek (enum: MONDAY...SUNDAY)
- mealType (enum: BREAKFAST, LUNCH, DINNER, SNACK)
- recipeId (nullable), portions
- locked (boolean) - prevents auto-swap
- isSchoolMeal, isExternal, externalNote
```

#### **MealScheduleTemplate**
```prisma
- isSystem (boolean) - system vs family templates
- schedule (JSON):
  [
    { dayOfWeek: "MONDAY", mealTypes: ["DINNER"] },
    { dayOfWeek: "TUESDAY", mealTypes: ["LUNCH", "DINNER"] }
  ]
```

#### **FamilyInvitation**
```prisma
- inviteeEmail, role
- status (PENDING, ACCEPTED, DECLINED, CANCELLED)
- token (unique UUID), expiresAt (7 days)
- Unique constraint: [familyId, inviteeEmail, status]
```

### Relationships Diagram

```
User 1───────n FamilyMember
User 1───────n Family (as creator)
User 1───────n FamilyInvitation (as inviter)

Family 1─────1 DietProfile
Family 1─────n FamilyMember
Family 1─────n Recipe
Family 1─────n WeeklyPlan
Family 1─────n ShoppingList
Family 1─────n SchoolMenu
Family 1─────n InventoryItem
Family 1─────n MealScheduleTemplate
Family 1─────n FamilyInvitation

Recipe 1─────n Ingredient
Recipe 1─────n Instruction
Recipe 1─────n Meal
Recipe 1─────n Feedback

WeeklyPlan 1─n Meal
WeeklyPlan 1─n ShoppingList
WeeklyPlan 1─n Wish

Meal 1───────n Attendance
Meal 1───────n Guest
Meal 1───────n Vote
Meal 1───────n Feedback

FamilyMember 1n Attendance
FamilyMember 1n Vote

ShoppingList 1n ShoppingItem
```

---

## 4. API Endpoints

**Base URL:** `http://localhost:3001/api`

### Authentication (`/api/auth`)
```
POST   /register              Register new user
POST   /login                 Login (returns JWT)
POST   /logout                Logout (clears cookie)
GET    /me                    Get current user
```

### Families (`/api/families`)
```
POST   /                      Create family
GET    /                      List user's families
GET    /:id                   Get family details
PUT    /:id                   Update family
DELETE /:id                   Delete family
POST   /:id/members           Add family member
PUT    /members/:memberId     Update member
DELETE /members/:memberId     Remove member
PUT    /:id/diet-profile      Update diet profile
```

### Invitations
```
POST   /api/families/:id/invitations              Send invitation
GET    /api/families/:id/invitations/sent         List sent invitations
GET    /api/families/invitations/received         List received invitations
POST   /api/families/invitations/:id/accept       Accept invitation
POST   /api/families/invitations/:id/decline      Decline invitation
DELETE /api/families/:id/invitations/:invId       Cancel invitation
```

### Recipes (`/api/recipes`)
```
POST   /                      Create recipe
GET    /                      List recipes (filters: category, mealType, etc.)
GET    /:id                   Get recipe details
PUT    /:id                   Update recipe
DELETE /:id                   Delete recipe
GET    /catalog/:familyId     Get weekly catalog (diet-filtered)
POST   /:id/favorite          Toggle favorite
POST   /:id/feedback          Submit feedback
```

### Weekly Plans (`/api/weekly-plans`)
```
POST   /                                    Create plan
GET    /family/:familyId                    List family plans
GET    /:id                                 Get plan details
POST   /:familyId/generate                  Generate auto plan
POST   /:familyId/generate-express          Generate express plan
POST   /:planId/meals                       Add meal
DELETE /:planId/meals/:mealId               Remove meal
PUT    /:planId/meals/:mealId               Update meal
POST   /:planId/meals/:mealId/swap          Swap recipe
POST   /:planId/meals/:mealId/lock          Lock/unlock meal
POST   /:planId/meals/:mealId/vote          Vote on meal
POST   /:planId/wishes                      Add wish
POST   /:planId/validate                    Validate plan
PUT    /:planId/template                    Switch template
```

### Shopping Lists (`/api/shopping-lists`)
```
POST   /generate/:weeklyPlanId    Generate shopping list
GET    /:weeklyPlanId              Get shopping list
PUT    /items/:itemId              Update item
POST   /items/:itemId/toggle       Toggle checked status
```

### School Menus (`/api/school-menus`)
```
POST   /                      Create school menu
GET    /family/:familyId      List school menus
PUT    /:id                   Update menu
DELETE /:id                   Delete menu
```

### Meal Schedule Templates (`/api/families/:familyId/meal-templates`)
```
GET    /                      List templates (system + family)
GET    /:templateId           Get template details
POST   /                      Create custom template
PUT    /:templateId           Update template
DELETE /:templateId           Delete template
PUT    /families/:familyId/default-template  Set default template
```

### Health & Documentation
```
GET    /api/health            Health check
GET    /api/api-docs          Swagger UI
```

### Admin Panel
```
GET    /admin                 AdminJS dashboard
*      /admin/*               Admin routes
```

---

## 5. Backend Architecture

### Design Patterns

#### **Controller Pattern**
All controllers use consistent error handling and response format:

```typescript
// Example: auth.controller.ts
export const register = asyncHandler(async (req: Request, res: Response) => {
  // 1. Validate with Zod schema
  const validatedData = registerSchema.parse(req.body);

  // 2. Business logic
  const hashedPassword = await hashPassword(validatedData.password);
  const user = await prisma.user.create({ ... });

  // 3. Consistent response
  res.status(201).json({
    status: 'success',
    data: { user: { ...user, password: undefined } }
  });
});
```

**Response Format:**
```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "optional message"
}
```

#### **Middleware Stack**
```typescript
// Application middleware order (index.ts)
1. helmet() - Security headers
2. cors() - CORS configuration
3. requestLogger - HTTP request logging
4. express.json() - Body parsing
5. routes - Application routes
6. errorHandler - Global error handling
```

#### **Authentication Flow**
```typescript
// JWT authentication middleware (middleware/auth.ts)
1. Extract token from:
   - Authorization header: "Bearer <token>"
   - Cookie: "token"
   - (Fallback) localStorage (client-side)

2. Verify JWT signature and expiration

3. Attach user to request:
   interface AuthRequest extends Request {
     user?: { id: string; email: string; isAdmin: boolean }
   }

4. Proceed to route handler
```

#### **Error Handling**
```typescript
// Custom error class (middleware/errorHandler.ts)
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Global error handler
- Development: Full stack trace + error details
- Production: Minimal error exposure, JSON logs
- Automatic logging with Winston
- Error tracking with context (IP, user, route)
```

#### **Rate Limiting**
```typescript
// Different tiers (middleware/rateLimiter.ts)
apiLimiter:       100 req/15min  (general API)
authLimiter:      5 req/15min    (login/register)
registerLimiter:  3 req/hour     (registration)
intensiveOperationLimiter: 5 req/min (meal generation)
devLimiter:       1000 req/min   (development only)
```

#### **Security Measures**
```typescript
// Implemented security (middleware/security.ts)
- Helmet.js: Security headers (CSP, HSTS, etc.)
- CORS: Whitelist validation
- Password hashing: bcrypt with 10 rounds
- JWT: 7-day expiration
- Request sanitization: null byte removal
- Rate limiting: Multiple tiers
- HTTP-only cookies: XSS protection
```

### Key Controllers

#### **weeklyPlan.controller.ts** - Meal Plan Generation

**Two Generation Modes:**

1. **Auto Plan (`generateAutoPlan`)**
   ```typescript
   Algorithm:
   1. Load meal schedule template (flexible patterns)
   2. Load diet profile settings
   3. Categorize recipes:
      - favorites (based on family feedback)
      - novelties (never/rarely cooked)
      - others (general pool)
   4. For each meal in template:
      a. Check school menu for that day/meal
      b. Avoid category duplication
      c. Select recipe:
         - 60% chance: favorite (configurable)
         - If under novelty limit: novelty
         - Fallback: others pool
      d. Filter by dietary constraints
   5. Create Meal records
   6. Return WeeklyPlan (DRAFT status)
   ```

2. **Express Plan (`generateExpressPlan`)**
   ```typescript
   Quick mode:
   - Fixed pattern: Lunch + Dinner for 7 days
   - Only uses favorites
   - Inserts 1 random novelty
   - Faster for low-engagement families
   ```

**Recipe Selection Logic:**
```typescript
function selectRecipe(favorites, novelties, others, state) {
  // 1. Novelties if under limit (maxNovelties from diet profile)
  if (state.noveltiesUsed < maxNovelties && novelties.length > 0) {
    return random(novelties);
  }

  // 2. Favorites based on favoriteRatio (default 0.6)
  if (Math.random() < favoriteRatio && favorites.length > 0) {
    return random(favorites);
  }

  // 3. Others as fallback
  return random(others);
}
```

#### **shoppingList.controller.ts** - Shopping List Generation

```typescript
Algorithm:
1. Get all meals from weekly plan
2. For each meal:
   a. Get recipe ingredients
   b. Calculate portion factor:
      - Sum family member portions
      - Add guest portions
      - Scale ingredients
3. Aggregate ingredients:
   a. Group by: name + unit + category
   b. Sum quantities
4. Apply dietary substitutions:
   - glutenFree: suggest alternatives
   - lactoseFree: suggest alternatives
5. Check inventory:
   a. Deduct in-stock quantities
   b. Mark items as inStock if available
6. Round quantities to reasonable values
7. Sort by category (aisle organization)
8. Create ShoppingList and ShoppingItem records
```

#### **invitation.controller.ts** - Family Invitation System

```typescript
Flow:
1. Send invitation:
   - Validate: sender is ADMIN or PARENT
   - Generate unique token (UUID)
   - Set expiration (7 days)
   - Send email (placeholder - not implemented yet)

2. Accept invitation:
   - Verify token validity
   - Check expiration
   - Create FamilyMember record
   - Update invitation status to ACCEPTED
   - Use transaction for atomicity

3. Decline/Cancel:
   - Update status
   - Soft delete (status change, not deletion)
```

### Database Access

```typescript
// Prisma client singleton (lib/prisma.ts)
- Prevents multiple instances in development
- Connection pooling
- Query logging in development
- Graceful shutdown on SIGTERM

Usage:
import { prisma } from '../lib/prisma';

const users = await prisma.user.findMany();
```

---

## 6. Frontend Architecture

### State Management

#### **Zustand (Global State)**
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  family: Family | null;
  token: string | null;
  isAuthenticated: boolean;

  setUser: (user: User) => void;
  setFamily: (family: Family) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

// Usage:
const { user, isAuthenticated, logout } = useAuthStore();
```

#### **React Query (Server State)**
```typescript
// Example usage in components
const { data: recipes, isLoading } = useQuery({
  queryKey: ['recipes', familyId],
  queryFn: () => recipeAPI.getCatalog(familyId)
});

// Mutations
const mutation = useMutation({
  mutationFn: recipeAPI.createRecipe,
  onSuccess: () => {
    queryClient.invalidateQueries(['recipes']);
  }
});
```

### API Integration

```typescript
// lib/api.ts - Centralized Axios client

// Request interceptor: Add JWT token
api.interceptors.request.use((config) => {
  const token = authStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Organized by domain
export const authAPI = { register, login, logout, getMe };
export const familyAPI = { create, getAll, getById, update, delete };
export const recipeAPI = { ... };
export const weeklyPlanAPI = { ... };
```

### Routing

```typescript
// App.tsx - React Router setup
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Protected routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/onboarding" element={<OnboardingPage />} />
    <Route path="/plan/:id" element={<WeeklyPlanPage />} />
    <Route path="/recipes" element={<RecipesPage />} />
    <Route path="/shopping/:id" element={<ShoppingListPage />} />
    <Route path="/family/settings" element={<FamilySettingsPage />} />
    <Route path="/invitations" element={<InvitationsPage />} />
  </Route>
</Routes>

// ProtectedRoute component
- Checks authStore.isAuthenticated
- Redirects to /login if unauthenticated
- Renders Outlet for nested routes
```

### Component Structure

#### **UI Components (Radix UI Pattern)**
```
components/ui/ - Accessible, composable primitives
- button.tsx - Button variants (default, destructive, outline, etc.)
- card.tsx - Card container with header/content/footer
- dialog.tsx - Modal dialog
- input.tsx - Form input with validation styles
- select.tsx - Dropdown select
- table.tsx - Data table
- tabs.tsx - Tabbed interface
- ...and more

Pattern: shadcn/ui
- Components copied into project (not NPM package)
- Fully customizable Tailwind CSS
- Radix UI primitives for accessibility
```

#### **Page Components**
```
pages/ - Top-level route views

DashboardPage.tsx:
- Family overview
- Current week plan preview
- Quick actions (generate plan, view shopping list)

WeeklyPlanPage.tsx:
- Weekly calendar grid (7 days x meal types)
- Drag-and-drop meal editing
- Voting and attendance tracking
- Plan validation

RecipesPage.tsx:
- Recipe catalog with filters
- Search (accent-insensitive, multilingual)
- Favorite toggling
- Recipe creation

ShoppingListPage.tsx:
- Categorized shopping items
- Check/uncheck items
- Quantity editing
- Alternative suggestions

FamilySettingsPage.tsx:
- Family profile
- Member management
- Diet profile configuration
- Meal template selection

InvitationsPage.tsx:
- Send invitations
- View sent/received invitations
- Accept/decline invitations
```

### Internationalization

```typescript
// lib/i18n.ts - i18next configuration
Supported languages:
- fr (French) - default
- en (English)
- nl (Dutch)

Usage:
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();

<h1>{t('dashboard.title')}</h1>
<button onClick={() => i18n.changeLanguage('en')}>
  English
</button>
```

**Translation Files:**
```json
// locales/fr.json
{
  "dashboard": {
    "title": "Tableau de bord",
    "welcome": "Bienvenue, {{name}}"
  }
}
```

---

## 7. Key Features Implementation

### Flexible Meal Scheduling (Templates)

**Location:** `backend/src/controllers/mealScheduleTemplate.controller.ts`

**System Templates:**
```json
{
  "id": "uuid",
  "name": "Lunch & Dinner (7 days)",
  "isSystem": true,
  "schedule": [
    { "dayOfWeek": "MONDAY", "mealTypes": ["LUNCH", "DINNER"] },
    { "dayOfWeek": "TUESDAY", "mealTypes": ["LUNCH", "DINNER"] },
    ...
  ]
}
```

**Custom Family Templates:**
- Families can create custom schedules
- Example: Only dinners on weekdays, lunch + dinner on weekends
- Can be set as family default

### Recipe Search (Multilingual & Accent-Insensitive)

**Location:** `backend/src/controllers/recipe.controller.ts`

```typescript
// Search implementation
const recipes = await prisma.recipe.findMany({
  where: {
    OR: [
      {
        title: {
          contains: searchTerm,
          mode: 'insensitive' // Case-insensitive
        }
      },
      { titleEn: { contains: searchTerm, mode: 'insensitive' } }
    ],
    // Additional filters
    category: { in: categories },
    mealType: { hasSome: mealTypes },

    // Diet profile filtering
    ...(family.dietProfile.vegetarian && { vegetarian: true }),
    ...(family.dietProfile.glutenFree && { glutenFree: true })
  }
});
```

**Accent normalization** (done client-side or via PostgreSQL collation)

### School Menu Integration

**Location:** `backend/src/controllers/schoolMenu.controller.ts`

**Features:**
- OCR metadata (confidence, needsReview)
- Category tracking for anti-duplication
- Used in meal plan generation:
  ```typescript
  // In generateAutoPlan
  const schoolMenusThisWeek = await getSchoolMenus(weekStartDate);

  // When selecting recipe for a meal:
  const schoolMenuCategory = schoolMenusThisWeek.find(
    menu => menu.date === mealDate && menu.mealType === mealType
  )?.category;

  // Filter out recipes in same category
  availableRecipes = availableRecipes.filter(
    r => r.category !== schoolMenuCategory
  );
  ```

### HelloFresh Recipe Scraper

**Location:** `backend/src/scripts/scrapeHelloFresh.ts` + Admin panel integration

**Features:**
- Scrapes recipes from HelloFresh website
- Extracts: title, description, ingredients, instructions, images
- Saves to database with `source: 'hellofresh'`
- Admin panel action for manual triggering

---

## 8. Development Workflow

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd family-planner

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install

# 4. Set up environment variables
cp .env.example .env
# Edit .env:
# DATABASE_URL=postgresql://user:password@localhost:5432/family_planner
# JWT_SECRET=your-secret-key

# 5. Run database migrations
npm run prisma:migrate

# 6. Seed database (optional)
npm run prisma:seed

# 7. Install frontend dependencies
cd ../frontend
npm install

# 8. Set up frontend environment
cp .env.example .env
# Edit .env:
# VITE_API_URL=http://localhost:3001/api
```

### Running Locally

```bash
# Option 1: Run services individually

# Terminal 1: Backend
cd backend
npm run dev              # Starts on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev              # Starts on http://localhost:5173

# Option 2: Docker Compose (recommended)
docker-compose -f docker-compose.dev.yml up

# Access:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001/api
# - API Docs: http://localhost:3001/api-docs
# - Admin Panel: http://localhost:3001/admin
```

### Database Management

```bash
cd backend

# Create a new migration
npm run prisma:migrate -- --name add_feature_x

# Apply migrations
npm run prisma:migrate

# Open Prisma Studio (GUI database browser)
npm run prisma:studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Generate Prisma client (after schema changes)
npx prisma generate
```

### Admin User Management

```bash
cd backend

# Grant admin privileges
npm run make-admin -- user@example.com

# Revoke admin privileges
npm run revoke-admin -- user@example.com
```

### Testing

```bash
# Backend tests
cd backend
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Frontend tests
cd frontend
npm test                 # Run all tests
npm run test:ui          # Vitest UI
```

### Building for Production

```bash
# Backend
cd backend
npm run build            # Compiles TypeScript to dist/

# Frontend
cd frontend
npm run build            # Builds to dist/

# Both (from root)
npm run build
```

---

## 9. Configuration

### Environment Variables

#### **Backend (`.env`)**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=development          # development | production
PORT=3001
APP_NAME=Family Planner API

# CORS
CORS_ORIGIN=http://localhost:5173

# Optional: Error tracking (future)
# SENTRY_DSN=...
```

#### **Frontend (`.env`)**
```bash
VITE_API_URL=http://localhost:3001/api
```

### Key Configuration Files

#### **backend/tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  }
}
```

#### **frontend/vite.config.ts**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

#### **frontend/tailwind.config.js**
```javascript
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom color palette
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};
```

#### **docker-compose.dev.yml**
```yaml
services:
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    volumes: [postgres-data:/var/lib/postgresql/data]

  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [postgres]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
```

---

## 11. Testing Strategy

> **REMINDER:** See [Section 1 - Development Philosophy](#1-development-philosophy--requirements) for mandatory TDD requirements.

### Test-First Approach

**All code changes MUST follow TDD:**
1. Write failing test
2. Write minimal code to pass
3. Refactor
4. Verify with Chrome MCP

### Backend Tests

**Framework:** Jest + Supertest

**Structure:**
```
backend/src/
├── controllers/__tests__/
│   ├── auth.controller.test.ts
│   ├── family.controller.test.ts
│   ├── recipe.controller.test.ts
│   └── weeklyPlan.controller.test.ts
└── __tests__/
    └── integration/
        ├── auth.integration.test.ts
        └── weeklyPlan.integration.test.ts
```

**Running Tests (in Docker):**
```bash
# Run all tests
docker-compose exec backend npm test

# Watch mode
docker-compose exec backend npm run test:watch

# Coverage report
docker-compose exec backend npm run test:coverage

# Specific test file
docker-compose exec backend npm test -- recipe.controller.test.ts
```

**Example Test:**
```typescript
describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  it('should reject registration with existing email', async () => {
    // Test duplicate email...
  });

  it('should validate required fields', async () => {
    // Test validation...
  });
});
```

### Frontend Tests

**Framework:** Vitest + React Testing Library

**Structure:**
```
frontend/src/
├── pages/__tests__/
│   ├── LoginPage.test.tsx
│   ├── DashboardPage.test.tsx
│   └── WeeklyPlanPage.test.tsx
└── components/__tests__/
    └── RecipeCard.test.tsx
```

**Running Tests (in Docker):**
```bash
# Run all tests
docker-compose exec frontend npm test

# UI mode
docker-compose exec frontend npm run test:ui

# Coverage
docker-compose exec frontend npm run test:coverage
```

**Example Test:**
```typescript
describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('displays error for invalid credentials', async () => {
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
```

### E2E Testing with Chrome MCP

**After passing unit tests, verify with Chrome MCP:**

```typescript
// 1. Start services
docker-compose -f docker-compose.dev.yml up -d

// 2. Run Chrome MCP verification
// Navigate to feature
await mcp.navigate('http://localhost:5173/login');

// 3. Interact with UI
await mcp.fill('[type="email"]', 'test@example.com');
await mcp.fill('[type="password"]', 'password123');
await mcp.click('[type="submit"]');

// 4. Verify success
await mcp.waitFor('Dashboard');
await mcp.takeSnapshot();

// 5. Check for errors
const errors = await mcp.listConsoleMessages({ types: ['error'] });
expect(errors.length).toBe(0);
```

### Coverage Requirements

```bash
# Minimum thresholds (enforced by Jest/Vitest):
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}

# View coverage report:
docker-compose exec backend npm run test:coverage
open backend/coverage/lcov-report/index.html
```

### Test Organization

```typescript
// Group related tests
describe('Recipe Management', () => {
  describe('POST /api/recipes', () => {
    it('creates recipe with valid data', async () => { });
    it('rejects recipe without title', async () => { });
    it('validates prepTime is positive', async () => { });
  });

  describe('GET /api/recipes', () => {
    it('returns all recipes', async () => { });
    it('filters by category', async () => { });
    it('searches by title', async () => { });
  });
});
```

### Mocking

**Backend:**
```typescript
// Mock Prisma for unit tests
jest.mock('../lib/prisma', () => ({
  prisma: {
    recipe: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }
}));
```

**Frontend:**
```typescript
// Mock API calls
vi.mock('../lib/api', () => ({
  recipeAPI: {
    getCatalog: vi.fn().mockResolvedValue([
      { id: '1', title: 'Test Recipe' }
    ])
  }
}));
```

---

## 12. Deployment

### Production Checklist

#### **Backend**
```bash
✓ Set NODE_ENV=production
✓ Configure secure JWT_SECRET (256-bit random)
✓ Set up production DATABASE_URL (PostgreSQL)
✓ Configure CORS_ORIGIN (whitelist production domains)
✓ Enable HTTPS (HSTS headers already configured)
✓ Set up log aggregation (Winston JSON logs)
✓ Configure error tracking (Sentry, etc.)
✓ Run database migrations
✓ Build: npm run build
✓ Start: node dist/index.js
```

#### **Frontend**
```bash
✓ Set VITE_API_URL to production API
✓ Build: npm run build
✓ Serve dist/ with nginx/caddy/CDN
✓ Configure CSP headers
✓ Enable gzip/brotli compression
```

### Docker Deployment

```bash
# Build production images
docker-compose build

# Run production stack
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services (if needed)
docker-compose up -d --scale backend=3
```

### Database Migrations (Production)

```bash
# Always backup before migrations!
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Apply migrations
cd backend
npx prisma migrate deploy
```

---

## 13. Admin Panel

**Access:** `http://localhost:3001/admin`

**Authentication:** Requires `user.isAdmin = true`

### Features

#### **Dashboard**
- Custom React dashboard (admin/dashboard.tsx)
- Recipe scraper actions
- System statistics

#### **Resource Management**
Navigation organized by domain:

**User Management:**
- Users (password auto-hashed on create/edit)

**Family Management:**
- Families
- Family Members
- Diet Profiles
- Family Invitations

**Recipe Management:**
- Recipes (with image URL management)
- Ingredients
- Instructions

**Planning:**
- Weekly Plans
- Meals
- Meal Schedule Templates

**Engagement:**
- Votes
- Wishes
- Attendance
- Guests
- Feedback

**Shopping & Inventory:**
- Shopping Lists
- Shopping Items
- Inventory Items

**School Integration:**
- School Menus

#### **Custom Actions**
- **Scrape HelloFresh:** Import recipes from HelloFresh
- **Fix Broken Images:** Repair broken image URLs
- **Bulk Operations:** Delete, export, etc.

#### **AdminJS Configuration**
**Location:** `backend/src/config/admin.ts`

```typescript
// Features:
- Password hashing on User create/edit
- Image URL validation
- Custom navigation structure
- Search filters per resource
- Pagination
- Export to CSV
```

---

## Appendix: Recent Changes

### October 25, 2025
- ✓ Added flexible meal scheduling system with templates
- ✓ Implemented accent-insensitive recipe search
- ✓ Added multilingual search support (FR/EN)

### October 24, 2025
- ✓ Integrated HelloFresh recipe scraper into admin panel
- ✓ Added family invitation system
- ✓ Upgraded dependencies to fix Docker build warnings

---

## Contributing

### Code Style
- **TypeScript:** Strict mode enabled
- **Linting:** ESLint configured
- **Formatting:** Prettier (2-space indents)
- **Naming:**
  - camelCase for variables/functions
  - PascalCase for components/classes
  - UPPER_CASE for constants

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Commit with conventional commits
git commit -m "feat: add meal template management"
git commit -m "fix: resolve recipe search bug"

# Push and create PR
git push origin feature/your-feature-name
```

---

## Support & Resources

- **API Documentation:** http://localhost:3001/api-docs
- **Prisma Studio:** `npm run prisma:studio` (backend)
- **GitHub Repository:** [Your repo URL]
- **Issues:** [Your issues URL]

---

**End of Documentation**
