
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceOrders from './pages/ServiceOrders';
import OrderDetail from './pages/OrderDetail';
import ProductionEntry from './pages/ProductionImport'; 
import ProductionQuery from './pages/ProductionList';   
import ProductionRepair from './pages/ProductionRepair';
import ProcessDesigner from './pages/ProcessDesigner'; 
import DynamicProcessList from './pages/DynamicProcessList'; // New Page
import Portal from './pages/Portal';
import AdminPanel from './pages/AdminPanel';
import { Permission } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredPermission?: Permission; requiredPermissions?: Permission[] }> = ({ children, requiredPermission, requiredPermissions }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredPermission && !user.permissions.includes(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (requiredPermissions && !requiredPermissions.some(p => user.permissions.includes(p))) {
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

      {/* Dynamic Process Routes */}
      <Route path="/process/:module/:templateId" element={
        <ProtectedRoute requiredPermission="VIEW_ORDERS">
           <DynamicProcessList />
        </ProtectedRoute>
      } />

      <Route path="/production/list" element={
        <ProtectedRoute requiredPermission="PROD_QUERY">
          <ProductionQuery />
        </ProtectedRoute>
      } />

      <Route path="/production/entry" element={
        <ProtectedRoute requiredPermissions={['PROD_ENTRY_ASSEMBLY', 'PROD_ENTRY_INSPECT_INIT', 'PROD_ENTRY_AGING', 'PROD_ENTRY_INSPECT_FINAL']}>
          <ProductionEntry />
        </ProtectedRoute>
      } />

      <Route path="/production/repair" element={
        <ProtectedRoute requiredPermission="PROD_REPAIR">
          <ProductionRepair />
        </ProtectedRoute>
      } />
      
      <Route path="/production" element={<Navigate to="/production/entry" />} />

      {/* Process Designer Route */}
      <Route path="/process-designer" element={
        <ProtectedRoute requiredPermission="MANAGE_SYSTEM">
          <ProcessDesigner />
        </ProtectedRoute>
      } />

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