import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAdminStore = create(
  devtools(
    (set, get) => ({
      // State
      users: [],
      companies: [],
      systemSettings: {},
      auditLogs: [],
      reports: {},
      
      // Loading states
      loading: {
        users: false,
        companies: false,
        settings: false,
        reports: false
      },

      errors: {
        users: null,
        companies: null,
        settings: null,
        reports: null
      },

      // Filters and pagination
      filters: {
        users: {
          role: 'all',
          status: 'active',
          search: ''
        },
        audit: {
          action: 'all',
          dateRange: null,
          user: 'all'
        }
      },

      pagination: {
        users: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0
        },
        audit: {
          currentPage: 1,
          itemsPerPage: 20,
          totalItems: 0
        }
      },

      // Actions - Users
      setUsers: (users) => set({ 
        users,
        pagination: {
          ...get().pagination,
          users: {
            ...get().pagination.users,
            totalItems: users.length
          }
        }
      }),

      setCompanies: (companies) => set({ companies }),

      setSystemSettings: (settings) => set({ systemSettings: settings }),

      setAuditLogs: (logs) => set({ 
        auditLogs: logs,
        pagination: {
          ...get().pagination,
          audit: {
            ...get().pagination.audit,
            totalItems: logs.length
          }
        }
      }),

      setReports: (reports) => set({ reports }),

      // Loading and Error handling
      setLoading: (key, isLoading) => {
        set(state => ({
          loading: { ...state.loading, [key]: isLoading }
        }));
      },

      setError: (key, error) => {
        set(state => ({
          errors: { ...state.errors, [key]: error }
        }));
      },

      clearError: (key) => {
        set(state => ({
          errors: { ...state.errors, [key]: null }
        }));
      },

      // User Management
      addUser: (user) => {
        set(state => ({ 
          users: [user, ...state.users],
          pagination: {
            ...state.pagination,
            users: {
              ...state.pagination.users,
              totalItems: state.users.length + 1
            }
          }
        }));
      },

      updateUser: (userId, updates) => {
        set(state => ({
          users: state.users.map(user => 
            user._id === userId ? { ...user, ...updates } : user
          )
        }));
      },

      deleteUser: (userId) => {
        set(state => ({
          users: state.users.filter(user => user._id !== userId),
          pagination: {
            ...state.pagination,
            users: {
              ...state.pagination.users,
              totalItems: Math.max(0, state.users.length - 1)
            }
          }
        }));
      },

      // Company Management
      addCompany: (company) => {
        set(state => ({ companies: [company, ...state.companies] }));
      },

      updateCompany: (companyId, updates) => {
        set(state => ({
          companies: state.companies.map(company => 
            company._id === companyId ? { ...company, ...updates } : company
          )
        }));
      },

      // Settings Management
      updateSystemSetting: (key, value) => {
        set(state => ({
          systemSettings: { ...state.systemSettings, [key]: value }
        }));
      },

      // Filtering
      setUserFilters: (filters) => {
        set(state => ({ 
          filters: { 
            ...state.filters, 
            users: { ...state.filters.users, ...filters } 
          },
          pagination: {
            ...state.pagination,
            users: { ...state.pagination.users, currentPage: 1 }
          }
        }));
      },

      setAuditFilters: (filters) => {
        set(state => ({ 
          filters: { 
            ...state.filters, 
            audit: { ...state.filters.audit, ...filters } 
          },
          pagination: {
            ...state.pagination,
            audit: { ...state.pagination.audit, currentPage: 1 }
          }
        }));
      },

      clearFilters: (type) => {
        if (type === 'users') {
          set(state => ({
            filters: {
              ...state.filters,
              users: {
                role: 'all',
                status: 'active',
                search: ''
              }
            }
          }));
        } else if (type === 'audit') {
          set(state => ({
            filters: {
              ...state.filters,
              audit: {
                action: 'all',
                dateRange: null,
                user: 'all'
              }
            }
          }));
        }
      },

      // Pagination
      setUserPage: (currentPage) => {
        set(state => ({
          pagination: {
            ...state.pagination,
            users: { ...state.pagination.users, currentPage }
          }
        }));
      },

      setAuditPage: (currentPage) => {
        set(state => ({
          pagination: {
            ...state.pagination,
            audit: { ...state.pagination.audit, currentPage }
          }
        }));
      },

      // Selectors (computed values)
      getFilteredUsers: () => {
        const { users, filters } = get();
        
        return users.filter(user => {
          // Role filter
          if (filters.users.role !== 'all' && user.role !== filters.users.role) {
            return false;
          }

          // Status filter
          if (filters.users.status !== 'all') {
            const isActive = user.isActive !== false; // Default to active if not specified
            if (filters.users.status === 'active' && !isActive) return false;
            if (filters.users.status === 'inactive' && isActive) return false;
          }

          // Search filter
          if (filters.users.search) {
            const searchTerm = filters.users.search.toLowerCase();
            const matchesSearch = 
              user.name.toLowerCase().includes(searchTerm) ||
              user.email.toLowerCase().includes(searchTerm) ||
              user.department?.toLowerCase().includes(searchTerm);
            
            if (!matchesSearch) return false;
          }

          return true;
        });
      },

      getPaginatedUsers: () => {
        const { getFilteredUsers, pagination } = get();
        const filteredUsers = getFilteredUsers();
        
        const startIndex = (pagination.users.currentPage - 1) * pagination.users.itemsPerPage;
        const endIndex = startIndex + pagination.users.itemsPerPage;
        
        return filteredUsers.slice(startIndex, endIndex);
      },

      getFilteredAuditLogs: () => {
        const { auditLogs, filters } = get();
        
        return auditLogs.filter(log => {
          // Action filter
          if (filters.audit.action !== 'all' && log.action !== filters.audit.action) {
            return false;
          }

          // User filter
          if (filters.audit.user !== 'all' && log.userId !== filters.audit.user) {
            return false;
          }

          // Date range filter
          if (filters.audit.dateRange) {
            const logDate = new Date(log.timestamp);
            const startDate = filters.audit.dateRange.start ? new Date(filters.audit.dateRange.start) : null;
            const endDate = filters.audit.dateRange.end ? new Date(filters.audit.dateRange.end) : null;

            if (startDate && logDate < startDate) return false;
            if (endDate && logDate > endDate) return false;
          }

          return true;
        });
      },

      getPaginatedAuditLogs: () => {
        const { getFilteredAuditLogs, pagination } = get();
        const filteredLogs = getFilteredAuditLogs();
        
        const startIndex = (pagination.audit.currentPage - 1) * pagination.audit.itemsPerPage;
        const endIndex = startIndex + pagination.audit.itemsPerPage;
        
        return filteredLogs.slice(startIndex, endIndex);
      },

      getUserStats: () => {
        const { users } = get();
        return {
          total: users.length,
          active: users.filter(u => u.isActive !== false).length,
          admins: users.filter(u => u.role === 'admin').length,
          managers: users.filter(u => u.role === 'manager').length,
          employees: users.filter(u => u.role === 'employee').length
        };
      },

      getCompanyStats: () => {
        const { companies } = get();
        return {
          total: companies.length,
          active: companies.filter(c => c.isActive !== false).length
        };
      },

      // Reset store
      resetAdminData: () => set({
        users: [],
        companies: [],
        systemSettings: {},
        auditLogs: [],
        reports: {},
        loading: {
          users: false,
          companies: false,
          settings: false,
          reports: false
        },
        errors: {
          users: null,
          companies: null,
          settings: null,
          reports: null
        },
        filters: {
          users: {
            role: 'all',
            status: 'active',
            search: ''
          },
          audit: {
            action: 'all',
            dateRange: null,
            user: 'all'
          }
        },
        pagination: {
          users: {
            currentPage: 1,
            itemsPerPage: 10,
            totalItems: 0
          },
          audit: {
            currentPage: 1,
            itemsPerPage: 20,
            totalItems: 0
          }
        }
      })
    }),
    {
      name: 'admin-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);