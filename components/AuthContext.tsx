
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { MOCK_MODE } from '../constants';
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
  usersList: User[];
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

  // Initialize Auth State
  useEffect(() => {
    const initAuth = async () => {
      // 1. Check local session
      const savedSession = localStorage.getItem('slss_user');
      if (savedSession) {
        try {
          setUser(JSON.parse(savedSession));
        } catch (e) {
          localStorage.removeItem('slss_user');
        }
      }

      // 2. Fetch all users (for admin management)
      await fetchUsers();
      
      setLoading(false);
    };
    initAuth();
  }, []);

  const fetchUsers = async () => {
    if (MOCK_MODE) {
      if (usersList.length === 0) setUsersList(MOCK_USERS);
      return;
    }
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error("Failed to fetch users");
    }
  };

  const login = async (username: string, password?: string): Promise<{success: boolean; message?: string}> => {
    if (MOCK_MODE) {
      await new Promise(r => setTimeout(r, 600)); // Simulate network delay
      const sourceUsers = usersList.length > 0 ? usersList : MOCK_USERS;
      const foundUser = sourceUsers.find(u => u.username === username && u.password === password);

      if (foundUser) {
        if (foundUser.status !== 'active') {
          return { success: false, message: '账号审核中，请联系管理员' };
        }
        setUser(foundUser);
        localStorage.setItem('slss_user', JSON.stringify(foundUser));
        return { success: true };
      }
      return { success: false, message: '用户名或密码错误 (演示模式)' };
    }

    try {
      // Add Timeout Logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('slss_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || '登录失败' };
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, message: '服务器响应超时，请检查网络或联系管理员' };
      }
      return { success: false, message: '服务器连接失败' };
    }
  };

  const register = async (data: RegisterData): Promise<{success: boolean; message?: string}> => {
    const newUser: User = {
      id: Date.now(),
      ...data,
      status: 'pending',
      permissions: getDefaultPermissions(data.role)
    };

    if (MOCK_MODE) {
       await new Promise(r => setTimeout(r, 600));
       setUsersList(prev => [...prev, newUser]);
       return { success: true, message: '注册申请已提交 (演示模式)' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const result = await res.json();
      if (result.success) {
        fetchUsers(); // Refresh list
        return { success: true, message: '注册成功！请等待管理员审核。' };
      }
      return { success: false, message: result.message || '注册失败' };
    } catch (e) {
      return { success: false, message: '服务器错误' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('slss_user');
  };

  // --- Admin Functions ---

  const updateUserStatus = async (id: number, status: 'active' | 'pending') => {
    if (MOCK_MODE) {
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, status } : u));
      return;
    }
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id: number) => {
    if (MOCK_MODE) {
      setUsersList(prev => prev.filter(u => u.id !== id));
      return;
    }
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (e) { console.error(e); }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      id: Date.now(),
      ...userData,
      permissions: userData.permissions && userData.permissions.length > 0 
        ? userData.permissions 
        : getDefaultPermissions(userData.role)
    };

    if (MOCK_MODE) {
      setUsersList(prev => [...prev, newUser]);
      return;
    }

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  // Helper
  const getDefaultPermissions = (role: UserRole): Permission[] => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          'VIEW_DASHBOARD', 
          'VIEW_ORDERS', 'MANAGE_ORDERS', 'DESIGN_PROCESS',
          'PROD_ENTRY_ASSEMBLY', 'PROD_ENTRY_INSPECT_INIT', 'PROD_ENTRY_AGING', 'PROD_ENTRY_INSPECT_FINAL',
          'PROD_REPAIR', 'PROD_QUERY',
          'MANAGE_SYSTEM'
        ];
      case UserRole.MANAGER:
        return [
          'VIEW_DASHBOARD', 
          'VIEW_ORDERS', 'MANAGE_ORDERS', 
          'PROD_QUERY'
        ];
      case UserRole.TECHNICIAN:
        return ['VIEW_DASHBOARD', 'VIEW_ORDERS', 'MANAGE_ORDERS'];
      case UserRole.PRODUCTION:
        return [
          'VIEW_DASHBOARD', 
          'PROD_ENTRY_ASSEMBLY', 'PROD_ENTRY_INSPECT_INIT', 
          'PROD_QUERY'
        ];
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
