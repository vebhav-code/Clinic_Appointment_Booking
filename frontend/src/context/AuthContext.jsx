import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pulse_auth_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pulse_auth_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync session with backend on initial load
  useEffect(() => {
    async function initAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        setUser(me);
        localStorage.setItem('pulse_auth_user', JSON.stringify(me));
      } catch {
        // Token invalid or expired
        setToken(null);
        setUser(null);
        localStorage.removeItem('pulse_auth_token');
        localStorage.removeItem('pulse_auth_user');
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Global listener for 401 logouts
    const handleLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('pulse_auth_logout', handleLogout);
    return () => window.removeEventListener('pulse_auth_logout', handleLogout);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('pulse_auth_token', res.access_token);
    localStorage.setItem('pulse_auth_user', JSON.stringify(res.user));
    return res.user;
  };

  const register = async (payload) => {
    const res = await api.auth.register(payload);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('pulse_auth_token', res.access_token);
    localStorage.setItem('pulse_auth_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pulse_auth_token');
    localStorage.removeItem('pulse_auth_user');
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
