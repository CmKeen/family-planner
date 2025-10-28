# Coding Standards & Best Practices

**These standards are MANDATORY for all code contributions.**

## TypeScript Standards

### Type Safety
```typescript
// ❌ NEVER use 'any'
function processData(data: any) { }

// ✅ ALWAYS use proper types
interface Recipe {
  id: string;
  title: string;
  prepTime: number;
}

// ✅ Use generics for reusable functions
function getById<T extends { id: string }>(id: string, collection: T[]): T | undefined {
  return collection.find(item => item.id === id);
}
```

### Strict Mode (Required)
```json
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

## Naming Conventions

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

// Private class members: _camelCase
class AuthService {
  private _token: string;
  private _validateToken() { }
}

// Boolean variables: is/has/can prefix
const isAuthenticated = true;
const hasPermission = false;

// Arrays: plural nouns
const recipes = [];
const users = [];

// Functions: verb + noun
function createRecipe() { }
function updateUser() { }
function validateInput() { }
```

## File Naming

```bash
# React Components: PascalCase
RecipesPage.tsx
RecipeCard.tsx
LanguageSwitcher.tsx

# Other TypeScript: camelCase
auth.controller.ts
recipe.service.ts
api.utils.ts

# Test files: same name + .test
recipe.controller.test.ts
RecipeCard.test.tsx

# Config files: kebab-case
docker-compose.yml
tsconfig.json
```

## Code Organization

### File Length Limits
```typescript
Controllers: 300 lines max
Components: 200 lines max
Services: 400 lines max

// Split large files into logical modules
```

### Import Order
```typescript
// 1. External libraries
import express from 'express';
import { z } from 'zod';

// 2. Internal modules (absolute paths)
import { prisma } from '@/lib/prisma';
import { logger } from '@/config/logger';

// 3. Relative imports
import { hashPassword } from './auth.utils';

// 4. Types
import type { Request, Response } from 'express';
```

### Function Organization
```typescript
// Order within files:
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Main exported functions
// 5. Helper functions
// 6. Exports
```

## Error Handling

### Backend
```typescript
// ✅ Custom error classes
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
  }
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

// ❌ NEVER swallow errors
try {
  await doSomething();
} catch (error) {
  // Don't ignore!
}

// ✅ Log and handle
try {
  await doSomething();
} catch (error) {
  logger.error('Failed', { error });
  throw new AppError('Operation failed', 500);
}
```

### Frontend
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
  } finally {
    setLoading(false);
  }
}
```

## Async/Await Best Practices

```typescript
// ✅ Use async/await (not .then/.catch)
async function getRecipes() {
  const recipes = await prisma.recipe.findMany();
  return recipes;
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

## Comments & Documentation

```typescript
// ✅ Write self-documenting code
function getUserById(id: string) { }  // Clear name

// ✅ Comment WHY, not WHAT
// Skip recipes with missing images to avoid broken UI
for (const recipe of recipes.filter(r => r.imageUrl)) { }

// ✅ JSDoc for public APIs
/**
 * Creates a new weekly meal plan for a family.
 * @param familyId - The UUID of the family
 * @param weekStartDate - Monday of the target week
 * @returns The created weekly plan with generated meals
 * @throws {AppError} 404 if family not found
 */
export async function generateWeeklyPlan(
  familyId: string,
  weekStartDate: Date
): Promise<WeeklyPlan> {
  // Implementation...
}

// ❌ NEVER commit commented-out code
```

## Performance Best Practices

### Database Queries
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
  prisma.family.create({ data: familyData })
]);
```

### React Performance
```typescript
// ✅ React.memo for expensive components
export const RecipeCard = React.memo(({ recipe }: Props) => {
  // Component implementation
});

// ✅ useMemo for expensive calculations
const sortedRecipes = useMemo(() => {
  return recipes.sort((a, b) => a.title.localeCompare(b.title));
}, [recipes]);

// ✅ useCallback for functions passed to children
const handleClick = useCallback(() => {
  setSelected(recipe.id);
}, [recipe.id]);
```

## Security Best Practices

```typescript
// ✅ Validate ALL user input
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
const validated = schema.parse(req.body);

// ✅ Never expose sensitive data
const { password, ...safeUser } = user;
res.json({ data: { user: safeUser } });

// ✅ Use parameterized queries (Prisma does this)
await prisma.user.findUnique({ where: { email } });

// ✅ Rate limit sensitive endpoints
app.post('/api/auth/login', authLimiter, loginController);

// ✅ Hash passwords
const hashedPassword = await bcrypt.hash(password, 10);
```

## Git Commit Conventions

```bash
# Format: <type>(<scope>): <subject>

feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code style (formatting)
refactor: Code refactoring
perf:     Performance
test:     Tests
chore:    Build/dependencies

# Examples:
git commit -m "feat(recipes): add multi-language search"
git commit -m "fix(auth): resolve JWT expiration"
git commit -m "test(weeklyPlan): add integration tests"
```

## Code Review Checklist

### Before submitting PR
- [ ] Tests written FIRST (TDD)
- [ ] All tests pass
- [ ] Coverage meets thresholds
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Formatted with Prettier
- [ ] Translations added (FR/EN/NL)
- [ ] Verified with Chrome MCP
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No secrets in code
- [ ] Documentation updated

## DRY Principle

```typescript
// ❌ BAD: Duplicated logic
function createRecipe(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
  // ...
}

function updateRecipe(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
  // ...
}

// ✅ GOOD: Extract common logic
function validateRecipeData(data) {
  if (!data.title || data.title.length < 3) {
    throw new Error('Invalid title');
  }
}

function createRecipe(data) {
  validateRecipeData(data);
  // ...
}
```

## SOLID Principles

### Single Responsibility
```typescript
// ❌ BAD: Class doing too much
class RecipeManager {
  createRecipe() { }
  sendEmail() { }  // Not recipe management!
}

// ✅ GOOD: Separate concerns
class RecipeService {
  createRecipe() { }
}

class EmailService {
  sendEmail() { }
}
```

### Dependency Injection
```typescript
// ✅ GOOD: Inject dependencies
class RecipeService {
  constructor(private db: Database) { }
}

// Easy to test:
const mockDb = new MockDatabase();
const service = new RecipeService(mockDb);
```
