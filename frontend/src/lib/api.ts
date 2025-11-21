import axios from 'axios';
import { env } from '@/config/env';
import { getErrorMessage, getErrorDetails } from './toast';
import { toast } from 'sonner';
import i18n from './i18n';

const API_URL = env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get CSRF token from cookie (set by backend on login/register)
 * Cookie name: XSRF-TOKEN (readable by JS, not httpOnly)
 */
const getCsrfTokenFromCookie = (): string | null => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='));
  return cookie ? cookie.split('=')[1] : null;
};

// Add CSRF token to state-changing requests (OBU-80)
api.interceptors.request.use((config) => {
  // Only add CSRF token for non-safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (config.method && !safeMethods.includes(config.method.toUpperCase())) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  // Note: JWT token is now sent automatically via HTTP-only cookie (OBU-79)
  // No need to manually add Authorization header
  return config;
});

// Handle errors and show toast notifications
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for /auth/me - let the checkAuth() handle it gracefully
    const isAuthCheck = error.config?.url?.includes('/auth/me');

    // Don't show toasts for auth check failures (silent background checks)
    const shouldShowToast = !isAuthCheck;

    if (shouldShowToast) {
      // Get translated error message
      const message = getErrorMessage(error, i18n.t.bind(i18n));
      const details = getErrorDetails(error);

      // Show error toast
      toast.error(message, {
        description: details,
        duration: 5000,
        closeButton: true,
      });
    }

    // Handle 401 unauthorized - redirect to login
    if (error.response?.status === 401 && !isAuthCheck) {
      // Clear any stale state and redirect to login
      window.location.href = '/login';
    }

    // Handle CSRF token mismatch - refresh token and retry
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      // CSRF token expired or invalid - user should re-login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me')
};

// Family API
export const familyAPI = {
  create: (data: any) => api.post('/families', data),
  getAll: () => api.get('/families'),
  getById: (id: string) => api.get(`/families/${id}`),
  update: (id: string, data: any) => api.put(`/families/${id}`, data),
  delete: (id: string) => api.delete(`/families/${id}`),
  addMember: (id: string, data: any) => api.post(`/families/${id}/members`, data),
  updateDietProfile: (id: string, data: any) => api.put(`/families/${id}/diet-profile`, data)
};

// Recipe API
export const recipeAPI = {
  getAll: (params?: any) => api.get('/recipes', { params }),
  getById: (id: string) => api.get(`/recipes/${id}`),
  getCatalog: (familyId: string) => api.get(`/recipes/catalog/${familyId}`),
  create: (data: any) => api.post('/recipes', data),
  createComponentBased: (data: any) => api.post('/recipes/component-based', data),
  updateComponentBased: (id: string, data: any) => api.put(`/recipes/${id}/component-based`, data),
  update: (id: string, data: any) => api.put(`/recipes/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  toggleFavorite: (id: string) => api.post(`/recipes/${id}/favorite`),
  submitFeedback: (id: string, data: any) => api.post(`/recipes/${id}/feedback`, data)
};

// Weekly Plan API
export const weeklyPlanAPI = {
  create: (data: any) => api.post('/weekly-plans', data),
  getByFamily: (familyId: string) => api.get(`/weekly-plans/family/${familyId}`),
  getById: (id: string) => api.get(`/weekly-plans/${id}`),
  generateAuto: (familyId: string, data: any) =>
    api.post(`/weekly-plans/${familyId}/generate`, data),
  generateExpress: (familyId: string, data: any) =>
    api.post(`/weekly-plans/${familyId}/generate-express`, data),
  updateMeal: (planId: string, mealId: string, data: any) =>
    api.put(`/weekly-plans/${planId}/meals/${mealId}`, data),
  swapMeal: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/swap`, data),
  lockMeal: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/lock`, data),
  addVote: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/vote`, data),
  addWish: (planId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/wishes`, data),
  validate: (planId: string) => api.post(`/weekly-plans/${planId}/validate`),
  adjustPortions: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/adjust-portions`, data),
  // Meal schedule template operations
  addMeal: (planId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals`, data),
  removeMeal: (planId: string, mealId: string, skipReason?: string) =>
    api.delete(`/weekly-plans/${planId}/meals/${mealId}`, {
      data: skipReason ? { skipReason } : undefined
    }),
  restoreMeal: (planId: string, mealId: string) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/restore`),
  switchTemplate: (planId: string, data: any) =>
    api.put(`/weekly-plans/${planId}/template`, data),
  // Component-based meal operations
  saveAsRecipe: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/save-as-recipe`, data)
};

// Meal Schedule Template API
export const mealTemplateAPI = {
  getAll: (familyId: string) => api.get(`/families/${familyId}/meal-templates`),
  getById: (familyId: string, templateId: string) =>
    api.get(`/families/${familyId}/meal-templates/${templateId}`),
  create: (familyId: string, data: any) =>
    api.post(`/families/${familyId}/meal-templates`, data),
  update: (familyId: string, templateId: string, data: any) =>
    api.put(`/families/${familyId}/meal-templates/${templateId}`, data),
  delete: (familyId: string, templateId: string) =>
    api.delete(`/families/${familyId}/meal-templates/${templateId}`),
  setDefault: (familyId: string, data: any) =>
    api.put(`/families/${familyId}/default-template`, data)
};

// Shopping List API
export const shoppingListAPI = {
  generate: (weeklyPlanId: string) =>
    api.post(`/shopping-lists/generate/${weeklyPlanId}`),
  get: (weeklyPlanId: string) =>
    api.get(`/shopping-lists/${weeklyPlanId}`),
  getByPlanId: (weeklyPlanId: string) =>
    api.get(`/shopping-lists/${weeklyPlanId}`),
  toggleItem: (shoppingListId: string, itemId: string, data: any) =>
    api.post(`/shopping-lists/${shoppingListId}/items/${itemId}/toggle`, data)
};

// School Menu API
export const schoolMenuAPI = {
  create: (data: any) => api.post('/school-menus', data),
  getByFamily: (familyId: string, params?: any) =>
    api.get(`/school-menus/family/${familyId}`, { params }),
  update: (id: string, data: any) => api.put(`/school-menus/${id}`, data),
  delete: (id: string) => api.delete(`/school-menus/${id}`)
};

// Invitation API
export const invitationAPI = {
  send: (familyId: string, data: { inviteeEmail: string; role?: string }) =>
    api.post(`/families/${familyId}/invitations`, data),
  getReceived: () => api.get('/families/invitations/received'),
  getSent: (familyId: string) => api.get(`/families/${familyId}/invitations/sent`),
  accept: (invitationId: string) =>
    api.post(`/families/invitations/${invitationId}/accept`),
  decline: (invitationId: string) =>
    api.post(`/families/invitations/${invitationId}/decline`),
  cancel: (familyId: string, invitationId: string) =>
    api.delete(`/families/${familyId}/invitations/${invitationId}`)
};

// Food Component API
export const foodComponentAPI = {
  getAll: (params?: { familyId?: string; category?: string }) =>
    api.get('/components', { params }),
  create: (familyId: string, data: any) =>
    api.post(`/families/${familyId}/components`, data),
  update: (id: string, data: any) =>
    api.put(`/components/${id}`, data),
  delete: (id: string) =>
    api.delete(`/components/${id}`)
};

// Meal Component API
export const mealComponentAPI = {
  add: (planId: string, mealId: string, data: any) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/components`, data),
  swap: (planId: string, mealId: string, componentId: string, data: any) =>
    api.put(`/weekly-plans/${planId}/meals/${mealId}/components/${componentId}/swap`, data),
  update: (planId: string, mealId: string, componentId: string, data: any) =>
    api.patch(`/weekly-plans/${planId}/meals/${mealId}/components/${componentId}`, data),
  remove: (planId: string, mealId: string, componentId: string) =>
    api.delete(`/weekly-plans/${planId}/meals/${mealId}/components/${componentId}`)
};

// Comment API
export const commentAPI = {
  getComments: (planId: string, mealId: string) =>
    api.get(`/weekly-plans/${planId}/meals/${mealId}/comments`),
  addComment: (planId: string, mealId: string, data: { content: string }) =>
    api.post(`/weekly-plans/${planId}/meals/${mealId}/comments`, data),
  updateComment: (planId: string, mealId: string, commentId: string, data: { content: string }) =>
    api.put(`/weekly-plans/${planId}/meals/${mealId}/comments/${commentId}`, data),
  deleteComment: (planId: string, mealId: string, commentId: string) =>
    api.delete(`/weekly-plans/${planId}/meals/${mealId}/comments/${commentId}`)
};

// Audit Log API
export const auditLogAPI = {
  getPlanAuditLog: (planId: string, params?: {
    mealId?: string;
    memberId?: string;
    changeType?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get(`/weekly-plans/${planId}/audit-log`, { params }),
  getMealAuditLog: (planId: string, mealId: string, params?: {
    limit?: number;
    offset?: number;
  }) =>
    api.get(`/weekly-plans/${planId}/meals/${mealId}/audit-log`, { params })
};
