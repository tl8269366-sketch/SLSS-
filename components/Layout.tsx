
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { Permission } from '../types';
import { 
  LayoutDashboard, 
  Wrench, 
  ScanLine, 
  Shield, 
  LogOut, 
  Menu,
  Server,
  Database
} from 'lucide-react';
import { ROLE_LABELS } from '../constants';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { themeConfig } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!user) return <>{children}</>;

  const NavItem = ({ to, icon: Icon, label, permission }: { to: string; icon: any; label: string; permission: Permission }) => {
    // Check if user has the required permission
    if (!user.permissions.includes(permission)) return null;

    const active = location.pathname === to;
    
    // Dynamic styles based on theme
    const activeClass = `${themeConfig.classes.bgLight} ${themeConfig.classes.text} border-r-4 ${themeConfig.classes.border.replace('border-', 'border-l-').replace('200', '600')}`; // Use border-l-color hack or similar? Tailwind border colors are just border-blue-600.
    // Actually, border-r-4 usually needs a border color. Let's use inline style or map correctly.
    // The `themeConfig.classes.text` usually maps to a color like `text-blue-600`.
    // The active border should match.
    const activeBorderColor = themeConfig.color === 'blue' ? 'border-blue-700' : 
                              themeConfig.color === 'purple' ? 'border-purple-700' :
                              themeConfig.color === 'green' ? 'border-emerald-700' :
                              themeConfig.color === 'orange' ? 'border-orange-700' : 'border-slate-700';

    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
          active 
            ? `${themeConfig.classes.bgLight} ${themeConfig.classes.text} border-r-4 ${activeBorderColor}` 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <Icon className="w-5 h-5 mr-3" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-slate-900 text-white">
          <Server className={`w-7 h-7 mr-2 ${themeConfig.classes.text.replace('text-', 'text-').replace('600', '400')}`} />
          <span className="text-lg font-bold tracking-wide">SLSS V2.0</span>
        </div>

        <nav className="mt-6">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="数据仪表盘" permission="VIEW_DASHBOARD" />
          
          <NavItem 
            to="/orders" 
            icon={Wrench} 
            label="售后工单管理" 
            permission="VIEW_ORDERS" 
          />
          
          <NavItem 
            to="/production/list" 
            icon={Database} 
            label="生产数据查询" 
            permission="VIEW_PRODUCTION" 
          />

          <NavItem 
            to="/production/entry" 
            icon={ScanLine} 
            label="生产录入系统" 
            permission="MANAGE_PRODUCTION" 
          />
          
          <NavItem 
            to="/admin" 
            icon={Shield} 
            label="系统管理配置" 
            permission="MANAGE_SYSTEM" 
          />
        </nav>

        <div className="absolute bottom-0 w-full border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className={`w-8 h-8 rounded-full ${themeConfig.classes.bgLight} flex items-center justify-center ${themeConfig.classes.text} font-bold border ${themeConfig.classes.border}`}>
              {user.username[0].toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-700 truncate" title={user.username}>{user.username}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-200 flex items-center px-4 h-16 justify-between shadow-sm">
           <div className="flex items-center font-bold text-gray-800">
              <Server className={`w-6 h-6 ${themeConfig.classes.text} mr-2`} /> SLSS Mobile
           </div>
           <button onClick={() => setSidebarOpen(true)} className="text-gray-500 p-2 rounded hover:bg-gray-100">
             <Menu className="w-6 h-6" />
           </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
};
