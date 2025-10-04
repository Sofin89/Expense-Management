import { useEffect, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { api } from '../utils/api';
import { useSocket } from './useSocket';

export const useNotifications = () => {
  const { 
    notifications, 
    unreadCount, 
    setNotifications, 
    addNotification, 
    markAsRead, 
    markAllAsRead 
  } = useNotificationStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket, isConnected } = useSocket();

  const fetchNotifications = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/notifications?${queryString}`);
      setNotifications(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      setError(null);
      
      // Optimistic update
      markAsRead(notificationId);
      
      // Sync with server
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Emit socket event for real-time sync
      if (socket && isConnected) {
        socket.emit('notification_read', notificationId);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to mark notification as read';
      setError(errorMessage);
      
      // Revert optimistic update on error
      // Note: You might want to implement a more sophisticated rollback
      console.error('Failed to sync read status:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      setError(null);
      
      // Optimistic update
      markAllAsRead();
      
      // Sync with server
      await api.put('/api/notifications/read-all');
      
      // Emit socket event for real-time sync
      if (socket && isConnected) {
        socket.emit('all_notifications_read');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to mark all notifications as read';
      setError(errorMessage);
      console.error('Failed to sync all read status:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setError(null);
      await api.delete(`/api/notifications/${notificationId}`);
      
      // Remove from local state
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete notification';
      setError(errorMessage);
    }
  };

  const clearAllNotifications = async () => {
    try {
      setError(null);
      await api.delete('/api/notifications');
      setNotifications([]);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to clear notifications';
      setError(errorMessage);
    }
  };

  // Request browser notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Send browser notification
  const sendBrowserNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  };

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
    
    // Request notification permission on first load
    if (notifications.length === 0) {
      requestNotificationPermission();
    }
  }, []);

  // Listen for new notifications via socket
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification) => {
        addNotification(notification);
        
        // Show browser notification if permitted and app is in background
        if (Notification.permission === 'granted' && document.hidden) {
          sendBrowserNotification(notification.title, {
            body: notification.body,
            tag: notification._id
          });
        }
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Actions
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    
    // Browser Notifications
    requestNotificationPermission,
    sendBrowserNotification,
    
    // Utilities
    refetch: fetchNotifications,
    clearError: () => setError(null)
  };
};