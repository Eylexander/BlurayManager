import { create } from 'zustand';
import Cookies from 'js-cookie';

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'fr') => void;
  loadSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  language: 'en',

  setTheme: (theme) => {
    Cookies.set('theme', theme, { expires: 365 });
    set({ theme });
  },

  setLanguage: (language) => {
    Cookies.set('locale', language, { expires: 365 });
    set({ language });
  },

  loadSettings: () => {
    const theme = Cookies.get('theme') as 'light' | 'dark' | undefined;
    const language = Cookies.get('locale') as 'en' | 'fr' | undefined;
    
    set({
      theme: theme || 'dark',
      language: language || 'en',
    });
  },
}));
