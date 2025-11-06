import { createAdminConfig } from '../config/admin';
import AdminJSExpress from '@adminjs/express';
import { adminAuthProvider } from '../middleware/adminAuth';
import session from 'express-session';

/**
 * Create and configure the AdminJS router with authentication
 */
export const createAdminRouter = () => {
  const admin = createAdminConfig();

  // Session configuration
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  // Build authenticated router with session-based authentication
  const router = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: adminAuthProvider.authenticate,
      cookiePassword: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret'
    },
    null,
    sessionOptions
  );

  return router;
};
