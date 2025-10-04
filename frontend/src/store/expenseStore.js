import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useExpenseStore = create(
  devtools(
    (set, get) => ({
      // State
      expenses: [],
      approvals: [],
      analytics: null,
      isLoading: false,
      error: null,
      filters: {
        status: 'all',
        category: 'all',
        dateRange: null,
        search: ''
      },
      pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
      },

      // Actions - Expenses
      setExpenses: (expenses) => set({ 
        expenses,
        pagination: {
          ...get().pagination,
          totalItems: expenses.length
        }
      }),

      setApprovals: (approvals) => set({ approvals }),

      setAnalytics: (analytics) => set({ analytics }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Expense CRUD Operations
      addExpense: (expense) => {
        set(state => ({ 
          expenses: [expense, ...state.expenses],
          pagination: {
            ...state.pagination,
            totalItems: state.expenses.length + 1
          }
        }));
      },

      updateExpense: (expenseId, updates) => {
        set(state => ({
          expenses: state.expenses.map(exp => 
            exp._id === expenseId ? { ...exp, ...updates } : exp
          ),
          approvals: state.approvals.map(exp => 
            exp._id === expenseId ? { ...exp, ...updates } : exp
          )
        }));
      },

      removeExpense: (expenseId) => {
        set(state => ({
          expenses: state.expenses.filter(exp => exp._id !== expenseId),
          approvals: state.approvals.filter(exp => exp._id !== expenseId),
          pagination: {
            ...state.pagination,
            totalItems: Math.max(0, state.expenses.length - 1)
          }
        }));
      },

      // Filtering and Search
      setFilters: (newFilters) => {
        set(state => ({ 
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, currentPage: 1 }
        }));
      },

      clearFilters: () => {
        set({ 
          filters: {
            status: 'all',
            category: 'all',
            dateRange: null,
            search: ''
          },
          pagination: { ...get().pagination, currentPage: 1 }
        });
      },

      setSearch: (search) => {
        set(state => ({ 
          filters: { ...state.filters, search },
          pagination: { ...state.pagination, currentPage: 1 }
        }));
      },

      // Pagination
      setPagination: (pagination) => set({ pagination }),

      setCurrentPage: (currentPage) => {
        set(state => ({ 
          pagination: { ...state.pagination, currentPage } 
        }));
      },

      nextPage: () => {
        const { pagination } = get();
        const totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
        if (pagination.currentPage < totalPages) {
          set(state => ({
            pagination: {
              ...state.pagination,
              currentPage: state.pagination.currentPage + 1
            }
          }));
        }
      },

      prevPage: () => {
        const { pagination } = get();
        if (pagination.currentPage > 1) {
          set(state => ({
            pagination: {
              ...state.pagination,
              currentPage: state.pagination.currentPage - 1
            }
          }));
        }
      },

      // Selectors (computed values)
      getFilteredExpenses: () => {
        const { expenses, filters } = get();
        
        return expenses.filter(expense => {
          // Status filter
          if (filters.status !== 'all' && expense.status !== filters.status) {
            return false;
          }

          // Category filter
          if (filters.category !== 'all' && expense.category !== filters.category) {
            return false;
          }

          // Search filter
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchesSearch = 
              expense.title.toLowerCase().includes(searchTerm) ||
              expense.description?.toLowerCase().includes(searchTerm) ||
              expense.category.toLowerCase().includes(searchTerm);
            
            if (!matchesSearch) return false;
          }

          // Date range filter
          if (filters.dateRange) {
            const expenseDate = new Date(expense.date);
            const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
            const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

            if (startDate && expenseDate < startDate) return false;
            if (endDate && expenseDate > endDate) return false;
          }

          return true;
        });
      },

      getPaginatedExpenses: () => {
        const { getFilteredExpenses, pagination } = get();
        const filteredExpenses = getFilteredExpenses();
        
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        
        return filteredExpenses.slice(startIndex, endIndex);
      },

      getExpenseById: (expenseId) => {
        const { expenses } = get();
        return expenses.find(exp => exp._id === expenseId);
      },

      getExpensesByStatus: (status) => {
        const { expenses } = get();
        return expenses.filter(exp => exp.status === status);
      },

      getPendingExpenses: () => {
        const { expenses } = get();
        return expenses.filter(exp => exp.status === 'pending');
      },

      getApprovedExpenses: () => {
        const { expenses } = get();
        return expenses.filter(exp => exp.status === 'approved');
      },

      getRejectedExpenses: () => {
        const { expenses } = get();
        return expenses.filter(exp => exp.status === 'rejected');
      },

      getTotalSpent: () => {
        const { expenses } = get();
        return expenses
          .filter(exp => exp.status === 'approved')
          .reduce((total, exp) => total + (exp.convertedAmount || exp.amount), 0);
      },

      getMonthlySpending: () => {
        const { expenses } = get();
        const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
        
        const monthlyData = {};
        approvedExpenses.forEach(expense => {
          const date = new Date(expense.date);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = 0;
          }
          monthlyData[monthYear] += expense.convertedAmount || expense.amount;
        });

        return monthlyData;
      },

      getCategoryBreakdown: () => {
        const { expenses } = get();
        const approvedExpenses = expenses.filter(exp => exp.status === 'approved');
        
        const categoryData = {};
        approvedExpenses.forEach(expense => {
          if (!categoryData[expense.category]) {
            categoryData[expense.category] = {
              amount: 0,
              count: 0
            };
          }
          categoryData[expense.category].amount += expense.convertedAmount || expense.amount;
          categoryData[expense.category].count += 1;
        });

        return categoryData;
      },

      // Reset store
      clearData: () => set({ 
        expenses: [], 
        approvals: [], 
        analytics: null,
        filters: {
          status: 'all',
          category: 'all',
          dateRange: null,
          search: ''
        },
        pagination: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0
        }
      }),

      // Initialize from API data
      initializeFromAPI: (data) => {
        set({
          expenses: data.expenses || [],
          approvals: data.approvals || [],
          analytics: data.analytics || null
        });
      }
    }),
    {
      name: 'expense-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);