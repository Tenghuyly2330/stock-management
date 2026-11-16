import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Verifying security session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-rose-50 text-rose-600 border border-rose-100 mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted (403 Forbidden)</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          Your current account role is <span className="font-semibold text-slate-800 uppercase">'{user?.role}'</span>,
          which does not have administrative authorization to view this module.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Main Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
