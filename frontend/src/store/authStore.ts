import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types/auth';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (identifier: string, password: string) => {
        const response = await apiClient.login(identifier, password);
        
        Cookies.set('auth_token', response.token, { 
          expires: 7,
          sameSite: 'lax',
          secure: false // Set to true in production with HTTPS
        });
        
        set({ user: response.user, token: response.token, isAuthenticated: true });
      },

      register: async (username: string, email: string, password: string) => {
        const response = await apiClient.register(username, email, password);
        
        Cookies.set('auth_token', response.token, { 
          expires: 7,
          sameSite: 'lax',
          secure: false // Set to true in production with HTTPS
        });
        
        set({ user: response.user, token: response.token, isAuthenticated: true });
      },

      logout: () => {
        Cookies.remove('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      checkAuth: async () => {
        const token = Cookies.get('auth_token');
        
        if (token) {
          try {
            const user = await apiClient.getCurrentUser();
            set({ user, token, isAuthenticated: true });
          } catch (error) {
            console.error('[AuthStore] CheckAuth failed:', error);
            Cookies.remove('auth_token');
            set({ user: null, token: null, isAuthenticated: false });
          }
        } else {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
      skipHydration: false,
    }
  )
);
