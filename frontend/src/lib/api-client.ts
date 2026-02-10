import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import { useNotificationStore } from '@/store/notificationStore';
import { useSettingsStore } from '@/store/settingsStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = Cookies.get('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const settings = useSettingsStore.getState();
      if (settings.language) {
        config.headers['Accept-Language'] = settings.language;
      }

      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token but don't redirect - let components handle it
          Cookies.remove('auth_token');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(identifier: string, password: string) {
    const response = await this.client.post('/auth/login', { identifier, password });
    return response.data;
  }

  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', { username, email, password });
    return response.data;
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.client.post('/auth/reset-password', { 
      token, 
      new_password: newPassword 
    });
    return response.data;
  }

  async checkAdminExists() {
    const response = await this.client.get('/setup/check');
    return response.data;
  }

  async completeSetup(username: string, email: string, password: string) {
    const response = await this.client.post('/setup/install', { username, email, password });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/user/me');
    return response.data.user || response.data;
  }

  async updateUserSettings(settings: { theme: string; language: string }) {
    const response = await this.client.put('/user/settings', settings);
    return response.data;
  }

  async updateUsername(username: string) {
    const response = await this.client.put('/user/username', { username });
    return response.data;
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.put('/user/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  // Notification endpoints
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data.notifications || [];
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.put(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.put('/notifications/read-all');
    return response.data;
  }

  // Bluray endpoints
  async getBlurays(params?: { type?: string; tags?: string[]; skip?: number; limit?: number }) {
    const response = await this.client.get('/blurays', { params });
    return response.data.blurays || [];
  }

  async getSimplifiedBlurays(params?: { type?: string; tags?: string[]; skip?: number; limit?: number }) {
    const response = await this.client.get('/blurays/simplified', { params });
    return response.data.blurays || [];
  }

  async getBluray(id: string) {
    const response = await this.client.get(`/blurays/${id}`);
    return response.data.bluray || response.data;
  }

  async createBluray(data: any) {
    const response = await this.client.post('/blurays', data);
    
    // Trigger notification refresh
    useNotificationStore.getState().triggerRefresh();
    
    return response.data;
  }

  async updateBluray(id: string, data: any) {
    const response = await this.client.put(`/blurays/${id}`, data);
    return response.data;
  }

  async updateBlurayTags(id: string, data: { title: string; tags: string[] }) {
    const response = await this.client.put(`/blurays/${id}/tags`, data);
    return response.data;
  }

  async deleteBluray(id: string) {
    const response = await this.client.delete(`/blurays/${id}`);
    
    // Trigger notification refresh
    useNotificationStore.getState().triggerRefresh();
    
    return response.data;
  }

  async searchBlurays(query: string, skip = 0, limit = 50) {
    const response = await this.client.get('/blurays/search', {
      params: { q: query, skip, limit },
    });
    return response.data.blurays || [];
  }

  /**
   * Find a series by TMDB ID (Option C: Check if series exists)
   */
  async findSeriesByTmdbId(tmdbId: string) {
    try {
      const response = await this.client.get('/blurays', {
        params: { type: 'series', skip: 0, limit: 100 },
      });
      const blurays = response.data.blurays || [];
      
      // Find series with matching TMDB ID
      return blurays.find((b: any) => b.tmdb_id === tmdbId) || null;
    } catch (error) {
      console.error('Failed to search for series:', error);
      return null;
    }
  }

  /**
   * Update series with new seasons (Option C: Incremental season management)
   * Merges new seasons with existing ones, avoiding duplicates
   */
  async addSeasonsToSeries(id: string, newSeasons: any[], title: string) {
    try {
      // Get current bluray data
      const current = await this.getBluray(id);
      
      // Merge seasons, avoiding duplicates
      const existingSeasonNumbers = new Set(
        (current.seasons || []).map((s: any) => s.number)
      );
      
      const seasonsToAdd = newSeasons.filter(
        (s) => !existingSeasonNumbers.has(s.number)
      );
      
      const mergedSeasons = [...(current.seasons || []), ...seasonsToAdd].sort(
        (a, b) => a.number - b.number
      );
      
      // Update the bluray - preserve all existing data, only update seasons
      const response = await this.updateBluray(id, {
        title: current.title,
        type: current.type,
        description: current.description,
        director: current.director,
        genre: current.genre,
        cover_image_url: current.cover_image_url,
        backdrop_url: current.backdrop_url,
        purchase_price: current.purchase_price,
        purchase_date: current.purchase_date,
        tags: current.tags,
        rating: current.rating,
        tmdb_id: current.tmdb_id,
        release_year: current.release_year,
        seasons: mergedSeasons,
      });
      
      return {
        success: true,
        bluray: response.bluray || response,
        addedSeasons: seasonsToAdd.map((s) => s.number),
      };
    } catch (error) {
      console.error('Failed to add seasons:', error);
      throw error;
    }
  }

  // Tag endpoints
  async getTags() {
    const response = await this.client.get('/tags');
    return response.data.tags || [];
  }

  async getTag(id: string) {
    const response = await this.client.get(`/tags/${id}`);
    return response.data;
  }

  async createTag(data: any) {
    const response = await this.client.post('/tags', data);
    return response.data.tag;
  }

  async updateTag(id: string, data: any) {
    const response = await this.client.put(`/tags/${id}`, data);
    return response.data.tag;
  }

  async deleteTag(id: string) {
    const response = await this.client.delete(`/tags/${id}`);
    return response.data;
  }

  // Statistics endpoint
  async getStatistics() {
    const response = await this.client.get('/statistics');
    return response.data.statistics || response.data;
  }

  async getSimplifiedStatistics() {
    const response = await this.client.get('/statistics/simplified');
    return response.data.statistics || response.data;
  }

  // TMDB endpoints
  async searchTMDB(type: string, query: string, year?: string) {
    const response = await this.client.get('/tmdb/search', {
      params: { type, query, ...(year && { year }) },
    });
    return response.data;
  }

  async getTMDBDetails(type: string, id: number) {
    const response = await this.client.get(`/tmdb/${type}/${id}`);
    return response.data;
  }

  async findByExternalID(externalId: string, source: 'imdb_id' | 'tmdb_id' = 'imdb_id', type?: string) {
    const response = await this.client.get(`/tmdb/find/${externalId}`, {
      params: { source, ...(type && { type }) },
    });
    return response.data;
  }

  // Barcode lookup endpoint
  async lookupBarcode(barcode: string) {
    const response = await this.client.get(`/barcode/${barcode}`);
    return response.data;
  }

  // Admin endpoints
  async getUsers() {
    const response = await this.client.get('/admin/users');
    return response.data.users || response.data;
  }

  async getUser(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data.user || response.data;
  }

  async createUser(data: { username: string; email: string; password: string; role?: string }) {
    const response = await this.client.post('/admin/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: { username?: string; email?: string; role?: string }) {
    const response = await this.client.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.client.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }

  // Import/Export endpoints
  async exportBlurays() {
    const response = await this.client.get('/blurays/export', {
      responseType: 'blob',
    });
    
    // Ensure we're treating it as UTF-8 text
    const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
    const text = await blob.text();
    return text;
  }

  async importBlurays(formData: FormData) {
    const response = await this.client.post('/blurays/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
