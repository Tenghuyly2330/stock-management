import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { Database, Server, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ConnectionBadge() {
  const [status, setStatus] = useState({
    loading: true,
    apiOk: false,
    dbOk: false,
    latency: null,
    serverTime: null,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get('/health/db');
      if (res.success && res.data) {
        setStatus({
          loading: false,
          apiOk: true,
          dbOk: true,
          latency: res.data.latency,
          serverTime: res.data.serverTime,
          error: null,
        });
      } else {
        throw new Error(res.message || 'Health check returned unsuccessful');
      }
    } catch (err) {
      setStatus({
        loading: false,
        apiOk: false,
        dbOk: false,
        latency: null,
        serverTime: null,
        error: err.message || 'Cannot connect to backend server',
      });
    }
  }, []);

  useEffect(() => {
    checkConnection();
    // Poll every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          status.loading
            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : status.dbOk
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
      >
        <span className="relative flex h-2 w-2">
          {status.dbOk && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status.loading ? 'bg-slate-400' : status.dbOk ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          ></span>
        </span>

        <span className="flex items-center gap-1">
          <Database className="w-3.5 h-3.5" />
          <span>
            {status.loading
              ? 'Checking System...'
              : status.dbOk
              ? `DB Connected (${status.latency})`
              : 'DB Offline'}
          </span>
        </span>
      </div>

      <button
        onClick={checkConnection}
        disabled={status.loading}
        title="Refresh Connection Status"
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
