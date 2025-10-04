import { useEffect, useState } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { api } from '../utils/api';

export const useExpenses = () => {
  const { 
    expenses, 
    approvals, 
    analytics, 
    setExpenses, 
    setApprovals, 
    setAnalytics, 
    setLoading 
  } = useExpenseStore();
  const [error, setError] = useState(null);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/expenses');
      setExpenses(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      const response = await api.get('/api/expenses/approvals');
      setApprovals(response.data);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/analytics/company');
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const createExpense = async (expenseData) => {
    try {
      const response = await api.post('/api/expenses', expenseData);
      await fetchExpenses();
      await fetchAnalytics();
      return { success: true, data: response.data };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Failed to create expense' 
      };
    }
  };

  const updateExpenseStatus = async (expenseId, status, comment = '') => {
    try {
      const response = await api.put(`/api/expenses/${expenseId}/status`, { 
        status, 
        comment 
      });
      await fetchExpenses();
      await fetchApprovals();
      await fetchAnalytics();
      return { success: true, data: response.data };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.message || 'Failed to update expense' 
      };
    }
  };

  useEffect(() => {
    if (expenses.length === 0) {
      fetchExpenses();
    }
    if (!analytics) {
      fetchAnalytics();
    }
    fetchApprovals();
  }, []);

  return {
    expenses,
    approvals,
    analytics,
    error,
    fetchExpenses,
    fetchApprovals,
    fetchAnalytics,
    createExpense,
    updateExpenseStatus,
    refetch: () => {
      fetchExpenses();
      fetchApprovals();
      fetchAnalytics();
    }
  };
};
