import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Dashboard from '../pages/Dashboard';
import PlaceholderPage from '../pages/PlaceholderPage';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route
          path="products"
          element={
            <PlaceholderPage
              title="Product Management"
              stageNumber="3"
              description="Manage master catalog of goods, barcodes, SKUs, category links, pricing tiers, and minimum safety stock thresholds."
              features={[
                'Product CRUD with Barcode / SKU generation',
                'Image upload and description editor',
                'Cost price vs. Selling price profit margin computation',
                'Instant search, filtering, and pagination',
              ]}
            />
          }
        />
        <Route
          path="categories"
          element={
            <PlaceholderPage
              title="Category Taxonomy"
              stageNumber="3"
              description="Organize inventory items into logical hierarchies for streamlined reporting, filtering, and bulk operations."
              features={[
                'Nested and flat category structures',
                'Category-level stock counts and metrics',
                'Quick edit and batch re-assignment',
              ]}
            />
          }
        />
        <Route
          path="inventory"
          element={
            <PlaceholderPage
              title="Inventory & Stock Movements"
              stageNumber="4"
              description="Live ledger of stock in, stock out, inventory adjustments, and multi-warehouse transfers with audit trails."
              features={[
                'Stock In (Procurement receiving) & Stock Out (Sales dispatch)',
                'Warehouse-to-Warehouse transfer with double-entry ledger',
                'Physical audit inventory count adjustments',
                'Immutable stock movement history with transaction locks',
              ]}
            />
          }
        />
        <Route
          path="warehouses"
          element={
            <PlaceholderPage
              title="Warehouse Management"
              stageNumber="4"
              description="Manage physical distribution centers, retail storage rooms, and bin locations with per-location stock levels."
              features={[
                'Multi-location configuration and contact mapping',
                'Per-warehouse inventory balances',
                'Transfer routing and logistics tracking',
              ]}
            />
          }
        />
        <Route
          path="purchases"
          element={
            <PlaceholderPage
              title="Purchase Orders & Procurement"
              stageNumber="5"
              description="Create purchase orders, track vendor deliveries, receive goods into inventory, and update cost averages."
              features={[
                'Purchase order drafting and supplier dispatch',
                'Partial and full stock receiving with status updates',
                'Automatic inventory replenishment on PO receipt',
              ]}
            />
          }
        />
        <Route
          path="sales"
          element={
            <PlaceholderPage
              title="Sales Orders & Fulfillment"
              stageNumber="5"
              description="Process customer orders, calculate taxes and totals, deduct inventory automatically, and print receipts."
              features={[
                'Sales order creation with dynamic pricing',
                'Real-time stock deduction with negative stock prevention',
                'Receipt and invoice generation with PDF download',
              ]}
            />
          }
        />
        <Route
          path="suppliers"
          element={
            <PlaceholderPage
              title="Supplier Directory"
              stageNumber="5"
              description="Vendor profiles, contact persons, historical purchase orders, and lead-time tracking."
              features={[
                'Supplier contact profiles and payment terms',
                'Historical purchase orders and fulfilled items',
                'Vendor reliability ratings',
              ]}
            />
          }
        />
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Reports & Analytics"
              stageNumber="6"
              description="Deep financial, valuation, inventory velocity, and reorder point analytics with CSV and PDF export."
              features={[
                'Inventory valuation and stock turnover ratios',
                'Low-stock threshold warning reports',
                'Sales revenue vs. COGS (Cost of Goods Sold) graphs',
                'Instant CSV and formatted PDF export engine',
              ]}
            />
          }
        />
        <Route
          path="users"
          element={
            <PlaceholderPage
              title="User Management & RBAC"
              stageNumber="2"
              description="Role-based access control governing permissions across Super Admin, Warehouse Manager, and Staff roles."
              features={[
                'User creation and credential management',
                'Role matrix (Admin, Manager, Staff)',
                'Granular permissions per module and action',
              ]}
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="System Configuration"
              stageNumber="7"
              description="Global system settings, currency, tax rates, barcode formats, and integration keys."
              features={[
                'Company profile, currency symbol, and date formatting',
                'Low-stock email alert triggers',
                'Audit log retention and database backup controls',
              ]}
            />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
