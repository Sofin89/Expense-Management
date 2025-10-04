import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      company: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Actions
      login: (userData, token) => {
        set({ 
          user: userData,
          token,
          isAuthenticated: true,
          error: null,
          loading: false
        });
      },

      logout: () => {
        set({ 
          user: null,
          token: null,
          company: null,
          isAuthenticated: false,
          error: null,
          loading: false
        });
      },

      setCompany: (company) => set({ company }),

      updateUser: (userData) => {
        set(state => ({ 
          user: { ...state.user, ...userData } 
        }));
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Selectors (computed values)
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      isManager: () => {
        const { user } = get();
        return user?.role === 'manager' || user?.role === 'admin';
      },

      isEmployee: () => {
        const { user } = get();
        return user?.role === 'employee';
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;

        const permissions = {
          admin: ['read', 'write', 'delete', 'approve', 'manage_users', 'view_analytics'],
          manager: ['read', 'write', 'approve', 'view_analytics'],
          employee: ['read', 'write']
        };

        return permissions[user.role]?.includes(permission) || false;
      },

      // Utility functions
      getUserId: () => get().user?._id,
      getUserName: () => get().user?.name,
      getUserEmail: () => get().user?.email,
      getUserRole: () => get().user?.role,
      getCompanyId: () => get().company?._id,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        company: state.company,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        // Called after rehydration from storage
        if (state) {
          console.log('🔄 Auth store rehydrated');
        }
      }
    }
  )
);