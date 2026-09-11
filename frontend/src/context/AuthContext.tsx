import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  getStoredToken,
  getStoredUser,
  saveAuthSession,
  clearAuthSession,
  loginUser
} from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  loading: boolean;
  login: (email: string, password: string, selectedRole?: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Get initial session from local storage directly
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    } else {
      clearAuthSession();
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, selectedRole?: UserRole) => {
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      setUser(data.user);
      setToken(data.token);
      // saveAuthSession is already called inside loginUser mock
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    // Mock register
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const resetPassword = async (email: string) => {
    // Mock reset
  };

  const updatePassword = async (password: string) => {
    // Mock update
  };

  const logout = async () => {
    clearAuthSession();
    setUser(null);
    setToken(null);
  };

  const loginDemo = async () => {
    await login('admin@demo.com', 'password', 'admin');
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isOfficer = user?.role === 'officer';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isOfficer,
        loading,
        login,
        register,
        resetPassword,
        updatePassword,
        logout,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
