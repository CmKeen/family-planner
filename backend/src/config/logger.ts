import winston from 'winston';
import { env } from './env.js';
import fs from 'fs';

/**
 * Custom log format for development - includes colors and readable formatting
 */
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
  })
);

/**
 * Production format - structured JSON for log aggregation
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create Winston logger instance with environment-specific configuration
 */
const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'family-planner-api',
    environment: env.NODE_ENV
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Add file transports in production
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Create logs directory if it doesn't exist (production)
 */
if (env.NODE_ENV === 'production') {
  const logsDir = 'logs';

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
}

/**
 * Logging helper functions
 */
export const log = {
  /**
   * Log informational messages
   */
  info: (message: string, meta?: object) => {
    logger.info(message, meta);
  },

  /**
   * Log error messages with stack traces
   */
  error: (message: string, error?: Error | unknown, meta?: object) => {
    if (error instanceof Error) {
      logger.error(message, {
        ...meta,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else {
      logger.error(message, { ...meta, error });
    }
  },

  /**
   * Log warning messages
   */
  warn: (message: string, meta?: object) => {
    logger.warn(message, meta);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, meta?: object) => {
    logger.debug(message, meta);
  },

  /**
   * Log HTTP requests
   */
  http: (message: string, meta?: object) => {
    logger.http(message, meta);
  },

  /**
   * Log security events
   */
  security: (message: string, meta?: object) => {
    logger.warn(`[SECURITY] ${message}`, { ...meta, type: 'security' });
  },

  /**
   * Log authentication events
   */
  auth: (message: string, meta?: object) => {
    logger.info(`[AUTH] ${message}`, { ...meta, type: 'auth' });
  },

  /**
   * Log database operations
   */
  database: (message: string, meta?: object) => {
    logger.debug(`[DATABASE] ${message}`, { ...meta, type: 'database' });
  },
};

export default logger;
