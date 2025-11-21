import { toast as sonnerToast } from 'sonner';
import { TFunction } from 'i18next';
import { AxiosError } from 'axios';

/**
 * Error message extraction utility
 * Extracts user-friendly error messages from API responses
 */
export const getErrorMessage = (error: unknown, t: TFunction): string => {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
      details?: string;
    }>;

    // Network errors
    if (!axiosError.response) {
      return t('toast.error.network');
    }

    // Status code based errors
    switch (axiosError.response.status) {
      case 401:
        return t('toast.error.unauthorized');
      case 403:
        return t('toast.error.forbidden');
      case 404:
        return t('toast.error.notFound');
      case 422:
        return t('toast.error.validationError');
      case 500:
      case 502:
      case 503:
      case 504:
        return t('toast.error.serverError');
      default:
        // Try to extract error message from response
        if (axiosError.response.data?.message) {
          return axiosError.response.data.message;
        }
        if (axiosError.response.data?.error) {
          return axiosError.response.data.error;
        }
        return t('toast.error.unknown');
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || t('toast.error.unknown');
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return t('toast.error.unknown');
};

/**
 * Get error details from API response
 */
export const getErrorDetails = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{
      details?: string;
      errors?: Record<string, string[]>;
    }>;

    if (axiosError.response?.data?.details) {
      return axiosError.response.data.details;
    }

    // Handle validation errors
    if (axiosError.response?.data?.errors) {
      const errors = axiosError.response.data.errors;
      const errorMessages = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      return errorMessages;
    }
  }

  return undefined;
};

/**
 * Toast helper functions with i18n support
 */
export const showToast = {
  /**
   * Show error toast
   */
  error: (error: unknown, t: TFunction, options?: { action?: { label: string; onClick: () => void } }) => {
    const message = getErrorMessage(error, t);
    const details = getErrorDetails(error);

    sonnerToast.error(message, {
      description: details,
      duration: 5000,
      action: options?.action,
    });
  },

  /**
   * Show success toast
   */
  success: (message: string, options?: {
    description?: string;
    action?: { label: string; onClick: () => void };
  }) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: 5000,
      action: options?.action,
    });
  },

  /**
   * Show info toast
   */
  info: (message: string, options?: { description?: string }) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: 5000,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, options?: { description?: string }) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: 5000,
    });
  },

  /**
   * Show loading toast
   */
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  /**
   * Dismiss a toast
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Promise-based toast (shows loading, then success/error)
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};

/**
 * Action button creator for retry functionality
 */
export const createRetryAction = (onRetry: () => void, t: TFunction) => ({
  label: t('common.retry'),
  onClick: onRetry,
});

/**
 * Action button creator for undo functionality
 */
export const createUndoAction = (onUndo: () => void, t: TFunction) => ({
  label: t('common.undo'),
  onClick: onUndo,
});
