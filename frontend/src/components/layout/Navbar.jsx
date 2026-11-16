import React from 'react';
import { Menu, Bell, Search, ShieldCheck, LogOut, User } from 'lucide-react';
import ConnectionBadge from '../common/ConnectionBadge';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const roleDisplay = user?.role ? user.role.toUpperCase() : 'USER';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          type="button"
          aria-label="Toggle navigation menu"
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, SKU, purchase orders..."
            className="w-72 lg:w-96 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Backend & DB Health Indicator */}
        <ConnectionBadge />

        {/* Notification bell */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* User Pill & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900 leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>{roleDisplay}</span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
