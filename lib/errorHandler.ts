// Enterprise-grade error handling utility

import { ERROR_MESSAGES } from '../constants/appConstants';

export type ErrorCategory = 
  | 'NETWORK'
  | 'AUTH'
  | 'VALIDATION'
  | 'PERMISSION'
  | 'UPLOAD'
  | 'LOCATION'
  | 'UNKNOWN';

export interface AppError {
  code: string;
  message: string;
  category: ErrorCategory;
  originalError?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a standardized application error
 */
export function createAppError(
  code: string,
  message: string,
  category: ErrorCategory,
  originalError?: Error,
  metadata?: Record<string, unknown>
): AppError {
  return { code, message, category, originalError, metadata };
}

/**
 * Categorizes and normalizes errors from various sources
 */
export function categorizeError(error: unknown): AppError {
  if (!error) {
    return createAppError('UNKNOWN_ERROR', ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN');
  }

  const err = error as Error & { code?: string; status?: number };

  // Handle Supabase errors
  if (err.message?.includes('JWT') || err.message?.includes('session')) {
    return createAppError(
      'SESSION_EXPIRED',
      ERROR_MESSAGES.SESSION_EXPIRED,
      'AUTH',
      err
    );
  }

  // Handle network errors
  if (
    err.message?.includes('fetch') ||
    err.message?.includes('network') ||
    err.message?.includes('offline')
  ) {
    return createAppError(
      'NETWORK_ERROR',
      ERROR_MESSAGES.NETWORK_ERROR,
      'NETWORK',
      err
    );
  }

  // Handle permission errors
  if (err.message?.includes('permission') || err.message?.includes('denied')) {
    return createAppError(
      'PERMISSION_DENIED',
      ERROR_MESSAGES.LOCATION_DENIED,
      'PERMISSION',
      err
    );
  }

  // Handle upload errors
  if (err.message?.includes('upload') || err.message?.includes('storage')) {
    return createAppError(
      'UPLOAD_FAILED',
      ERROR_MESSAGES.UPLOAD_FAILED,
      'UPLOAD',
      err
    );
  }

  // Handle validation errors
  if (err.message?.includes('valid') || err.code === 'VALIDATION_ERROR') {
    return createAppError(
      'VALIDATION_ERROR',
      err.message,
      'VALIDATION',
      err
    );
  }

  // Default unknown error
  return createAppError(
    'UNKNOWN_ERROR',
    err.message || ERROR_MESSAGES.UNKNOWN_ERROR,
    'UNKNOWN',
    err
  );
}

/**
 * Logs errors with context for debugging
 */
export function logError(
  error: AppError | Error,
  context: string,
  metadata?: Record<string, unknown>
): void {
  const appError = 'category' in error ? error : categorizeError(error);
  
  console.error(`[${context}] ${appError.code}: ${appError.message}`, {
    category: appError.category,
    originalError: appError.originalError?.message,
    metadata: { ...metadata, ...appError.metadata },
    timestamp: new Date().toISOString(),
  });

  // In production, send to error tracking service (e.g., Sentry)
  // if (__DEV__) {
  //   console.error('Full error details:', error);
  // }
}

/**
 * Safe async wrapper that returns [data, error] tuple
 */
export async function safeAsync<T>(
  promise: Promise<T>
): Promise<[T | null, AppError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const appError = categorizeError(error);
    return [null, appError];
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    shouldRetry?: (error: AppError) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    shouldRetry = (error) => error.category === 'NETWORK',
  } = options;

  let lastError: AppError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = categorizeError(error);
      
      if (!shouldRetry(lastError) || attempt === maxAttempts) {
        throw lastError;
      }

      // Exponential backoff: delay * 2^(attempt-1)
      const backoffDelay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}

export default {
  createAppError,
  categorizeError,
  logError,
  safeAsync,
  retryAsync,
};
