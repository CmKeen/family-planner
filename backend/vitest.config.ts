import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      // Exclude old Jest tests temporarily
      '**/foodComponent.test.ts',
      '**/mealComponent.test.ts',
      '**/shoppingList.test.ts',
      '**/weeklyPlan.test.ts',
      '**/weeklyPlan.saveRecipe.test.ts',
      // Exclude controller/middleware tests due to complex prisma mocking
      '**/mealComment.controller.test.ts',
      '**/auditLog.controller.test.ts',
      '**/cutoffEnforcement.test.ts'
    ],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/scripts/**'
      ]
    }
  }
});
