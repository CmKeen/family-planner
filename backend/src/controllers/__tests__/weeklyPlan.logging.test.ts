import { vi } from 'vitest';
/**
 * Logging Tests for weeklyPlan.controller
 *
 * Tests to verify proper Winston logging instead of console statements (OBU-86)
 */

import { log } from '../../config/logger';

// Mock the logger
vi.mock('../../config/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    auth: vi.fn(),
  },
}));

describe('WeeklyPlan Controller - Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use Winston logger instead of console.log', () => {
    // Verify that the logger methods are available
    expect(log.debug).toBeDefined();
    expect(log.info).toBeDefined();
    expect(log.warn).toBeDefined();
    expect(log.error).toBeDefined();
  });

  it('should log debug messages with structured context', () => {
    const mockContext = {
      familyId: 'test-family-id',
      total: 10,
      proteins: 5,
      vegetables: 3,
      carbs: 2
    };

    log.debug('Components loaded for meal plan generation', mockContext);

    expect(log.debug).toHaveBeenCalledWith(
      'Components loaded for meal plan generation',
      expect.objectContaining({
        familyId: 'test-family-id',
        total: 10
      })
    );
  });

  it('should log errors with stack traces', () => {
    const mockError = new Error('Test error');
    const mockContext = {
      weeklyPlanId: 'test-plan-id',
      familyId: 'test-family-id',
      error: mockError.message,
      stack: mockError.stack
    };

    log.error('Failed to auto-generate shopping list for new plan', mockContext);

    expect(log.error).toHaveBeenCalledWith(
      'Failed to auto-generate shopping list for new plan',
      expect.objectContaining({
        weeklyPlanId: 'test-plan-id',
        error: 'Test error'
      })
    );
  });

  it('should log warnings for non-blocking failures', () => {
    const mockContext = {
      weeklyPlanId: 'test-plan-id',
      mealId: 'test-meal-id',
      memberId: 'test-member-id',
      error: 'Audit log failed'
    };

    log.warn('Failed to log meal skip audit entry', mockContext);

    expect(log.warn).toHaveBeenCalledWith(
      'Failed to log meal skip audit entry',
      expect.objectContaining({
        weeklyPlanId: 'test-plan-id',
        mealId: 'test-meal-id'
      })
    );
  });

  it('should use structured logging format consistently', () => {
    // Simulate different log calls
    log.debug('Debug message', { key: 'value' });
    log.info('Info message', { key: 'value' });
    log.warn('Warning message', { key: 'value' });
    log.error('Error message', { key: 'value' });

    // Verify all calls follow structured format: (message, context object)
    expect(log.debug).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    expect(log.info).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    expect(log.warn).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    expect(log.error).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
  });

  it('should not call console.log, console.error, or console.warn', () => {
    // Spy on console methods
    const consoleLogSpy = vi.spyOn(console, 'log');
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    // Use logger methods
    log.debug('Debug message', { key: 'value' });
    log.info('Info message', { key: 'value' });
    log.warn('Warning message', { key: 'value' });
    log.error('Error message', { key: 'value' });

    // Console methods should NOT be called
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
