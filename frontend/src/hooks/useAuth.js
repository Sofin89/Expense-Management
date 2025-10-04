import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, setCompany } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await api.get('/api/auth/me');
          login(response.data.user, storedToken);
          if (response.data.company) {
            setCompany(response.data.company);
          }
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { user, token, company } = response.data;
      
      login(user, token);
      if (company) setCompany(company);
      
      localStorage.setItem('token', token);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const signUp = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { user, token, company } = response.data;
      
      login(user, token);
      if (company) setCompany(company);
      
      localStorage.setItem('token', token);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const signOut = () => {
    logout();
    localStorage.removeItem('token');
  };

  return {
    user,
    token,
    isAuthenticated,
    loading,
    signIn,
    signUp,
    signOut,
  };
};