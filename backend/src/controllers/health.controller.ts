import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getErrorStats } from '../config/errorTracker.js';
import { env } from '../config/env.js';
import prisma from '../lib/prisma.js';

/**
 * Health Check Types
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: ServiceStatus;
    api: ServiceStatus;
  };
  system: SystemMetrics;
  errors?: ErrorSummary;
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

interface SystemMetrics {
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  uptime: string;
  processId: number;
}

interface ErrorSummary {
  totalErrors: number;
  recentErrorTypes: string[];
}

/**
 * Basic Health Check
 * Returns a simple status for load balancers and monitoring tools
 */
export const basicHealthCheck = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Detailed Health Check
 * Returns comprehensive system health information
 */
export const detailedHealthCheck = asyncHandler(
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Check database connectivity
    const dbStatus = await checkDatabaseHealth();

    // Get system metrics
    const systemMetrics = getSystemMetrics();

    // Get error statistics (only for authenticated requests or internal checks)
    const includeErrors = req.query.includeErrors === 'true';
    const errorStats = includeErrors ? getErrorStats() : undefined;

    // Determine overall status
    const overallStatus = determineOverallStatus(dbStatus);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbStatus,
        api: {
          status: 'up',
          responseTime: Date.now() - startTime,
        },
      },
      system: systemMetrics,
      errors: includeErrors
        ? {
            totalErrors: errorStats?.totalErrors || 0,
            recentErrorTypes: Object.keys(errorStats?.errorsByType || {}),
          }
        : undefined,
    };

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  }
);

/**
 * Readiness Check
 * Indicates if the service is ready to accept traffic
 */
export const readinessCheck = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Check if database is accessible
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        message: 'Database not accessible',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * Liveness Check
 * Indicates if the service is alive (for Kubernetes/Docker)
 */
export const livenessCheck = asyncHandler(
  async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime > 1000 ? 'degraded' : 'up',
      responseTime,
      message: responseTime > 1000 ? 'Slow response time' : 'Connected',
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Get system metrics
 */
function getSystemMetrics(): SystemMetrics {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;

  return {
    memory: {
      used: formatBytes(usedMemory),
      total: formatBytes(totalMemory),
      percentage: Math.round((usedMemory / totalMemory) * 100),
    },
    uptime: formatUptime(process.uptime()),
    processId: process.pid,
  };
}

/**
 * Determine overall system status
 */
function determineOverallStatus(
  dbStatus: ServiceStatus
): 'healthy' | 'degraded' | 'unhealthy' {
  if (dbStatus.status === 'down') return 'unhealthy';
  if (dbStatus.status === 'degraded') return 'degraded';
  return 'healthy';
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(2)} MB`;
}

/**
 * Format uptime to human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
