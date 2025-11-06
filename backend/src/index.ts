import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { swaggerSpec } from './config/swagger.js';
import { env, logEnvConfig } from './config/env.js';
import { log } from './config/logger.js';
import authRoutes from './routes/auth.routes.js';
import familyRoutes from './routes/family.routes.js';
import recipeRoutes from './routes/recipe.routes.js';
import weeklyPlanRoutes from './routes/weeklyPlan.routes.js';
import shoppingListRoutes from './routes/shoppingList.routes.js';
import schoolMenuRoutes from './routes/schoolMenu.routes.js';
import mealScheduleTemplateRoutes from './routes/mealScheduleTemplate.routes.js';
import foodComponentRoutes from './routes/foodComponent.routes.js';
import healthRoutes from './routes/health.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';
import adminApiRoutes from './routes/admin.api.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsOptions,
  sanitizeRequest,
} from './middleware/security.js';
import { getEnvironmentLimiter } from './middleware/rateLimiter.js';
import { skipHealthCheck } from './middleware/requestLogger.js';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Cookie parser (needed by AdminJS session)
app.use(cookieParser());

// Request logging (skip health checks to reduce noise)
app.use(skipHealthCheck);

// Serve static files (for recipe images)
const publicPath = path.join(__dirname, '..', 'public');
app.use('/images', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/images', express.static(path.join(publicPath, 'images')));

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

// Admin Panel (MUST be before body parser middleware)
app.use('/admin', createAdminRouter());

// Body parsing middleware (MUST be after Admin Panel)
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Admin API routes (protected by admin authentication)
app.use('/api/admin', adminApiRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/weekly-plans', weeklyPlanRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/school-menus', schoolMenuRoutes);
app.use('/api/components', foodComponentRoutes);
app.use('/api', mealScheduleTemplateRoutes);

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
