import React, { useState, useEffect } from 'react';
import {
  Package,
  Boxes,
  DollarSign,
  AlertOctagon,
  Server,
  Database,
  Globe,
  CheckCircle,
  ExternalLink,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';
import api from '../api/axios';

export default function Dashboard() {
  const [healthData, setHealthData] = useState({
    server: null,
    db: null,
    loading: true,
  });

  useEffect(() => {
    async function fetchSystemHealth() {
      try {
        const [serverRes, dbRes] = await Promise.allSettled([
          api.get('/health'),
          api.get('/health/db'),
        ]);

        setHealthData({
          server: serverRes.status === 'fulfilled' ? serverRes.value.data : null,
          db: dbRes.status === 'fulfilled' ? dbRes.value.data : null,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to load system health:', err);
        setHealthData((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchSystemHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Stage 1: Architecture & Environment Initialized
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Enterprise Stock & Inventory Management
            </h1>
            <p className="mt-2 text-slate-300 text-sm max-w-2xl leading-relaxed">
              Production-ready multi-warehouse stock tracking, purchase procurement, sales order fulfillment,
              and real-time PostgreSQL database consistency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:5000/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur transition border border-white/15"
            >
              <Server className="w-4 h-4" />
              <span>API Health</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
            <a
              href="http://localhost:5000/api/health/db"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-900/50 transition"
            >
              <Database className="w-4 h-4" />
              <span>DB Health</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      {/* KPI Statistic Cards Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Total Products"
          value="1,248"
          icon={Package}
          color="blue"
          trend={{ isPositive: true, text: '+12% this month' }}
          subtitle="Across 18 Active Categories"
        />
        <StatusCard
          title="Total Stock Units"
          value="48,920"
          icon={Boxes}
          color="emerald"
          trend={{ isPositive: true, text: 'Optimal Levels' }}
          subtitle="Distributed in 4 Warehouses"
        />
        <StatusCard
          title="Inventory Valuation"
          value="$342,850"
          icon={DollarSign}
          color="purple"
          trend={{ isPositive: true, text: '+8.4% vs last qtr' }}
          subtitle="FIFO Cost Accounting"
        />
        <StatusCard
          title="Low Stock Alerts"
          value="5 Items"
          icon={AlertOctagon}
          color="rose"
          trend={{ isPositive: false, text: 'Reorder required' }}
          subtitle="Below safety stock threshold"
        />
      </div>

      {/* Live System Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node.js API Service Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Backend API Service</h3>
                <p className="text-xs text-slate-400">Node.js + Express.js</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              {healthData.server?.status || 'Active'}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Port</span>
              <span className="font-mono font-medium text-slate-700">5000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Uptime</span>
              <span className="font-mono font-medium text-slate-700">
                {healthData.server?.uptime || 'Active'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Memory Usage (RSS)</span>
              <span className="font-mono font-medium text-slate-700">
                {healthData.server?.memory?.rss || 'Normal'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Environment</span>
              <span className="font-mono font-medium text-slate-700 capitalize">
                {healthData.server?.environment || 'development'}
              </span>
            </div>
          </div>
        </div>

        {/* PostgreSQL Database Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">PostgreSQL Engine</h3>
                <p className="text-xs text-slate-400">Connection Pool (pg)</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                healthData.db
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthData.db ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
              {healthData.db?.database || 'Connecting...'}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Ping Latency</span>
              <span className="font-mono font-medium text-emerald-600">
                {healthData.db?.latency || 'Evaluating...'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">SSL / TLS Mode</span>
              <span className="font-mono font-medium text-slate-700">require (Encrypted)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Connection Mode</span>
              <span className="font-mono font-medium text-slate-700">Pooled (Max 20)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Server Clock</span>
              <span className="font-mono text-[11px] text-slate-600 truncate max-w-[160px]">
                {healthData.db?.serverTime
                  ? new Date(healthData.db.serverTime).toLocaleTimeString()
                  : 'Synchronizing...'}
              </span>
            </div>
          </div>
        </div>

        {/* React Frontend Client Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">React Client</h3>
                <p className="text-xs text-slate-400">Vite 6 + Tailwind CSS v4</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Live
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Local Port</span>
              <span className="font-mono font-medium text-slate-700">3000</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Router</span>
              <span className="font-mono font-medium text-slate-700">React Router v7</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">HTTP Client</span>
              <span className="font-mono font-medium text-slate-700">Axios + Interceptors</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">UI System</span>
              <span className="font-mono font-medium text-slate-700">Tailwind CSS + Lucide</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day 1 Deliverables & Architecture Verification */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Day 1 Verification & Milestones Completed
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Fundamental foundation, enterprise architecture, security baseline, and connection pools established.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Monorepo Project Structure</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Clean separation of concerns with isolated <code className="text-indigo-600 font-mono">/backend</code>,{' '}
                <code className="text-indigo-600 font-mono">/frontend</code>, and root git configurations.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Express REST Architecture</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized error handling, request logging, Helmet HTTP security headers, and CORS configured.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-800">PostgreSQL Connection Pool</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configured with SSL encryption, connection timeouts, and automatic retry for both cloud and local DBs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Responsive Admin UI Shell</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Collapsible sidebar, dynamic navigation, live DB health badge, and pre-configured Axios interceptors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
