
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { MOCK_USERS } from '../services/mockData';

interface RegisterData {
  username: string;
  password?: string;
  role: UserRole;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  usersList: User[]; // All users in the system (mock db)
  login: (username: string, password?: string) => Promise<{success: boolean; message?: string}>;
  logout: () => void;
  register: (data: RegisterData) => Promise<{success: boolean; message?: string}>;
  // Admin Methods
  updateUserStatus: (id: number, status: 'active' | 'pending') => void;
  deleteUser: (id: number) => void;
  addUser: (newUser: Omit<User, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize Users Database (Mock Persistence)
  useEffect(() => {
    const savedUsers = localStorage.getItem('slss_users_db');
    let initialUsers = [...MOCK_USERS]; // Default to fresh mock data

    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        // Merge strategy: Keep existing users, but FORCE update default admin (ID 1) 
        // from code to ensure credentials match what the developer expects.
        // This fixes "Login Error" when local storage has stale admin data.
        
        // 1. Filter out old admin from saved data
        const others = parsed.filter((u: User) => u.username !== 'stars');
        
        // 2. Get fresh admin from MOCK_USERS
        const admin = MOCK_USERS.find(u => u.username === 'stars');
        
        // 3. Combine
        if (admin) {
          initialUsers = [admin, ...others];
        } else {
          initialUsers = parsed;
        }
      } catch (e) {
        console.warn("Failed to parse local users DB, resetting to defaults.");
      }
    }

    setUsersList(initialUsers);
    localStorage.setItem('slss_users_db', JSON.stringify(initialUsers));

    // Check for active session
    const savedSession = localStorage.getItem('slss_user');
    if (savedSession) {
      try {
        const sessionUser = JSON.parse(savedSession);
        // Validate session user still exists and update it with latest permissions/role
        const freshUser = initialUsers.find(u => u.id === sessionUser.id);
        if (freshUser) {
          setUser(freshUser);
        } else {
          localStorage.removeItem('slss_user'); // Invalid session
        }
      } catch (e) {
        localStorage.removeItem('slss_user');
      }
    }
    setLoading(false);
  }, []);

  // Persist usersList whenever it changes
  useEffect(() => {
    if (usersList.length > 0) {
      localStorage.setItem('slss_users_db', JSON.stringify(usersList));
    }
  }, [usersList]);

  const login = async (username: string, password?: string): Promise<{success: boolean; message?: string}> => {
    const foundUser = usersList.find(u => u.username === username);
    
    if (foundUser) {
      if (foundUser.status === 'pending') {
        return { success: false, message: '账号审核中，请联系管理员审批。' };
      }

      if (foundUser.password && password !== foundUser.password) {
        return { success: false, message: '密码错误。' };
      }

      setUser(foundUser);
      localStorage.setItem('slss_user', JSON.stringify(foundUser));
      return { success: true };
    }
    return { success: false, message: '用户不存在。' };
  };

  const register = async (data: RegisterData): Promise<{success: boolean; message?: string}> => {
    if (usersList.some(u => u.username === data.username)) {
      return { success: false, message: '用户名已存在' };
    }

    const newUser: User = {
      id: Date.now(),
      username: data.username,
      password: data.password,
      role: data.role,
      status: 'pending', // Default status is pending approval
      phone: data.phone,
      permissions: getDefaultPermissions(data.role)
    };

    setUsersList(prev => [...prev, newUser]);
    return { success: true, message: '注册成功！请等待管理员审核通过。' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('slss_user');
  };

  // --- Admin Functions ---

  const updateUserStatus = (id: number, status: 'active' | 'pending') => {
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, status } : u));
  };

  const deleteUser = (id: number) => {
    setUsersList(prev => prev.filter(u => u.id !== id));
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now(),
      permissions: userData.permissions.length > 0 ? userData.permissions : getDefaultPermissions(userData.role)
    };
    setUsersList(prev => [...prev, newUser]);
  };

  // Helper
  const getDefaultPermissions = (role: UserRole): Permission[] => {
    switch (role) {
      case UserRole.ADMIN:
        return ['VIEW_DASHBOARD', 'VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_PRODUCTION', 'MANAGE_PRODUCTION', 'MANAGE_SYSTEM'];
      case UserRole.MANAGER:
        return ['VIEW_DASHBOARD', 'VIEW_ORDERS', 'MANAGE_ORDERS', 'VIEW_PRODUCTION'];
      case UserRole.TECHNICIAN:
        return ['VIEW_DASHBOARD', 'VIEW_ORDERS', 'MANAGE_ORDERS'];
      case UserRole.PRODUCTION:
        return ['VIEW_DASHBOARD', 'VIEW_PRODUCTION', 'MANAGE_PRODUCTION'];
      default:
        return ['VIEW_DASHBOARD'];
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      usersList,
      login, 
      logout, 
      register,
      updateUserStatus,
      deleteUser,
      addUser
    }}>
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
