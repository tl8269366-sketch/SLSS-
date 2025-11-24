import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for persisted session
    const savedUser = localStorage.getItem('slss_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password?: string): Promise<boolean> => {
    // Simulating login against mock DB
    const foundUser = MOCK_USERS.find(u => u.username === username);
    
    if (foundUser) {
      // Verify password if one exists in mock data, otherwise allow for legacy testing if needed
      if (foundUser.password && password !== foundUser.password) {
        return false;
      }

      setUser(foundUser);
      localStorage.setItem('slss_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('slss_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};