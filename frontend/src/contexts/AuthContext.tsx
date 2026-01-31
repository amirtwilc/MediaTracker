import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthContextType } from '../types';
import { api } from '../api';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
} as const;

/**
 * Authentication Context
 * Manages user authentication state and provides auth-related functions
 */
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state from localStorage on mount
   */
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (storedToken && storedUser) {
          // Validate stored user data
          const userData = JSON.parse(storedUser);
          
          // Basic validation
          if (userData.id && userData.username && userData.email && userData.role) {
            setToken(storedToken);
            setUser(userData);
            
            // Set token in API client
            api.setToken(storedToken);
          } else {
            // Invalid user data, clear storage
            console.warn('Invalid user data in localStorage, clearing...');
            clearStorage();
          }
        }
      } catch (error) {
        console.error('Error initializing auth from storage:', error);
        clearStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Clear auth storage
   */
  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    api.clearToken();
  }, []);

  /**
   * Set auth data in state and storage
   */
  const setAuthData = useCallback((authToken: string, userData: User) => {
    setToken(authToken);
    setUser(userData);
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, authToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    
    // Set token in API client
    api.setToken(authToken);
  }, []);

  /**
   * Login user
   * @throws {ApiError | NetworkError | TimeoutError | ValidationError}
   */
  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await api.auth.login(username, password);
      
      // Extract user data from response
      const userData: User = {
        id: response.userId,
        username: response.username,
        email: response.email,
        role: response.role,
      };

      // Set auth data
      setAuthData(response.accessToken, userData);
    } catch (error) {
      // Clear any existing auth data on login failure
      clearStorage();
      setUser(null);
      setToken(null);
      
      // Re-throw error for AuthPage to handle
      throw error;
    }
  };

  /**
   * Register new user
   * @throws {ApiError | NetworkError | TimeoutError | ValidationError}
   */
  const register = async (username: string, email: string, password: string): Promise<void> => {
    try {
      await api.auth.register(username, email, password);
      // Note: API returns token after registration, but we don't auto-login
      // User should login manually after successful registration
    } catch (error) {
      // Re-throw error for AuthPage to handle
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearStorage();
  }, [clearStorage]);

  /**
   * Check if user is admin
   */
  const isAdmin = user?.role === 'ADMIN';

  /**
   * Context value
   */
  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 * @throws {Error} if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};