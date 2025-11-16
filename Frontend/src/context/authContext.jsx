import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.withCredentials = true;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salt, setSalt] = useState(null);

  // Setup axios interceptors for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and needs refresh
        if (error.response?.status === 401 && error.response?.data?.needsRefresh && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await axios.post('/api/auth/refresh');
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            setUser(null);
            setSalt(null);
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);

      // Get salt for encryption
      const saltResponse = await axios.get('/api/auth/salt');
      setSalt(saltResponse.data.salt);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setSalt(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, masterPassword) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        masterPassword
      });

      setUser(response.data.user);
      localStorage.setItem('accessToken', response.data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

      // Get salt
      const saltResponse = await axios.get('/api/auth/salt');
      setSalt(saltResponse.data.salt);

      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const login = async (email, masterPassword) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        masterPassword
      });

      setUser(response.data.user);
      setSalt(response.data.salt);
      localStorage.setItem('accessToken', response.data.accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSalt(null);
      localStorage.removeItem('accessToken');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const value = {
    user,
    salt,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;