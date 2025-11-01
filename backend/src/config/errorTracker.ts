import { log } from './logger';
import { env } from './env';

/**
 * Error Tracking Configuration
 *
 * Provides structured error tracking with context and grouping.
 * Can be easily integrated with external services like Sentry.
 */

interface ErrorContext {
  userId?: string;
  email?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

interface TrackedError {
  message: string;
  stack?: string;
  name: string;
  context: ErrorContext;
  timestamp: Date;
  environment: string;
}

/**
 * Error Tracker Class
 *
 * Provides methods to track and log errors with full context
 */
class ErrorTracker {
  private errorCount: Map<string, number> = new Map();
  private lastErrors: TrackedError[] = [];
  private maxStoredErrors = 100;

  /**
   * Track an error with context
   */
  captureError(error: Error, context: ErrorContext = {}): void {
    const trackedError: TrackedError = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: new Date(),
      environment: env.NODE_ENV,
    };

    // Store error for statistics
    this.storeError(trackedError);

    // Log the error
    log.error(`Error captured: ${error.name}`, error, {
      ...context,
      errorId: this.generateErrorId(error),
    });

    // In production, this is where you'd send to Sentry/LogRocket
    if (env.NODE_ENV === 'production') {
      this.sendToExternalService(trackedError);
    }
  }

  /**
   * Track an exception with message and context
   */
  captureMessage(message: string, context: ErrorContext = {}): void {
    const trackedError: TrackedError = {
      message,
      name: 'CapturedMessage',
      context,
      timestamp: new Date(),
      environment: env.NODE_ENV,
    };

    this.storeError(trackedError);

    log.warn(`Message captured: ${message}`, context);

    if (env.NODE_ENV === 'production') {
      this.sendToExternalService(trackedError);
    }
  }

  /**
   * Store error for statistics and analysis
   */
  private storeError(error: TrackedError): void {
    // Update error count
    const errorId = `${error.name}:${error.message}`;
    this.errorCount.set(errorId, (this.errorCount.get(errorId) || 0) + 1);

    // Store error (FIFO queue)
    this.lastErrors.push(error);
    if (this.lastErrors.length > this.maxStoredErrors) {
      this.lastErrors.shift();
    }
  }

  /**
   * Generate a unique error ID for grouping
   */
  private generateErrorId(error: Error): string {
    const stackLine = error.stack?.split('\n')[1] || '';
    return `${error.name}-${this.hashCode(error.message + stackLine)}`;
  }

  /**
   * Simple hash function for error grouping
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Send error to external service (Sentry, LogRocket, etc.)
   * This is a placeholder that can be implemented later
   */
  private sendToExternalService(error: TrackedError): void {
    // TODO: Implement Sentry/LogRocket integration
    // Example with Sentry:
    // Sentry.captureException(error, {
    //   contexts: { custom: error.context },
    //   tags: { environment: error.environment }
    // });

    // For now, just log that we would send it
    log.debug('Would send to external error tracking service', {
      errorName: error.name,
      errorMessage: error.message,
    });
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: TrackedError[];
  } {
    const errorsByType: Record<string, number> = {};
    this.errorCount.forEach((count, key) => {
      errorsByType[key] = count;
    });

    return {
      totalErrors: this.lastErrors.length,
      errorsByType,
      recentErrors: this.lastErrors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Clear error statistics (useful for testing)
   */
  clear(): void {
    this.errorCount.clear();
    this.lastErrors = [];
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Convenience functions for error tracking
 */
export const trackError = (error: Error, context?: ErrorContext) => {
  errorTracker.captureError(error, context);
};

export const trackMessage = (message: string, context?: ErrorContext) => {
  errorTracker.captureMessage(message, context);
};

export const getErrorStats = () => {
  return errorTracker.getStats();
};
