import { Request, Response, NextFunction } from 'express';
import { log } from '../config/logger.js';
import { trackError } from '../config/errorTracker.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Collect error context
  const errorContext = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress,
    userId: (req as any).user?.id,
    userAgent: req.get('user-agent'),
  };

  if (err instanceof AppError) {
    // Operational errors (expected errors)
    log.warn(`Operational error: ${err.message}`, {
      ...errorContext,
      statusCode: err.statusCode,
    });

    // Track operational errors (don't send to external service for expected errors)
    // but keep for statistics
    if (err.statusCode >= 500) {
      trackError(err, errorContext);
    }

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Unexpected errors (programming errors, bugs)
  log.error('Unexpected error occurred', err, errorContext);

  // Track all unexpected errors
  trackError(err, errorContext);

  // In development, send the full error stack
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
    });
  }

  // In production, send generic error message
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
