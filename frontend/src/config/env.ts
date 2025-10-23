/**
 * Environment Configuration and Validation
 *
 * Validates required environment variables on app startup
 * to fail fast with clear error messages.
 */

interface Env {
  VITE_API_URL: string;
}

function validateEnv(): Env {
  const apiUrl = import.meta.env.VITE_API_URL;

  // Validate required variables
  if (!apiUrl) {
    throw new Error(
      'Missing required environment variable: VITE_API_URL\n' +
      'Please create a .env file in the frontend directory with:\n' +
      'VITE_API_URL=http://localhost:3001/api'
    );
  }

  // Validate format
  try {
    new URL(apiUrl);
  } catch (error) {
    throw new Error(
      `Invalid VITE_API_URL format: "${apiUrl}"\n` +
      'Must be a valid URL (e.g., http://localhost:3001/api)'
    );
  }

  return {
    VITE_API_URL: apiUrl,
  };
}

// Validate on module load (app startup)
export const env = validateEnv();

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('✅ Environment configuration loaded:', {
    API_URL: env.VITE_API_URL,
    MODE: import.meta.env.MODE,
  });
}
