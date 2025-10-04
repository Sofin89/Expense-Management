import { useEffect, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export const useExpenses = () => {
  const { 
    expenses, 
    approvals, 
    analytics, 
    setExpenses, 
    setApprovals, 
    setAnalytics, 
    setLoading,
    addExpense,
    updateExpense,
    removeExpense
  } = useExpenseStore();
  
  const [error, setError] = useState(null);
  const { user } = useAuthStore();

  const fetchExpenses = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/expenses?${queryString}`);
      setExpenses(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch expenses';
      setError(errorMessage);
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovals = async () => {
    if (user?.role === 'employee') return; // Only managers/admins need approvals
    
    try {
      const response = await api.get('/api/expenses/approvals');
      setApprovals(response.data);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/analytics/company');
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const createExpense = async (expenseData) => {
    try {
      setError(null);
      
      // Handle FormData for file uploads
      const config = expenseData instanceof FormData 
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : {};
      
      const response = await api.post('/api/expenses', expenseData, config);
      addExpense(response.data);
      
      // Refresh analytics to reflect new expense
      await fetchAnalytics();
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create expense';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const updateExpenseStatus = async (expenseId, status, comment = '') => {
    try {
      setError(null);
      
      const response = await api.put(`/api/expenses/${expenseId}/status`, { 
        status, 
        comment 
      });
      
      updateExpense(expenseId, response.data);
      
      // Refresh approvals and analytics
      await fetchApprovals();
      await fetchAnalytics();
      
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update expense';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      setError(null);
      
      await api.delete(`/api/expenses/${expenseId}`);
      removeExpense(expenseId);
      
      // Refresh analytics
      await fetchAnalytics();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete expense';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const fetchExpenseById = async (expenseId) => {
    try {
      const response = await api.get(`/api/expenses/${expenseId}`);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch expense';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const exportExpenses = async (format = 'csv', filters = {}) => {
    try {
      const queryString = new URLSearchParams({ ...filters, format }).toString();
      const response = await api.get(`/api/expenses/export?${queryString}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to export expenses';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchApprovals();
      fetchAnalytics();
    }
  }, [user]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => setError(null);
  }, []);

  return {
    // State
    expenses,
    approvals,
    analytics,
    error,
    
    // Actions
    fetchExpenses,
    fetchApprovals,
    fetchAnalytics,
    createExpense,
    updateExpenseStatus,
    deleteExpense,
    fetchExpenseById,
    exportExpenses,
    
    // Utilities
    refetch: () => {
      fetchExpenses();
      fetchApprovals();
      fetchAnalytics();
    },
    clearError: () => setError(null)
  };
};