# Test Documentation

## Overview

This document describes the comprehensive test suite for the Family Planner application, covering both backend and frontend testing.

## Test Coverage

### Backend Tests (Jest + TypeScript)

#### 1. Unit Tests - Meal Planning Algorithm
**File**: `backend/src/controllers/__tests__/weeklyPlan.test.ts`

**Coverage**:
- Week number calculation
- Recipe selection algorithm
- Compliant recipe filtering
- Favorite/novelty distribution
- School menu anti-duplication
- Dietary constraint filtering (kosher, halal, vegetarian, vegan, gluten-free, lactose-free)
- Allergen filtering
- Express plan generation

**Key Test Cases**:
- `getWeekNumber()`: Validates week number calculation for start, mid, and end of year
- `selectRecipe()`: Tests recipe selection logic with favorites, novelties, and category avoidance
- `getCompliantRecipes()`: Tests filtering by dietary constraints and allergens
- Meal planning logic: Validates 14 meals per week, favorite ratio, novelty limits
- Express plan: Validates favorites-only selection with one novelty

#### 2. Unit Tests - Shopping List Algorithm
**File**: `backend/src/controllers/__tests__/shoppingList.test.ts`

**Coverage**:
- Quantity rounding (kg, g, L, ml, pieces)
- Ingredient aggregation
- Portion adjustment
- Inventory deduction
- Dietary substitutions
- Shopping list generation from weekly plan

**Key Test Cases**:
- `roundQuantity()`: Tests rounding to standard package sizes
- Ingredient aggregation: Combines same ingredients across recipes
- Portion scaling: Adjusts quantities based on servings
- Inventory deduction: Subtracts available items from shopping list
- Dietary substitutions: Suggests alternatives for lactose-free, gluten-free, vegan

#### 3. Integration Tests - API Endpoints
**File**: `backend/src/__tests__/integration/weeklyPlan.integration.test.ts`

**Coverage**:
- POST `/api/weekly-plans` - Create weekly plan
- GET `/api/weekly-plans/family/:familyId` - List family plans
- GET `/api/weekly-plans/:id` - Get plan details
- POST `/api/weekly-plans/family/:familyId/auto` - Generate auto plan
- POST `/api/weekly-plans/family/:familyId/express` - Generate express plan
- PATCH `/api/weekly-plans/:planId/meals/:mealId/swap` - Swap meal recipe
- PATCH `/api/weekly-plans/:planId/meals/:mealId/lock` - Lock/unlock meal
- POST `/api/weekly-plans/:planId/validate` - Validate plan

**Key Test Cases**:
- Successful plan creation with valid data
- Error handling for invalid inputs
- Auto plan generation with dietary constraints
- Express plan generation with favorites
- Meal modifications (swap, lock, portion adjustment)
- Plan validation

### Frontend Tests (Vitest + React Testing Library)

#### 1. WeeklyPlanPage Component Tests
**File**: `frontend/src/pages/__tests__/WeeklyPlanPage.test.tsx`

**Coverage**:
- Loading state display
- Weekly plan rendering with meals
- Stats calculation (time, favorites, novelties)
- Meal cards for all 7 days
- Meal type badges (lunch/dinner)
- Recipe details (name, time, portions, tags)
- Interactive features (swap, adjust portions, lock/unlock)
- Plan validation workflow
- Navigation to shopping list
- Dialog interactions

**Key Test Cases**:
- Renders loading spinner initially
- Displays all 7 days of the week
- Shows correct meal statistics
- Opens swap dialog on button click
- Opens portion adjustment dialog
- Validates plan with confirmation
- Displays favorite heart icons
- Shows cooking and prep times

#### 2. RecipesPage Component Tests
**File**: `frontend/src/pages/__tests__/RecipesPage.test.tsx`

**Coverage**:
- Recipe catalog display
- Search functionality
- Category filtering
- Dietary filters
- Recipe cards with info
- Recipe detail dialog
- Favorite toggling
- Empty states

**Key Test Cases**:
- Renders recipe grid with cards
- Search bar filters recipes
- Category tabs filter by category
- Filter panel shows dietary options
- Recipe detail dialog displays ingredients and instructions
- Favorite heart toggles recipe favorite status
- Shows "no recipes found" when empty
- Displays recipe tags and kosher categories

#### 3. ShoppingListPage Component Tests
**File**: `frontend/src/pages/__tests__/ShoppingListPage.test.tsx`

**Coverage**:
- Shopping list rendering
- Item grouping by category
- Item grouping by recipe
- Progress tracking
- Item checking/unchecking
- View mode switching
- Print functionality
- Empty states

**Key Test Cases**:
- Renders shopping list with items
- Groups items by category correctly
- Shows progress percentage
- Toggles item checked state
- Switches between category and recipe views
- Displays recipe names for each item
- Shows checked items with strikethrough
- Calculates progress correctly
- Sorts categories in proper order

## Running Tests

### Backend Tests

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Configuration

### Backend (Jest)

**Configuration File**: `backend/jest.config.js`

```javascript
- Preset: ts-jest
- Environment: node
- Test match: **/*.test.ts, **/*.spec.ts
- Coverage threshold: Not enforced (optional)
- Module paths: @/ alias for src/
```

### Frontend (Vitest)

**Configuration File**: `frontend/vitest.config.ts`

```typescript
- Environment: jsdom
- Globals: true
- Setup file: src/test/setup.ts
- CSS support: Enabled
- Coverage provider: v8
- Module alias: @/ for src/
```

**Setup File**: `frontend/src/test/setup.ts`
- Imports @testing-library/jest-dom matchers
- Mocks window.matchMedia
- Mocks IntersectionObserver
- Cleanup after each test

## Continuous Integration

### Recommended CI Pipeline

```yaml
# .github/workflows/test.yml (example)
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
      - run: cd frontend && npm run test:coverage
```

## Test Data

### Backend Mock Data

Tests use mock Prisma client with predefined data:
- Mock family with dietary profile
- Mock recipes (favorites, novelties)
- Mock school menus
- Mock weekly plans with meals

### Frontend Mock Data

Tests use mock API responses:
- Mock weekly plans with 14 meals
- Mock recipes with ingredients and instructions
- Mock shopping lists with items

## Coverage Goals

### Recommended Targets

- **Backend**:
  - Controllers: 80%+
  - Core algorithms: 90%+
  - Integration tests: All endpoints

- **Frontend**:
  - Components: 70%+
  - Pages: 80%+
  - Critical user flows: 100%

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate week number', () => {
     // Arrange
     const date = new Date('2024-01-01');

     // Act
     const weekNum = getWeekNumber(date);

     // Assert
     expect(weekNum).toBe(1);
   });
   ```

2. **Use Descriptive Test Names**
   - ✅ `should filter recipes by allergens`
   - ❌ `test filtering`

3. **Test One Thing Per Test**
   - Each test should verify a single behavior

4. **Use waitFor for Async Operations**
   ```typescript
   await waitFor(() => {
     expect(screen.getByText('Loaded')).toBeInTheDocument();
   });
   ```

5. **Mock External Dependencies**
   - API calls
   - Database operations
   - Third-party services

### Debugging Tests

```bash
# Run specific test file
npm test weeklyPlan.test.ts

# Run tests matching pattern
npm test -- --grep="recipe selection"

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# View detailed error messages
npm test -- --verbose
```

## Common Issues

### Backend

1. **Prisma Mock Not Working**
   - Ensure `jest.mock('../../lib/prisma')` is at top of file
   - Use `vi.mocked()` to type mocks correctly

2. **Async Test Timeouts**
   - Increase timeout: `jest.setTimeout(10000)`
   - Ensure promises are awaited

### Frontend

1. **Component Not Rendering**
   - Check if providers are wrapped (QueryClient, Router)
   - Verify mock data structure

2. **User Events Not Working**
   - Use `userEvent.setup()` before tests
   - Await user interactions: `await user.click(button)`

3. **Query Not Resolving**
   - Mock API functions properly
   - Use `waitFor()` for async queries

## Adding New Tests

### Backend Controller Test Template

```typescript
import { describe, it, expect, vi } from '@jest/globals';

vi.mock('../../lib/prisma', () => ({
  default: {
    // Mock Prisma methods
  }
}));

describe('MyController', () => {
  it('should do something', async () => {
    // Arrange
    const mockData = { /* ... */ };

    // Act
    const result = await myFunction(mockData);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Frontend Component Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api', () => ({
  myAPI: {
    fetch: vi.fn()
  }
}));

describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
  });

  const renderWithProviders = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MyComponent />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
```

## Future Improvements

### Potential Additions

1. **E2E Tests with Playwright**
   - Full user workflows
   - Cross-browser testing
   - Visual regression testing

2. **Performance Tests**
   - Load testing for API
   - React component render performance

3. **Accessibility Tests**
   - axe-core integration
   - Keyboard navigation testing

4. **Contract Tests**
   - API contract validation
   - Schema validation

5. **Mutation Testing**
   - Stryker for test quality
   - Coverage of edge cases

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review test examples in the codebase
3. Consult testing framework docs
4. Create an issue in the repository
