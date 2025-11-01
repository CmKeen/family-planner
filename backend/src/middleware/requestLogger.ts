import { Request, Response, NextFunction } from 'express';
import { log } from '../config/logger.js';

/**
 * Request logging middleware
 * Logs all incoming HTTP requests with timing and status information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';

    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
      userId: (req as any).user?.id, // Include user ID if authenticated
    };

    const message = `${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms`;

    if (logLevel === 'error') {
      log.error(message, logData);
    } else if (logLevel === 'warn') {
      log.warn(message, logData);
    } else {
      log.http(message, logData);
    }
  });

  next();
};

/**
 * Skip logging for health check endpoints
 */
export const skipHealthCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  return requestLogger(req, res, next);
};
