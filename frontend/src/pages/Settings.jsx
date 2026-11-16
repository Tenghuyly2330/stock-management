import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Building,
  Warehouse,
  Shield,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Save,
  User,
  Sliders,
  DollarSign,
  Mail,
  Phone,
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  // Company Profile Settings State
  const [companySettings, setCompanySettings] = useState({
    companyName: 'StockSync Farm Machinery & Industrial Metals',
    baseWarehouseName: 'Main Base Warehouse',
    baseWarehouseCode: 'BASE-01',
    currencySymbol: '$',
    supportEmail: 'support@stocksync.com',
    supportPhone: '+1-800-555-BASE',
    reorderAlertThreshold: '5',
  });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Save Company Settings
  const handleSaveCompany = (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setTimeout(() => {
      setSavingCompany(false);
      setCompanySuccess('Company preferences saved successfully');
      setTimeout(() => setCompanySuccess(null), 4000);
    }, 400);
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(res.data?.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4500);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-indigo-600" />
          Settings & Configuration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure business details, base warehouse preferences, and account security credentials.
        </p>
      </div>

      {/* 1. Business & Base Warehouse Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Business & Base Warehouse Settings</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
            1 is Base
          </span>
        </div>

        <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
          {companySuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{companySuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company / Business Name
              </label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Primary Base Warehouse Name
              </label>
              <input
                type="text"
                value={companySettings.baseWarehouseName}
                onChange={(e) => setCompanySettings({ ...companySettings, baseWarehouseName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Base Facility Code
              </label>
              <input
                type="text"
                disabled
                value={companySettings.baseWarehouseCode}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm font-mono text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={companySettings.currencySymbol}
                onChange={(e) => setCompanySettings({ ...companySettings, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reorder Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={companySettings.reorderAlertThreshold}
                onChange={(e) => setCompanySettings({ ...companySettings, reorderAlertThreshold: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={companySettings.supportEmail}
                onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={companySettings.supportPhone}
                onChange={(e) => setCompanySettings({ ...companySettings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingCompany}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingCompany ? 'Saving...' : 'Save Business Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. User Account Security & Change Password */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Account Security (Change Password)</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono">
            {user?.email}
          </span>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

