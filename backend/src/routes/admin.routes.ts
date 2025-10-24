import { createAdminConfig } from '../config/admin.js';
import AdminJSExpress from '@adminjs/express';

/**
 * Create and configure the AdminJS router
 */
export const createAdminRouter = () => {
  const admin = createAdminConfig();

  // Build the router without authentication (we handle it in the main app with authenticateAdmin middleware)
  const router = AdminJSExpress.buildRouter(admin);

  return router;
};
