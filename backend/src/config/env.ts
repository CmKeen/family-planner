/**
 * Environment Configuration and Validation
 *
 * Validates required environment variables on app startup
 * to fail fast with clear error messages.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import { log } from './logger';

// Load environment variables
dotenv.config();

/**
 * Environment Schema
 *
 * Defines all required and optional environment variables
 * with validation rules
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Database
  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL must be a valid PostgreSQL connection string',
  }),

  // JWT Authentication
  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters for security',
  }),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // App Information
  APP_NAME: z.string().optional().default('Family Planner'),
  APP_URL: z.string().url().optional(),
});

/**
 * Validated Environment Type
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate Environment
 *
 * Validates all environment variables and throws descriptive errors
 * if any are missing or invalid.
 */
function validateEnv(): Env {
  try {
    const validated = envSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      APP_NAME: process.env.APP_NAME,
      APP_URL: process.env.APP_URL,
    });

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => {
        return `${err.path.join('.')}: ${err.message}`;
      });

      log.error('Environment validation failed', {
        errors: messages,
        message: 'Please check your .env file and ensure all required variables are set. See .env.example for reference.'
      });

      process.exit(1);
    }

    throw error;
  }
}

/**
 * Validated and typed environment variables
 *
 * Use this instead of process.env for type safety and validation
 */
export const env = validateEnv();

/**
 * Log environment configuration (safe for production)
 *
 * Only logs non-sensitive configuration details
 */
export function logEnvConfig() {
  log.info('Environment configuration loaded', {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    CORS_ORIGIN: env.CORS_ORIGIN,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
    APP_NAME: env.APP_NAME
  });

  // Warn if using weak JWT secret in production
  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 64) {
    log.warn('JWT_SECRET is shorter than recommended length for production', {
      currentLength: env.JWT_SECRET.length,
      recommendedLength: 128,
      recommendation: 'Use a longer secret for production (128+ characters)'
    });
  }

  // Warn if using default secret
  if (env.JWT_SECRET.includes('secret') || env.JWT_SECRET.includes('change')) {
    log.warn('JWT_SECRET appears to be a default or example value', {
      recommendation: 'Generate a strong, random secret for production'
    });
  }

  // Check database connection string
  if (env.DATABASE_URL.includes('localhost') && env.NODE_ENV === 'production') {
    log.warn('DATABASE_URL points to localhost in production environment', {
      recommendation: 'Consider using a managed database service for production'
    });
  }
}
