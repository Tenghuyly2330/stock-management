import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowLeftRight,
  Warehouse,
  ShoppingBag,
  ShoppingCart,
  Users2,
  BarChart3,
  Shield,
  Settings,
  Boxes,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Categories', href: '/categories', icon: Layers },
  { name: 'Inventory & Moves', href: '/inventory', icon: ArrowLeftRight },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart },
  { name: 'Sales Orders', href: '/sales', icon: ShoppingBag },
  { name: 'Suppliers', href: '/suppliers', icon: Users2 },
  { name: 'Reports & Export', href: '/reports', icon: BarChart3 },
  { name: 'Users & RBAC', href: '/users', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">StockSync</span>
              <span className="block text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
                Enterprise v1.0
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Core Modules
          </div>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-100 p-4">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Environment</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 font-bold">
                Online
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">PostgreSQL + Express + React</p>
          </div>
        </div>
      </aside>
    </>
  );
}
