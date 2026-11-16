import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Boxes, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import ConnectionBadge from '../components/common/ConnectionBadge';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both your email address and password.');
      toast.warning('Please provide both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully! Welcome to StockSync.');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || 'Authentication failed. Please verify your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      {/* <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ConnectionBadge />
      </div> */}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <Boxes className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          HouseStock
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Sign in to your stock and warehouse management account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-10 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Quick-Fill Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@gmail.com', '123456')}
                className="flex flex-col items-center p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition"
              >
                <span>Admin</span>
                <span className="text-[10px] font-normal text-indigo-600">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@gmail.com', '123456')}
                className="flex flex-col items-center p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold transition"
              >
                <span>Manager</span>
                <span className="text-[10px] font-normal text-amber-600">Warehouse</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@gmail.com', '123456')}
                className="flex flex-col items-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <span>Staff</span>
                <span className="text-[10px] font-normal text-slate-500">Scanning</span>
              </button>
            </div>
          </div>
        </div>

        {/* <p className="mt-4 text-center text-xs text-slate-400">
          Protected by Bcrypt 10-round salt & JWT 24h Bearer authentication.
        </p> */}
      </div>
    </div>
  );
}

