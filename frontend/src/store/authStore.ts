import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User, UserSettings } from '@/types/auth';
import { apiClient } from '@/lib/api-client';

// Migrate legacy short locale codes (e.g. "en", "fr") to full BCP-47 tags
const LOCALE_MAP: Record<string, string> = {
  'en': 'en-US',
  'fr': 'fr-FR',
};
const normalizeLocale = (lang: string): string => LOCALE_MAP[lang] ?? lang;

/**
 * Normalizes the user's language in place and mirrors it to the `locale`
 * cookie, which is what the server reads to pick the messages.
 */
const syncLocale = (user: User) => {
  if (!user.settings?.language) return;
  user.settings.language = normalizeLocale(user.settings.language) as UserSettings['language'];
  Cookies.set('locale', user.settings.language, { expires: 365 });
};

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
  /** Saves the given settings; the ones left out keep their value. */
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setViewMode: (viewMode: 'grid' | 'list') => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      /** Stores the session returned by login and sign-up. */
      const startSession = (response: { user: User; token: string }) => {
        Cookies.set('auth_token', response.token, {
          // Matches the token's own lifetime; see GenerateToken in the backend
          expires: 1,
          sameSite: 'lax',
          secure: window.location.protocol === 'https:',
        });

        const previousLanguage = Cookies.get('locale');
        syncLocale(response.user);
        const language = response.user.settings?.language;

        set({ user: response.user, token: response.token, isAuthenticated: true });
        // The page was rendered in the previous language and needs a reload
        return { languageChanged: !!language && language !== (previousLanguage ?? 'en-US') };
      };

      return {
        user: null,
        token: null,
        isAuthenticated: false,
        viewMode: 'grid',

        login: async (identifier, password) => startSession(await apiClient.login(identifier, password)),

        register: async (username, email, password) =>
          startSession(await apiClient.register(username, email, password)),

        logout: () => {
          Cookies.remove('auth_token');
          set({ user: null, token: null, isAuthenticated: false });
        },

        updateUser: (user) => set({ user }),

        checkAuth: async () => {
          const token = Cookies.get('auth_token');
          if (!token) {
            get().logout();
            return;
          }
          try {
            const user = await apiClient.getCurrentUser();
            syncLocale(user);
            set({ user, token, isAuthenticated: true });
          } catch (error) {
            console.error('[AuthStore] CheckAuth failed:', error);
            get().logout();
          }
        },

        updateSettings: async (settings) => {
          const { settings: saved } = await apiClient.updateUserSettings(settings);
          const user = get().user;
          if (!user) return;
          const updated = { ...user, settings: { ...user.settings, ...saved } };
          syncLocale(updated);
          set({ user: updated });
        },

        setViewMode: (viewMode) => set({ viewMode }),
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        viewMode: state.viewMode,
      }),
    }
  )
);
