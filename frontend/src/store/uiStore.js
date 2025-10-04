import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      // Theme State
      theme: 'light',
      sidebarOpen: true,
      mobileMenuOpen: false,

      // Modal State
      modals: {
        expenseForm: false,
        receiptPreview: false,
        userSettings: false,
        exportData: false
      },

      // Loading States
      loading: {
        page: false,
        form: false,
        table: false
      },

      // Toast/Alert State
      toasts: [],

      // Actions - Theme
      setTheme: (theme) => set({ theme }),

      toggleTheme: () => {
        set(state => ({
          theme: state.theme === 'light' ? 'dark' : 'light'
        }));
      },

      // Actions - Layout
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      toggleMobileMenu: () => {
        set(state => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      // Actions - Modals
      openModal: (modalName) => {
        set(state => ({
          modals: { ...state.modals, [modalName]: true }
        }));
      },

      closeModal: (modalName) => {
        set(state => ({
          modals: { ...state.modals, [modalName]: false }
        }));
      },

      closeAllModals: () => {
        set({
          modals: {
            expenseForm: false,
            receiptPreview: false,
            userSettings: false,
            exportData: false
          }
        });
      },

      // Actions - Loading
      setLoading: (key, isLoading) => {
        set(state => ({
          loading: { ...state.loading, [key]: isLoading }
        }));
      },

      startLoading: (key) => {
        set(state => ({
          loading: { ...state.loading, [key]: true }
        }));
      },

      stopLoading: (key) => {
        set(state => ({
          loading: { ...state.loading, [key]: false }
        }));
      },

      // Actions - Toasts
      addToast: (toast) => {
        const id = Date.now().toString();
        const newToast = { id, ...toast, visible: true };
        
        set(state => ({
          toasts: [...state.toasts, newToast]
        }));

        // Auto remove after delay
        setTimeout(() => {
          get().removeToast(id);
        }, toast.duration || 5000);
      },

      removeToast: (toastId) => {
        set(state => ({
          toasts: state.toasts.filter(toast => toast.id !== toastId)
        }));
      },

      clearToasts: () => set({ toasts: [] }),

      // Toast helpers
      showSuccess: (message, title = 'Success') => {
        get().addToast({
          type: 'success',
          title,
          message,
          duration: 3000
        });
      },

      showError: (message, title = 'Error') => {
        get().addToast({
          type: 'error',
          title,
          message,
          duration: 5000
        });
      },

      showWarning: (message, title = 'Warning') => {
        get().addToast({
          type: 'warning',
          title,
          message,
          duration: 4000
        });
      },

      showInfo: (message, title = 'Info') => {
        get().addToast({
          type: 'info',
          title,
          message,
          duration: 3000
        });
      },

      // Selectors (computed values)
      isModalOpen: (modalName) => {
        const { modals } = get();
        return modals[modalName] || false;
      },

      isLoading: (key) => {
        const { loading } = get();
        return loading[key] || false;
      },

      getActiveToasts: () => {
        const { toasts } = get();
        return toasts.filter(toast => toast.visible);
      },

      // Utility functions
      getCurrentTheme: () => get().theme,

      isSidebarOpen: () => get().sidebarOpen,

      isMobileMenuOpen: () => get().mobileMenuOpen,

      // Reset UI state
      resetUI: () => set({
        modals: {
          expenseForm: false,
          receiptPreview: false,
          userSettings: false,
          exportData: false
        },
        loading: {
          page: false,
          form: false,
          table: false
        },
        toasts: []
      })
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
);