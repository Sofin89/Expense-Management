import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      // State
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      settings: {
        email: true,
        push: true,
        sound: true,
        desktop: false
      },

      // Actions
      setNotifications: (notifications) => set({ 
        notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Notification CRUD Operations
      addNotification: (notification) => {
        set(state => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));
      },

      addMultipleNotifications: (newNotifications) => {
        set(state => {
          const updatedNotifications = [...newNotifications, ...state.notifications];
          const newUnreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      markAsRead: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.map(n => 
            n._id === notificationId ? { ...n, read: true } : n
          );
          
          const newUnreadCount = Math.max(0, state.unreadCount - 1);
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        }));
      },

      removeNotification: (notificationId) => {
        set(state => {
          const notificationToRemove = state.notifications.find(n => n._id === notificationId);
          const wasUnread = notificationToRemove && !notificationToRemove.read;
          
          const updatedNotifications = state.notifications.filter(n => n._id !== notificationId);
          const newUnreadCount = wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;
          
          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
      },

      // Notification Settings
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      // Selectors (computed values)
      getUnreadNotifications: () => {
        const { notifications } = get();
        return notifications.filter(n => !n.read);
      },

      getReadNotifications: () => {
        const { notifications } = get();
        return notifications.filter(n => n.read);
      },

      getNotificationsByType: (type) => {
        const { notifications } = get();
        return notifications.filter(n => n.type === type);
      },

      getRecentNotifications: (limit = 10) => {
        const { notifications } = get();
        return notifications.slice(0, limit);
      },

      hasUnread: () => get().unreadCount > 0,

      getNotificationById: (notificationId) => {
        const { notifications } = get();
        return notifications.find(n => n._id === notificationId);
      },

      // Utility functions
      getNotificationStats: () => {
        const { notifications } = get();
        const stats = {
          total: notifications.length,
          unread: notifications.filter(n => !n.read).length,
          read: notifications.filter(n => n.read).length,
          byType: {}
        };

        notifications.forEach(notification => {
          if (!stats.byType[notification.type]) {
            stats.byType[notification.type] = 0;
          }
          stats.byType[notification.type]++;
        });

        return stats;
      },

      // Batch operations
      markMultipleAsRead: (notificationIds) => {
        set(state => {
          let unreadReduction = 0;
          const updatedNotifications = state.notifications.map(n => {
            if (notificationIds.includes(n._id) && !n.read) {
              unreadReduction++;
              return { ...n, read: true };
            }
            return n;
          });

          return {
            notifications: updatedNotifications,
            unreadCount: Math.max(0, state.unreadCount - unreadReduction)
          };
        });
      },

      removeMultipleNotifications: (notificationIds) => {
        set(state => {
          let unreadReduction = 0;
          const updatedNotifications = state.notifications.filter(n => {
            if (notificationIds.includes(n._id)) {
              if (!n.read) unreadReduction++;
              return false;
            }
            return true;
          });

          return {
            notifications: updatedNotifications,
            unreadCount: Math.max(0, state.unreadCount - unreadReduction)
          };
        });
      },

      // Reset store
      reset: () => set({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        settings: {
          email: true,
          push: true,
          sound: true,
          desktop: false
        }
      })
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Keep only recent 50
        settings: state.settings
      })
    }
  )
);