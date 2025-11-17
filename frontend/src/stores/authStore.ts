import { create } from 'zustand';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  language: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Whether initial auth check has completed
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // Auth state is now determined by cookie presence (checked via checkAuth)
  // Not by localStorage token (OBU-79: prevents XSS token theft)
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false, // Will be true after first checkAuth completes

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login({ email, password });
      // Token is now set in HTTP-only cookie by backend (OBU-79)
      // CSRF token is set in readable cookie by backend (OBU-80)
      const { user } = response.data.data;

      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.register(data);
      // Token is now set in HTTP-only cookie by backend (OBU-79)
      // CSRF token is set in readable cookie by backend (OBU-80)
      const { user } = response.data.data;

      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
      // Backend clears both auth cookie and CSRF cookie
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        isAuthenticated: false
      });
    }
  },

  checkAuth: async () => {
    // Check auth by attempting to fetch user profile
    // Cookie is sent automatically with request
    try {
      const response = await authAPI.getMe();
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        isInitialized: true
      });
    } catch (error) {
      // Auth cookie is invalid or expired
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true
      });
    }
  }
}));
