/**
 * Rate Limiting Middleware
 *
 * Protects against brute force attacks and API abuse by limiting
 * the number of requests from a single IP address.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limit handler
 * Called when a client exceeds the rate limit
 */
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Standard rate limit for API endpoints
 * Allows 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: rateLimitHandler,
  // Skip rate limiting for certain IPs (e.g., health checks)
  skip: (req) => {
    // Skip health check endpoint
    return req.path === '/health';
  },
});

/**
 * Strict rate limit for authentication endpoints
 * Allows only 5 requests per 15 minutes to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // Key generator: use IP + user agent for more granular control
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('user-agent')}`;
  },
});

/**
 * Registration rate limit
 * Allows only 3 registration attempts per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 requests per hour
  message: 'Too many accounts created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Password reset rate limit
 * Allows only 3 password reset requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 requests per hour
  message: 'Too many password reset attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Generous rate limit for read-only endpoints
 * Allows 200 requests per 15 minutes
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Max 200 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip for health checks and docs
    return req.path === '/health' || req.path.startsWith('/api-docs');
  },
});

/**
 * Strict rate limit for resource-intensive operations
 * (e.g., meal plan generation, shopping list generation)
 */
export const intensiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 requests per minute
  message: 'Too many resource-intensive requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * File upload rate limit
 * Protects against storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 uploads per hour
  message: 'Upload limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Development rate limiter (more permissive)
 * Used in development environment for testing
 */
export const devLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Very high limit for development
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Get appropriate rate limiter based on environment
 */
export const getEnvironmentLimiter = () => {
  return process.env.NODE_ENV === 'production' ? apiLimiter : devLimiter;
};
