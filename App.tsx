
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import OrderDetail from './pages/OrderDetail';
import ProductionImport from './pages/ProductionImport';
import ProductionList from './pages/ProductionList';
import Portal from './pages/Portal';
import AdminPanel from './pages/AdminPanel';
import { Permission } from './types';

// Updated to check permissions instead of roles
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredPermission?: Permission }> = ({ children, requiredPermission }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // If specific permission is required, check it
  if (requiredPermission && !user.permissions.includes(requiredPermission)) {
    // If user has no access, redirect to dashboard or show unauthorized
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/portal" element={<Portal />} />
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute requiredPermission="VIEW_DASHBOARD">
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute requiredPermission="VIEW_ORDERS">
          <ServiceOrders />
        </ProtectedRoute>
      } />

      <Route path="/orders/:id" element={
        <ProtectedRoute requiredPermission="VIEW_ORDERS">
          <OrderDetail />
        </ProtectedRoute>
      } />

      {/* New Route for Viewing Production Data */}
      <Route path="/production/list" element={
        <ProtectedRoute requiredPermission="VIEW_PRODUCTION">
          <ProductionList />
        </ProtectedRoute>
      } />

      {/* Existing Route for Entry */}
      <Route path="/production/entry" element={
        <ProtectedRoute requiredPermission="MANAGE_PRODUCTION">
          <ProductionImport />
        </ProtectedRoute>
      } />
      
      {/* Legacy redirect for old bookmarks */}
      <Route path="/production" element={<Navigate to="/production/entry" />} />

      <Route path="/admin" element={
        <ProtectedRoute requiredPermission="MANAGE_SYSTEM">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
