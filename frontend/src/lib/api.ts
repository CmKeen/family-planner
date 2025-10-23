import axios from 'axios';
import { env } from '@/config/env';

const API_URL = env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
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
  validate: (planId: string) => api.post(`/weekly-plans/${planId}/validate`)
};

// Shopping List API
export const shoppingListAPI = {
  generate: (weeklyPlanId: string) =>
    api.post(`/shopping-lists/generate/${weeklyPlanId}`),
  get: (weeklyPlanId: string) =>
    api.get(`/shopping-lists/${weeklyPlanId}`),
  toggleItem: (itemId: string) =>
    api.post(`/shopping-lists/items/${itemId}/toggle`)
};

// School Menu API
export const schoolMenuAPI = {
  create: (data: any) => api.post('/school-menus', data),
  getByFamily: (familyId: string, params?: any) =>
    api.get(`/school-menus/family/${familyId}`, { params }),
  update: (id: string, data: any) => api.put(`/school-menus/${id}`, data),
  delete: (id: string) => api.delete(`/school-menus/${id}`)
};
