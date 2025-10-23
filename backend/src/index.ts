import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env, logEnvConfig } from './config/env';
import { log } from './config/logger';
import authRoutes from './routes/auth.routes';
import familyRoutes from './routes/family.routes';
import recipeRoutes from './routes/recipe.routes';
import weeklyPlanRoutes from './routes/weeklyPlan.routes';
import shoppingListRoutes from './routes/shoppingList.routes';
import schoolMenuRoutes from './routes/schoolMenu.routes';
import healthRoutes from './routes/health.routes';
import { createAdminRouter } from './routes/admin.routes';
import { authenticateAdmin } from './middleware/adminAuth';
import { errorHandler } from './middleware/errorHandler';
import {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsOptions,
  sanitizeRequest,
} from './middleware/security';
import { getEnvironmentLimiter } from './middleware/rateLimiter';
import { skipHealthCheck } from './middleware/requestLogger';

// Validate and log environment configuration
logEnvConfig();

const app = express();
const PORT = env.PORT;

// Security Middleware (must be first!)
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// Rate limiting (global)
app.use(getEnvironmentLimiter());

// CORS with security configuration
app.use(cors(getCorsOptions(env.CORS_ORIGIN)));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request sanitization
app.use(sanitizeRequest);

// Request logging (skip health checks to reduce noise)
app.use(skipHealthCheck);

// Health check routes (before API routes for faster response)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Family Planner API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Admin Panel (protected by admin authentication)
app.use('/admin', authenticateAdmin, createAdminRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/weekly-plans', weeklyPlanRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/school-menus', schoolMenuRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  log.info(`${env.APP_NAME} Server Started Successfully`, {
    port: PORT,
    environment: env.NODE_ENV,
    endpoints: {
      admin: `http://localhost:${PORT}/admin`,
      apiDocs: `http://localhost:${PORT}/api-docs`,
      swaggerJson: `http://localhost:${PORT}/api-docs.json`,
      health: `http://localhost:${PORT}/health`,
      healthDetailed: `http://localhost:${PORT}/health/detailed`,
      readiness: `http://localhost:${PORT}/health/ready`,
      liveness: `http://localhost:${PORT}/health/live`,
    },
  });

  // Keep console output for Docker logs
  console.log(`\n🚀 ${env.APP_NAME} Server Started Successfully!`);
  console.log(`   📍 Port: ${PORT}`);
  console.log(`   📝 Environment: ${env.NODE_ENV}`);
  console.log(`   🔑 Admin Panel: http://localhost:${PORT}/admin (requires admin user)`);
  console.log(`   📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`   🔍 Swagger JSON: http://localhost:${PORT}/api-docs.json`);
  console.log(`   ✅ Health Check: http://localhost:${PORT}/health`);
  console.log(`   🏥 Health Detailed: http://localhost:${PORT}/health/detailed`);
  console.log(`   ⚡ Readiness: http://localhost:${PORT}/health/ready`);
  console.log(`   💓 Liveness: http://localhost:${PORT}/health/live`);
  console.log('\n📊 Ready to accept connections!\n');
});
