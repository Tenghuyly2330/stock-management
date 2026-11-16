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
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="warehouses" element={<Navigate to="/warehouse" replace />} />
        <Route path="history" element={<History />} />
        <Route path="inventory" element={<Navigate to="/history" replace />} />
        <Route path="suppliers" element={<Suppliers />} />

        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
