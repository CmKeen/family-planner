import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import { getErrorMessage, getErrorDetails, showToast, createRetryAction, createUndoAction } from '../toast';
import { toast as sonnerToast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('Toast Utilities', () => {
  // Mock translation function - cast as any to avoid TFunction type complexity in tests
  const mockT = ((key: string) => {
    const translations: Record<string, string> = {
      'toast.error.network': 'Unable to connect to server',
      'toast.error.unauthorized': 'You need to log in again',
      'toast.error.forbidden': 'You don\'t have permission',
      'toast.error.notFound': 'Resource not found',
      'toast.error.serverError': 'Server error occurred',
      'toast.error.validationError': 'Invalid data',
      'toast.error.unknown': 'Unknown error',
      'common.retry': 'Retry',
      'common.undo': 'Undo',
    };
    return translations[key] || key;
  }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getErrorMessage', () => {
    it('should handle network errors', () => {
      const error = {
        isAxiosError: true,
        response: undefined,
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Unable to connect to server');
    });

    it('should handle 401 unauthorized errors', () => {
      const error = {
        isAxiosError: true,
        response: { status: 401 },
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('You need to log in again');
    });

    it('should handle 403 forbidden errors', () => {
      const error = {
        isAxiosError: true,
        response: { status: 403 },
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('You don\'t have permission');
    });

    it('should handle 404 not found errors', () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 },
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Resource not found');
    });

    it('should handle 422 validation errors', () => {
      const error = {
        isAxiosError: true,
        response: { status: 422 },
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Invalid data');
    });

    it('should handle 500 server errors', () => {
      const error = {
        isAxiosError: true,
        response: { status: 500 },
      } as AxiosError;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Server error occurred');
    });

    it('should extract message from response data', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { message: 'Custom error message' },
        },
      } as AxiosError<{ message: string }>;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Custom error message');
    });

    it('should extract error from response data', () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Custom error' },
        },
      } as AxiosError<{ error: string }>;

      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Custom error');
    });

    it('should handle Error objects', () => {
      const error = new Error('Something went wrong');
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Something went wrong');
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('String error message');
    });

    it('should handle unknown error types', () => {
      const error = { unknown: 'error' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Unknown error');
    });
  });

  describe('getErrorDetails', () => {
    it('should extract details from response', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: { details: 'Error details here' },
        },
      } as AxiosError<{ details: string }>;

      const result = getErrorDetails(error);
      expect(result).toBe('Error details here');
    });

    it('should format validation errors', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            errors: {
              email: ['Email is required', 'Email must be valid'],
              password: ['Password is too short'],
            },
          },
        },
      } as any;

      const result = getErrorDetails(error);
      expect(result).toContain('email: Email is required, Email must be valid');
      expect(result).toContain('password: Password is too short');
    });

    it('should return undefined for errors without details', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {},
        },
      } as AxiosError;

      const result = getErrorDetails(error);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-axios errors', () => {
      const error = new Error('Regular error');
      const result = getErrorDetails(error);
      expect(result).toBeUndefined();
    });
  });

  describe('showToast', () => {
    it('should call sonner error toast with correct parameters', () => {
      const error = new Error('Test error');
      showToast.error(error, mockT);

      expect(sonnerToast.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          duration: 5000,
        })
      );
    });

    it('should call sonner error toast with action', () => {
      const error = new Error('Test error');
      const action = { label: 'Retry', onClick: vi.fn() };
      showToast.error(error, mockT, { action });

      expect(sonnerToast.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          duration: 5000,
          action,
        })
      );
    });

    it('should call sonner success toast', () => {
      showToast.success('Success message');

      expect(sonnerToast.success).toHaveBeenCalledWith(
        'Success message',
        expect.objectContaining({
          duration: 5000,
        })
      );
    });

    it('should call sonner success toast with description and action', () => {
      const action = { label: 'Undo', onClick: vi.fn() };
      showToast.success('Success message', {
        description: 'Details here',
        action,
      });

      expect(sonnerToast.success).toHaveBeenCalledWith(
        'Success message',
        expect.objectContaining({
          description: 'Details here',
          duration: 5000,
          action,
        })
      );
    });

    it('should call sonner info toast', () => {
      showToast.info('Info message');

      expect(sonnerToast.info).toHaveBeenCalledWith(
        'Info message',
        expect.objectContaining({
          duration: 5000,
        })
      );
    });

    it('should call sonner warning toast', () => {
      showToast.warning('Warning message');

      expect(sonnerToast.warning).toHaveBeenCalledWith(
        'Warning message',
        expect.objectContaining({
          duration: 5000,
        })
      );
    });

    it('should call sonner loading toast', () => {
      showToast.loading('Loading...');

      expect(sonnerToast.loading).toHaveBeenCalledWith('Loading...');
    });

    it('should call sonner dismiss', () => {
      showToast.dismiss('toast-id');

      expect(sonnerToast.dismiss).toHaveBeenCalledWith('toast-id');
    });

    it('should call sonner promise toast', () => {
      const promise = Promise.resolve('data');
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      };

      showToast.promise(promise, messages);

      expect(sonnerToast.promise).toHaveBeenCalledWith(promise, messages);
    });
  });

  describe('createRetryAction', () => {
    it('should create a retry action with correct label and callback', () => {
      const onRetry = vi.fn();
      const action = createRetryAction(onRetry, mockT);

      expect(action.label).toBe('Retry');
      expect(action.onClick).toBe(onRetry);

      action.onClick();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUndoAction', () => {
    it('should create an undo action with correct label and callback', () => {
      const onUndo = vi.fn();
      const action = createUndoAction(onUndo, mockT);

      expect(action.label).toBe('Undo');
      expect(action.onClick).toBe(onUndo);

      action.onClick();
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });
});
