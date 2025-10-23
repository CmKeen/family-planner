/**
 * Environment Configuration and Validation
 *
 * Validates required environment variables on app startup
 * to fail fast with clear error messages.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

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
        return `  ❌ ${err.path.join('.')}: ${err.message}`;
      });

      console.error('\n🚨 Environment Validation Failed:\n');
      console.error(messages.join('\n'));
      console.error('\n📝 Please check your .env file and ensure all required variables are set.\n');
      console.error('💡 See .env.example for reference.\n');

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
  console.log('\n✅ Environment Configuration Loaded:');
  console.log(`   📝 NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   🚀 PORT: ${env.PORT}`);
  console.log(`   🌐 CORS_ORIGIN: ${env.CORS_ORIGIN}`);
  console.log(`   🔑 JWT_EXPIRES_IN: ${env.JWT_EXPIRES_IN}`);
  console.log(`   📦 APP_NAME: ${env.APP_NAME}`);

  // Warn if using weak JWT secret in production
  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 64) {
    console.warn('\n⚠️  WARNING: JWT_SECRET is shorter than 64 characters.');
    console.warn('   For production, use a longer secret (e.g., 128+ characters).\n');
  }

  // Warn if using default secret
  if (env.JWT_SECRET.includes('secret') || env.JWT_SECRET.includes('change')) {
    console.warn('\n⚠️  WARNING: JWT_SECRET appears to be a default/example value.');
    console.warn('   Please generate a strong, random secret for production.\n');
  }

  // Check database connection string
  if (env.DATABASE_URL.includes('localhost') && env.NODE_ENV === 'production') {
    console.warn('\n⚠️  WARNING: DATABASE_URL points to localhost in production.');
    console.warn('   Consider using a managed database service.\n');
  }

  console.log('');
}
