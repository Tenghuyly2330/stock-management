import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Settings as SettingsIcon,
  Building,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Save,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  ShieldAlert,
  Boxes,
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySettings, setCompanySettings] = useState({
    companyName: 'StockSync Farm Machinery & Industrial Metals',
    baseWarehouseName: 'Main Base Warehouse',
    baseWarehouseCode: 'BASE-01',
    baseWarehouseAddress: '',
    baseWarehousePhone: '+1-800-555-BASE',
    currencySymbol: '$',
    supportEmail: 'support@stocksync.com',
    supportPhone: '+1-800-555-BASE',
    reorderAlertThreshold: '5',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data) {
        setCompanySettings({
          companyName: res.data.companyName || 'StockSync Farm Machinery & Industrial Metals',
          baseWarehouseName: res.data.baseWarehouseName || 'Main Base Warehouse',
          baseWarehouseCode: res.data.baseWarehouseCode || 'BASE-01',
          baseWarehouseAddress: res.data.baseWarehouseAddress || '',
          baseWarehousePhone: res.data.baseWarehousePhone || '+1-800-555-BASE',
          currencySymbol: res.data.currencySymbol || '$',
          supportEmail: res.data.supportEmail || 'support@stocksync.com',
          supportPhone: res.data.supportPhone || '+1-800-555-BASE',
          reorderAlertThreshold: String(res.data.reorderAlertThreshold || 5),
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!canManage) {
      toast.warning('Only administrators and managers have permission to edit business settings.');
      return;
    }

    try {
      setSavingCompany(true);
      const payload = {
        companyName: companySettings.companyName.trim(),
        baseWarehouseName: companySettings.baseWarehouseName.trim(),
        baseWarehouseCode: companySettings.baseWarehouseCode.trim().toUpperCase(),
        baseWarehouseAddress: companySettings.baseWarehouseAddress ? companySettings.baseWarehouseAddress.trim() : '',
        baseWarehousePhone: companySettings.baseWarehousePhone ? companySettings.baseWarehousePhone.trim() : '',
        currencySymbol: companySettings.currencySymbol.trim() || '$',
        supportEmail: companySettings.supportEmail.trim(),
        supportPhone: companySettings.supportPhone.trim(),
        reorderAlertThreshold: parseInt(companySettings.reorderAlertThreshold, 10) || 5,
      };

      const res = await api.put('/settings', payload);
      if (res.data) {
        setCompanySettings({
          companyName: res.data.companyName || '',
          baseWarehouseName: res.data.baseWarehouseName || '',
          baseWarehouseCode: res.data.baseWarehouseCode || '',
          baseWarehouseAddress: res.data.baseWarehouseAddress || '',
          baseWarehousePhone: res.data.baseWarehousePhone || '',
          currencySymbol: res.data.currencySymbol || '$',
          supportEmail: res.data.supportEmail || '',
          supportPhone: res.data.supportPhone || '',
          reorderAlertThreshold: String(res.data.reorderAlertThreshold || 5),
        });
      }
      toast.success('Business and Base Warehouse settings saved successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save settings';
      toast.error(msg);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters';
      setPasswordError(msg);
      toast.warning(msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation do not match';
      setPasswordError(msg);
      toast.warning(msg);
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      const msg = res.data?.message || 'Password changed successfully!';
      setPasswordSuccess(msg);
      toast.success(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-indigo-600" />
          Settings & Configuration
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Business & Base Warehouse Settings</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-emerald-600" />
            Base Warehouse (ID #1)
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading current settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
            {!canManage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You are currently viewing in read-only mode. Only Admins and Managers can edit business settings.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Business Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Base Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={companySettings.baseWarehouseName}
                  onChange={(e) => setCompanySettings({ ...companySettings, baseWarehouseName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Facility Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!canManage}
                  value={companySettings.baseWarehouseCode}
                  onChange={(e) => setCompanySettings({ ...companySettings, baseWarehouseCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={companySettings.currencySymbol}
                  onChange={(e) => setCompanySettings({ ...companySettings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reorder Alert Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  disabled={!canManage}
                  value={companySettings.reorderAlertThreshold}
                  onChange={(e) => setCompanySettings({ ...companySettings, reorderAlertThreshold: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Warehouse Physical Address
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  placeholder="e.g. Me Sang, Prey Veng Province"
                  value={companySettings.baseWarehouseAddress}
                  onChange={(e) => setCompanySettings({ ...companySettings, baseWarehouseAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Warehouse / Contact Phone
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  placeholder="e.g. +855-10-800-994"
                  value={companySettings.baseWarehousePhone}
                  onChange={(e) => setCompanySettings({ ...companySettings, baseWarehousePhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Support Email
                </label>
                <input
                  type="email"
                  disabled={!canManage}
                  value={companySettings.supportEmail}
                  onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Support Phone
                </label>
                <input
                  type="text"
                  disabled={!canManage}
                  value={companySettings.supportPhone}
                  onChange={(e) => setCompanySettings({ ...companySettings, supportPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {canManage && (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCompany ? 'Saving Changes...' : 'Save Business Settings'}</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Account Security (Change Password)</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
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
