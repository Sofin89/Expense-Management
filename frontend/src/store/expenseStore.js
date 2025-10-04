import { create } from 'zustand';

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  approvals: [],
  analytics: null,
  isLoading: false,
  
  setExpenses: (expenses) => set({ expenses }),
  setApprovals: (approvals) => set({ approvals }),
  setAnalytics: (analytics) => set({ analytics }),
  setLoading: (isLoading) => set({ isLoading }),
  
  addExpense: (expense) => {
    set(state => ({ 
      expenses: [expense, ...state.expenses] 
    }));
  },
  
  updateExpense: (expenseId, updates) => {
    set(state => ({
      expenses: state.expenses.map(exp => 
        exp._id === expenseId ? { ...exp, ...updates } : exp
      )
    }));
  },
  
  removeExpense: (expenseId) => {
    set(state => ({
      expenses: state.expenses.filter(exp => exp._id !== expenseId)
    }));
  },
  
  clearData: () => set({ 
    expenses: [], 
    approvals: [], 
    analytics: null 
  })
}));