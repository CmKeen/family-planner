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
  // Support both VITE_API_URL (full URL) and VITE_API_ORIGIN (base URL)
  const apiUrl = import.meta.env.VITE_API_URL;
  const apiOrigin = import.meta.env.VITE_API_ORIGIN;

  let finalApiUrl: string;

  if (apiUrl) {
    // Use VITE_API_URL directly (for local development)
    finalApiUrl = apiUrl;
  } else if (apiOrigin) {
    // Use VITE_API_ORIGIN and append /api (for Render deployment)
    finalApiUrl = `${apiOrigin.replace(/\/$/, '')}/api`;
  } else {
    throw new Error(
      'Missing required environment variable: VITE_API_URL or VITE_API_ORIGIN\n' +
      'Please create a .env file in the frontend directory with:\n' +
      'VITE_API_URL=http://localhost:3001/api\n' +
      'OR\n' +
      'VITE_API_ORIGIN=http://localhost:3001'
    );
  }

  // Validate format
  try {
    new URL(finalApiUrl);
  } catch {
    throw new Error(
      `Invalid API URL format: "${finalApiUrl}"\n` +
      'Must be a valid URL (e.g., http://localhost:3001/api)'
    );
  }

  return {
    VITE_API_URL: finalApiUrl,
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
