import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useNotificationStore } from '@/store/notificationStore';

export interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  bluray_id?: string;
}

export function useNotifications() {
  const t = useTranslations();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { shouldRefresh, resetRefresh } = useNotificationStore();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success(t('notifications.markedAsReadSuccess'));
    } catch (error) {
      toast.error(t('notifications.markedAsReadError'));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return t('notifications.justNow');
    const minutes = Math.floor(diff / 60);
    if (diff < 3600) return `${minutes} ${t('notifications.minutesAgo')}`;
    const hours = Math.floor(diff / 3600);
    if (diff < 86400) return `${hours} ${t('notifications.hoursAgo')}`;
    const days = Math.floor(diff / 86400);
    return `${days} ${t('notifications.daysAgo')}`;
  };

  // Initial fetch and Polling
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for refresh triggers from store (e.g., after bluray add/remove)
  useEffect(() => {
    if (shouldRefresh) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications();
      resetRefresh();
    }
  }, [shouldRefresh, fetchNotifications, resetRefresh]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    formatTime,
  };
}