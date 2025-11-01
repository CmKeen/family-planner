import { Router } from 'express';
import {
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
} from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Simple health check endpoint for load balancers
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', basicHealthCheck);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Comprehensive health check with system metrics
 *     tags: [Health]
 *     parameters:
 *       - in: query
 *         name: includeErrors
 *         schema:
 *           type: boolean
 *         description: Include error statistics in response
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy or degraded
 */
router.get('/detailed', detailedHealthCheck);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Checks if service is ready to accept traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', readinessCheck);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     description: Checks if service is alive (for Kubernetes)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', livenessCheck);

export default router;
