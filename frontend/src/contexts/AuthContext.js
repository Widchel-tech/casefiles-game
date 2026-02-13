import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('casefiles_token'));
  const [loading, setLoading] = useState(true);

  // Create api instance that updates with token
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL
    });
    
    if (token) {
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return instance;
  }, [token]);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem('casefiles_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('casefiles_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const ownerLogin = async (email, password) => {
    const response = await axios.post(`${API_URL}/owner/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('casefiles_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (username, email, password) => {
    const response = await axios.post(`${API_URL}/auth/register`, { username, email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('casefiles_token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('casefiles_token');
    setToken(null);
    setUser(null);
  };

  const isOwner = user?.role === 'owner';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      ownerLogin,
      register,
      logout,
      isOwner,
      api
    }}>
      {children}
    </AuthContext.Provider>
  );
};
