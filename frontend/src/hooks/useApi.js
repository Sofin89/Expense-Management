import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (apiCall, ...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall(...args);
      setData(response.data);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Request failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    clear,
    setError
  };
};