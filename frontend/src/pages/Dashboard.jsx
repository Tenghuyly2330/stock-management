import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  Warehouse,
  History,
  Layers,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';
import api from '../api/axios';
import {Helmet} from 'react-helmet-async';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalBaseUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    recentHistory: [],
    categories: [],
    loading: true,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [prodsRes, catsRes, historyRes, whRes] = await Promise.allSettled([
          api.get('/products?limit=150'),
          api.get('/categories?status=active'),
          api.get('/history?limit=6'),
          api.get('/warehouses/1'),
        ]);

        const prods = prodsRes.status === 'fulfilled' && prodsRes.value.data ? prodsRes.value.data : [];
        const cats = catsRes.status === 'fulfilled' && catsRes.value.data ? catsRes.value.data : [];
        const historyData = historyRes.status === 'fulfilled' && historyRes.value.data ? historyRes.value.data : [];
        const baseWh = whRes.status === 'fulfilled' && whRes.value.data ? whRes.value.data : null;

        const totalUnits = baseWh?.total_stock_units || prods.reduce((sum, p) => sum + (p.current_stock || 0), 0);
        const totalVal = baseWh?.total_inventory_valuation || prods.reduce((sum, p) => sum + (p.current_stock || 0) * (parseFloat(p.purchase_price) || 0), 0);
        const lowCount = prods.filter((p) => p.stock_badge === 'LOW_STOCK' || p.stock_badge === 'OUT_OF_STOCK').length;

        setDashboardData({
          totalProducts: prods.length,
          totalBaseUnits: totalUnits,
          totalValuation: totalVal,
          lowStockCount: lowCount,
          recentHistory: historyData,
          categories: cats,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setDashboardData((prev) => ({ ...prev, loading: false }));
      }
    }

    loadDashboard();
  }, []);

  return (

    
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard | HouseStock</title>
      </Helmet>
      <div className="rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Record Sale (Buy)</span>
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition border border-white/15"
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Catalog SKUs"
          value={dashboardData.totalProducts}
          icon={Package}
          color="blue"
          trend={{ isPositive: true, text: 'Machinery & Metals' }}
          // subtitle="Catalog Product Records"
        />
        <StatusCard
          title="Units in Base Warehouse"
          value={dashboardData.totalBaseUnits.toLocaleString()}
          icon={Boxes}
          color="emerald"
          trend={{ isPositive: true, text: 'BASE-01' }}
        />
        <StatusCard
          title="Inventory Valuation"
          value={`$${parseFloat(dashboardData.totalValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="purple"
          trend={{ isPositive: true, text: 'Cost Basis' }}
        />
        <StatusCard
          title="Low Stock Warnings"
          value={dashboardData.lowStockCount}
          icon={AlertTriangle}
          color="rose"
          trend={{ isPositive: false, text: 'Needs Reorder' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Recent Transactions (Who Bought & Added)
                </h3>
              </div>
              <Link
                to="/history"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Full History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {dashboardData.recentHistory.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No transaction history recorded yet.
                </div>
              ) : (
                dashboardData.recentHistory.slice(0, 5).map((row) => {
                  const isBuy = row.action === 'BUY' || row.movement_type === 'OUT';

                  return (
                    <div key={row.id} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isBuy ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{row.product_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-medium text-slate-800">
                              {isBuy ? `Customer: ${row.party_name || 'Customer'}` : `Supplier: ${row.party_name || 'Vendor'}`}
                            </span>
                            <span>•</span>
                            <span>{new Date(row.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-bold text-sm ${
                            isBuy ? 'text-indigo-700' : 'text-emerald-700'
                          }`}
                        >
                          {isBuy ? `-${row.quantity}` : `+${row.quantity}`}
                        </div>
                        <div className="text-xs font-semibold text-slate-900">
                          ${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Transactions are permanently preserved in the PostgreSQL movement ledger.
            </span>
            <Link
              to="/history"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All History →
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-indigo-600" />
                Base Warehouse (1 is Base)
              </h3>
              <span className="text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                BASE-01
              </span>
            </div>
    
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Stored Units:</span>
              <strong className="text-slate-900 text-sm">{dashboardData.totalBaseUnits}</strong>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Valuation:</span>
              <strong className="text-emerald-700 text-sm">
                ${parseFloat(dashboardData.totalValuation || 0).toLocaleString()}
              </strong>
            </div>
            <Link
              to="/warehouse"
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
            >
              <span>Manage Base Warehouse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Categories Quick List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Categories
              </h3>
              <Link to="/categories" className="text-xs font-semibold text-indigo-600 hover:underline">
                Manage
              </Link>
            </div>
            <div className="space-y-2">
              {dashboardData.categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                  <span className="font-medium text-slate-800">{cat.name}</span>
                  <span className="text-slate-500 ">{cat.product_count || 0} items</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
