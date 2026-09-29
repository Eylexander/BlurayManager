export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user' | 'guest';
  settings: UserSettings;
  created_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en-US' | 'fr-FR';
  /** Base URL of the user's Jellyfin server, if linked */
  jellyfin_url?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
