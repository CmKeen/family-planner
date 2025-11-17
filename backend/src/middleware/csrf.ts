import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

/**
 * CSRF Protection using Double Submit Cookie Pattern
 *
 * How it works:
 * 1. Server generates a random CSRF token
 * 2. Token is set in a non-httpOnly cookie (readable by JS)
 * 3. Frontend must read this cookie and send it in X-CSRF-Token header
 * 4. Server validates that cookie value matches header value
 *
 * This is secure because:
 * - Attacker cannot read the cookie from cross-origin (same-origin policy)
 * - Attacker cannot forge both cookie and header from external site
 * - Only legitimate JS from same origin can read and send the token
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Set CSRF token in response cookie
 * Call this after successful authentication
 */
export const setCsrfToken = (res: Response): string => {
  const token = generateCsrfToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (match JWT expiry)
    path: '/'
  });

  return token;
};

/**
 * Clear CSRF token cookie on logout
 */
export const clearCsrfToken = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME);
};

/**
 * Middleware to validate CSRF token
 * Skips validation for safe HTTP methods (GET, HEAD, OPTIONS)
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip for safe methods that don't modify state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // Get token from header (case-insensitive)
  const headerToken = req.get(CSRF_HEADER_NAME);

  // Validate both exist
  if (!cookieToken || !headerToken) {
    return next(new AppError('CSRF token missing', 403));
  }

  // Validate tokens match (timing-safe comparison)
  if (!timingSafeEqual(cookieToken, headerToken)) {
    return next(new AppError('CSRF token invalid', 403));
  }

  next();
};

/**
 * Timing-safe string comparison to prevent timing attacks
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Middleware to skip CSRF protection for specific routes
 * Useful for public endpoints like health checks
 */
export const skipCsrfFor = (paths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (paths.some(path => req.path.startsWith(path))) {
      return next();
    }
    return csrfProtection(req, res, next);
  };
};

/**
 * Create CSRF token endpoint
 * Frontend can call this to get a new CSRF token
 */
export const getCsrfTokenHandler = (req: Request, res: Response) => {
  const token = setCsrfToken(res);
  res.json({ csrfToken: token });
};
