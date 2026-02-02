export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user' | 'guest';
  settings: UserSettings;
  created_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'en-US' | 'fr-FR';
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
