import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types/auth';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  viewMode: 'grid' | 'list';
  login: (identifier: string, password: string) => Promise<{ languageChanged: boolean }>;
  register: (username: string, email: string, password: string) => Promise<{ languageChanged: boolean }>;
  logout: () => void;
  updateUser: (user: User) => void;
  checkAuth: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setLanguage: (language: 'en-US' | 'fr-FR') => Promise<void>;
  setViewMode: (viewMode: 'grid' | 'list') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      viewMode: 'grid',

      login: async (identifier: string, password: string) => {
        const response = await apiClient.login(identifier, password);
        
        Cookies.set('auth_token', response.token, { 
          expires: 7,
          sameSite: 'lax',
          secure: false
        });
        
        let languageChanged = false;
        const currentLanguage = get().user?.settings?.language;
        
        if (response.user.settings?.language && response.user.settings.language !== currentLanguage) {
          languageChanged = true;
          Cookies.set('locale', response.user.settings.language, { expires: 365 });
        }
        
        if (response.user.settings?.theme) {
          Cookies.set('theme', response.user.settings.theme, { expires: 365 });
        }
        
        set({ user: response.user, token: response.token, isAuthenticated: true });
        return { languageChanged };
      },

      register: async (username: string, email: string, password: string) => {
        const response = await apiClient.register(username, email, password);
        
        Cookies.set('auth_token', response.token, { 
          expires: 7,
          sameSite: 'lax',
          secure: false
        });
        
        let languageChanged = false;
        const currentLanguage = get().user?.settings?.language;
        
        if (response.user.settings?.language && response.user.settings.language !== currentLanguage) {
          languageChanged = true;
          Cookies.set('locale', response.user.settings.language, { expires: 365 });
        }
        
        if (response.user.settings?.theme) {
          Cookies.set('theme', response.user.settings.theme, { expires: 365 });
        }
        
        set({ user: response.user, token: response.token, isAuthenticated: true });
        return { languageChanged };
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
            
            if (user.settings?.theme) {
              Cookies.set('theme', user.settings.theme, { expires: 365 });
            }
            
            if (user.settings?.language) {
              Cookies.set('locale', user.settings.language, { expires: 365 });
            }
            
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

      setTheme: async (theme: 'light' | 'dark' | 'system') => {
        const user = get().user;
        if (!user) return;
        
        try {
          await apiClient.updateUserSettings({
            theme,
            language: user.settings.language,
          });
          
          const updatedUser = {
            ...user,
            settings: {
              ...user.settings,
              theme,
            },
          };
          
          set({ user: updatedUser });
          Cookies.set('theme', theme, { expires: 365 });
        } catch (error) {
          console.error('[AuthStore] Failed to update theme:', error);
          throw error;
        }
      },

      setLanguage: async (language: 'en-US' | 'fr-FR') => {
        const user = get().user;
        if (!user) return;
        
        try {
          await apiClient.updateUserSettings({
            theme: user.settings.theme,
            language,
          });
          
          const updatedUser = {
            ...user,
            settings: {
              ...user.settings,
              language,
            },
          };
          
          set({ user: updatedUser });
          Cookies.set('locale', language, { expires: 365 });
        } catch (error) {
          console.error('[AuthStore] Failed to update language:', error);
          throw error;
        }
      },

      setViewMode: (viewMode: 'grid' | 'list') => {
        set({ viewMode });
        Cookies.set('viewMode', viewMode, { expires: 365 });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        viewMode: state.viewMode,
      }),
      skipHydration: false,
    }
  )
);
