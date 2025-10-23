/**
 * Security Middleware Configuration
 *
 * Configures helmet.js security headers and other security measures
 * to protect against common web vulnerabilities.
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { log } from '../config/logger';

/**
 * Helmet Security Headers Configuration
 *
 * Protects against:
 * - XSS attacks
 * - Clickjacking
 * - MIME type sniffing
 * - DNS prefetch attacks
 * - And more...
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Frameguard (prevent clickjacking)
  frameguard: {
    action: 'deny',
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // Don't sniff MIME types
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // XSS Filter
  xssFilter: true,
});

/**
 * Additional Security Headers
 *
 * Adds custom security headers not covered by helmet
 */
export const additionalSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Expect-CT (Certificate Transparency)
  res.setHeader('Expect-CT', 'max-age=86400, enforce');

  // X-Content-Type-Options (already set by helmet, but explicit)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
};

/**
 * CORS Security Configuration
 *
 * Configured separately in main index.ts
 */
export const getCorsOptions = (allowedOrigin: string) => ({
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Support multiple origins (comma-separated)
    const allowedOrigins = allowedOrigin.split(',').map(o => o.trim());

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours
});

/**
 * Request Sanitization
 *
 * Basic sanitization to prevent injection attacks
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Remove any null bytes from query parameters
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = (req.query[key] as string).replace(/\0/g, '');
      }
    });
  }

  // Remove null bytes from request body
  if (req.body && typeof req.body === 'object') {
    JSON.stringify(req.body, (key, value) => {
      if (typeof value === 'string') {
        return value.replace(/\0/g, '');
      }
      return value;
    });
  }

  next();
};

/**
 * Security Logging
 *
 * Logs security-related events using Winston logger
 */
export const logSecurityEvent = (
  event: string,
  details: any,
  req?: Request
) => {
  const logContext = {
    event,
    details,
    ip: req?.ip,
    userAgent: req?.get('user-agent'),
    path: req?.path,
  };

  log.security(event, logContext);
};
