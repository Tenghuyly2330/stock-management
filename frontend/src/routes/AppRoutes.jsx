import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import Users from '../pages/Users';
import Products from '../pages/Products';
import Categories from '../pages/Categories';
import WarehousePage from '../pages/Warehouse';
import History from '../pages/History';
import Suppliers from '../pages/Suppliers';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import ProtectedRoute from '../components/common/ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* 1. Dashboard */}
        <Route index element={<Dashboard />} />
        
        {/* 2. Products (Farm Machines & Metals) */}
        <Route path="products" element={<Products />} />

        {/* 3. Categories */}
        <Route path="categories" element={<Categories />} />

        {/* 4. Warehouse (1 is Base Warehouse) */}
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="warehouses" element={<Navigate to="/warehouse" replace />} />

        {/* 5. History (Who buy and add products) */}
        <Route path="history" element={<History />} />
        <Route path="inventory" element={<Navigate to="/history" replace />} />

        {/* 6. Supplier */}
        <Route path="suppliers" element={<Suppliers />} />

        {/* 7. User Management (Admin & Manager) */}
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Users />
            </ProtectedRoute>
          }
        />

        {/* 8. Settings */}
        <Route path="settings" element={<Settings />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
