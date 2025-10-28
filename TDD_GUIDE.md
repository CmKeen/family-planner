# Test-Driven Development (TDD) Guide

**This project REQUIRES test-driven development. You MUST write tests BEFORE implementing features.**

## TDD Workflow (MANDATORY)

### The RED → GREEN → REFACTOR Cycle

1. **RED**: Write a failing test first
   - Define expected behavior
   - Test should fail (feature doesn't exist yet)

2. **GREEN**: Write minimal code to pass the test
   - Implement just enough to make test pass
   - Don't over-engineer

3. **REFACTOR**: Clean up code
   - Optimize implementation
   - Maintain passing tests

## When to Write Tests

### Backend
- ✅ **BEFORE** implementing any controller method
- ✅ **BEFORE** adding new API endpoints
- ✅ **BEFORE** modifying business logic
- ✅ **BEFORE** adding database queries

### Frontend
- ✅ **BEFORE** creating new pages
- ✅ **BEFORE** adding complex components
- ✅ **BEFORE** implementing user interactions
- ✅ **BEFORE** modifying state management

## Coverage Requirements

```typescript
// Minimum coverage thresholds:
Statements: 80%
Branches: 75%
Functions: 80%
Lines: 80%

// Critical paths require 100% coverage:
- Authentication & authorization
- Payment processing
- Data mutations (create, update, delete)
- Security-sensitive operations
```

## Backend TDD Example

```typescript
// 1. RED: Write failing test FIRST
describe('POST /api/recipes', () => {
  it('should create a new recipe with valid data', async () => {
    const newRecipe = {
      title: 'Pasta Carbonara',
      prepTime: 15,
      cookTime: 20
    };

    const response = await request(app)
      .post('/api/recipes')
      .send(newRecipe)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.recipe.title).toBe('Pasta Carbonara');
  });
});

// 2. GREEN: Run test (it fails - endpoint doesn't exist)
// 3. GREEN: Implement controller
export const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await prisma.recipe.create({
    data: req.body
  });
  res.status(201).json({ status: 'success', data: { recipe } });
});

// 4. GREEN: Run test again (it passes)
// 5. REFACTOR: Clean up code while keeping tests green
```

## Frontend TDD Example

```typescript
// 1. RED: Write failing test FIRST
describe('RecipeCard', () => {
  it('should display recipe title and cooking time', () => {
    const recipe = {
      id: '1',
      title: 'Pasta Carbonara',
      totalTime: 35
    };

    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument();
    expect(screen.getByText('35 min')).toBeInTheDocument();
  });
});

// 2. GREEN: Run test (fails - component doesn't exist)
// 3. GREEN: Create component
// 4. REFACTOR: Clean up
```

## No Exceptions Policy

### ❌ NEVER
- Write code without tests
- "Test later" (you won't)
- Skip tests for "quick fixes"
- Commit untested code

### ✅ ALWAYS
- Write tests first
- Run tests before committing
- Maintain test coverage
- Update tests when changing code

## Running Tests in Docker

### Backend
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

### Frontend
```bash
# Run all tests
docker-compose exec frontend npm test

# UI mode
docker-compose exec frontend npm run test:ui

# Coverage
docker-compose exec frontend npm run test:coverage
```
