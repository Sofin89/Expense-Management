import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, setCompany } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Verify token is still valid
          const response = await api.get('/api/auth/me');
          login(response.data.user, storedToken);
          if (response.data.company) {
            setCompany(response.data.company);
          }
          setError(null);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/auth/login', { email, password });
      const { user, token, company } = response.data;
      
      login(user, token);
      if (company) setCompany(company);
      
      localStorage.setItem('token', token);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/auth/register', userData);
      const { user, token, company } = response.data;
      
      login(user, token);
      if (company) setCompany(company);
      
      localStorage.setItem('token', token);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    logout();
    localStorage.removeItem('token');
    setError(null);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      login(response.data.user, token);
      if (response.data.company) {
        setCompany(response.data.company);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser,
    clearError: () => setError(null)
  };
};