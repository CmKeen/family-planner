import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env, logEnvConfig } from './config/env';
import authRoutes from './routes/auth.routes';
import familyRoutes from './routes/family.routes';
import recipeRoutes from './routes/recipe.routes';
import weeklyPlanRoutes from './routes/weeklyPlan.routes';
import shoppingListRoutes from './routes/shoppingList.routes';
import schoolMenuRoutes from './routes/schoolMenu.routes';
import { errorHandler } from './middleware/errorHandler';
import {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsOptions,
  sanitizeRequest,
} from './middleware/security';
import { getEnvironmentLimiter } from './middleware/rateLimiter';

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
  console.log(`\n🚀 ${env.APP_NAME} Server Started Successfully!`);
  console.log(`   📍 Port: ${PORT}`);
  console.log(`   📝 Environment: ${env.NODE_ENV}`);
  console.log(`   📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`   🔍 Swagger JSON: http://localhost:${PORT}/api-docs.json`);
  console.log(`   ✅ Health Check: http://localhost:${PORT}/health`);
  console.log('\n📊 Ready to accept connections!\n');
});
