// src/context/AuthContext.jsx
//
// React Context provides global state — like a store that
// any component can read from without prop drilling.
// Here we store: the current user + login/logout functions.

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load: check if a token exists and restore the session
  useEffect(() => {
    const token = localStorage.getItem('vjcloudbank_token');
    const savedUser = localStorage.getItem('vjcloudbank_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('vjcloudbank_token', token);
    localStorage.setItem('vjcloudbank_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('vjcloudbank_token');
    localStorage.removeItem('vjcloudbank_user');
    setUser(null);
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — any component uses: const { user, login } = useAuth()
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
