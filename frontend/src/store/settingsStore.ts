// import { create } from 'zustand';
// import Cookies from 'js-cookie';

// interface SettingsState {
//   theme: 'light' | 'dark';
//   language: 'en' | 'fr';
//   viewMode: 'grid' | 'list';
//   setTheme: (theme: 'light' | 'dark') => void;
//   setLanguage: (language: 'en' | 'fr') => void;
//   setViewMode: (viewMode: 'grid' | 'list') => void;
//   loadSettings: () => void;
// }

// export const useSettingsStore = create<SettingsState>((set) => ({
//   theme: 'dark',
//   language: 'en',
//   viewMode: 'grid',

//   setTheme: (theme) => {
//     Cookies.set('theme', theme, { expires: 365 });
//     set({ theme });
//   },

//   setLanguage: (language) => {
//     Cookies.set('locale', language, { expires: 365 });
//     set({ language });
//   },

//   setViewMode: (viewMode) => {
//     Cookies.set('viewMode', viewMode, { expires: 365 });
//     set({ viewMode });
//   },

//   loadSettings: () => {
//     const theme = Cookies.get('theme') as 'light' | 'dark' | undefined;
//     const language = Cookies.get('locale') as 'en' | 'fr' | undefined;
//     const viewMode = Cookies.get('viewMode') as 'grid' | 'list' | undefined;
    
//     set({
//       theme: theme || 'dark',
//       language: language || 'en',
//       viewMode: viewMode || 'grid',
//     });
//   },
// }));


import { create } from 'zustand';
import Cookies from 'js-cookie';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  language: 'en' | 'fr';
  viewMode: 'grid' | 'list';
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'fr') => void;
  setViewMode: (viewMode: 'grid' | 'list') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
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
