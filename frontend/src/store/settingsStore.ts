import { create } from 'zustand';
import Cookies from 'js-cookie';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: 'en-US' | 'fr-FR';
  viewMode: 'grid' | 'list';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en-US' | 'fr-FR') => void;
  setViewMode: (viewMode: 'grid' | 'list') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'en-US',
      viewMode: 'grid',

      setTheme: (theme) => {
        set({ theme });
        Cookies.set('theme', theme, { expires: 365 });
      },
      setLanguage: (language) => {
        set({ language });
        Cookies.set('locale', language, { expires: 365 });
      },
      setViewMode: (viewMode) => {
        set({ viewMode });
        Cookies.set('viewMode', viewMode, { expires: 365 });
      },
    }),
    {
      name: 'user-settings',
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
