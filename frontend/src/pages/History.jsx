import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import {
  History as HistoryIcon,
  ShoppingCart,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  DollarSign,
  User,
  AlertCircle,
  X,
  Building,
  Phone,
  RefreshCw,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';

export default function History() {
  const [searchParams] = useSearchParams();

  const [historyList, setHistoryList] = useState([]);
  const [stats, setStats] = useState({
    total_added_units: 0,
    total_bought_units: 0,
    total_bought_value: 0,
    total_added_value: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ADD' | 'BUY'
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Synchronize with URL query parameter
  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearch(query);
    }
  }, [searchParams]);

  // Fetch History (Automated Log)
  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 150 };
      if (activeTab !== 'ALL') params.type = activeTab;
      if (search) params.search = search;

      const res = await api.get('/history', { params });
      setHistoryList(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history records');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP BANNER (Automated Live Activity Ledger)                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Automated Live Ledger
            </span>
            <span className="text-xs text-slate-400 font-medium">Base Warehouse (BASE-01)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <HistoryIcon className="w-7 h-7 text-indigo-600" />
            Transaction History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automatically logs every customer purchase (via Cart) and every product added or restocked by the owner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Refresh History Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Log</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STATS KPI CARDS                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Products Bought (Sold)"
          value={stats.total_bought_units.toLocaleString()}
          icon={ShoppingCart}
          color="blue"
          trend={{ isPositive: true, text: 'Sales' }}
          subtitle="Units purchased by customers"
        />
        <StatusCard
          title="Total Sales Revenue"
          value={`$${parseFloat(stats.total_bought_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="emerald"
          trend={{ isPositive: true, text: 'Revenue' }}
          subtitle="Customer purchase volume"
        />
        <StatusCard
          title="Owner Added (Restocks)"
          value={stats.total_added_units.toLocaleString()}
          icon={Boxes}
          color="purple"
          trend={{ isPositive: true, text: 'Restocked' }}
          subtitle="Units added to base stock"
        />
        <StatusCard
          title="Procurement Spend"
          value={`$${parseFloat(stats.total_added_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="amber"
          trend={{ isPositive: false, text: 'Cost Basis' }}
          subtitle="Total spent procuring stock"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER TABS & SEARCH BAR                                               */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Activity ({historyList.length})
          </button>
          <button
            onClick={() => setActiveTab('BUY')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BUY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Customer Purchases (Bought)</span>
          </button>
          <button
            onClick={() => setActiveTab('ADD')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ADD'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Owner Restocks (Added)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer phone, name, product, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TRANSACTION LOG TABLE                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading transaction history...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HistoryIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-base font-semibold text-slate-700">No Transactions Found</h3>
            <p className="text-sm mt-1 text-slate-500">
              {search
                ? 'No transactions matched your search criteria.'
                : 'Activity will automatically appear here when customers buy products or when the owner adds stock.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4 text-right">Units</th>
                  <th className="py-3 px-4">Customer / Supplier</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Processed By</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((row) => {
                  const isBuy = row.action === 'BUY' || row.movement_type === 'OUT';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Type: BOUGHT or ADDED */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isBuy ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            BOUGHT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            ADDED
                          </span>
                        )}
                      </td>

                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">{row.product_name}</div>
                        <div className="text-xs font-mono text-indigo-600 mt-0.5">{row.product_sku}</div>
                      </td>

                      {/* Quantity Units */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isBuy ? 'text-indigo-700' : 'text-emerald-700'
                          }`}
                        >
                          {isBuy ? `-${row.quantity}` : `+${row.quantity}`} units
                        </span>
                      </td>

                      {/* Customer / Supplier with Phone Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          {isBuy ? (
                            <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Building className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span>
                            {row.customer_name || row.party_name || (isBuy ? 'Walk-in Customer' : 'Owner / Supplier')}
                          </span>
                        </div>

                        {isBuy && row.customer_phone ? (
                          <button
                            onClick={() => setSearch(row.customer_phone)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-colors"
                            title="Click to search all orders by this phone number"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{row.customer_phone}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase mt-0.5 block">
                            {isBuy ? 'Customer' : 'Owner / Supplier'}
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {row.unit_price && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            @ ${parseFloat(row.unit_price).toFixed(2)}/ea
                          </span>
                        )}
                      </td>

                      {/* Processed By User */}
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{row.user_name || 'System Admin'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{row.user_email || ''}</span>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate" title={row.notes}>
                        {row.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
