import { useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';

// Custom hook to use auth store
export const useAuthStore = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sign up a new user
  const signup = useCallback(async (username, email, password) => {
    try {
      const response = await api.post('/auth/signup', {
        username,
        email,
        password,
      });
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  // Log in a user
  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  // Log out a user
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    } catch (error) {
      // Even if logout fails on server, clear local state
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      throw error;
    }
  }, []);

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      return response.data;
    } catch (error) {
      // 401 is expected for guest users
      if (error.response?.status !== 401) {
        console.error('Error fetching user:', error);
      }
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      throw error;
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    getCurrentUser().catch(() => {
      // Silently handle errors (guest users are allowed)
    });
  }, [getCurrentUser]);

  return {
    user,
    loading,
    isAuthenticated,
    signup,
    login,
    logout,
    getCurrentUser,
  };
};

// Export direct access to auth API functions (for backward compatibility)
export const authAPI = {
  signup: async (username, email, password) => {
    const response = await api.post('/auth/signup', {
      username,
      email,
      password,
    });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

