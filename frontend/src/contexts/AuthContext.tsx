import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { ApiError, NetworkError, TimeoutError, ValidationError } from '../api/errors';
import { api } from '../api';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.auth.login(username, password);

      setToken(response.accessToken);
      const userData: User = {
        id: response.userId,
        username: response.username,
        email: response.email,
        role: response.role,
      };
      setUser(userData);

      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      handleError(error, 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await api.auth.register(username, email, password);
    } catch (error) {
      handleError(error, 'Registration failed');
    }
  };

  const handleError = (error: any, defaultMessage: string): void => {
    var errorMsg = defaultMessage;
    if (error instanceof ApiError) {
      console.error(`API Error (${error.statusCode}): ${error.message}`);
      errorMsg = error.message;
      // Access error.data for additional details
    } else if (error instanceof NetworkError) {
      errorMsg = 'Network error - check your connection';
    } else if (error instanceof TimeoutError) {
      errorMsg = 'Request timed out';
    } else if (error instanceof ValidationError) {
      console.error('Validation error:', error.message);
      errorMsg = 'Invalid input - please check your data';
    } else {
      console.error('Unexpected error:', error);
    }
    throw new Error(`${errorMsg}`);
  }

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};