import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  History as HistoryIcon,
  PlusCircle,
  ShoppingCart,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  DollarSign,
  User,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  Layers,
  Building,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';

export default function History() {
  const { user } = useAuth();
  const canOperate = ['admin', 'manager', 'staff'].includes(user?.role);

  const [historyList, setHistoryList] = useState([]);
  const [stats, setStats] = useState({
    total_added_units: 0,
    total_bought_units: 0,
    total_bought_value: 0,
    total_added_value: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ADD' | 'BUY'
  const [search, setSearch] = useState('');

  // Dropdown products
  const [products, setProducts] = useState([]);

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'BUY' | 'ADD' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formProductId, setFormProductId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formPartyName, setFormPartyName] = useState(''); // Customer Name (for BUY) or Supplier Name (for ADD)
  const [formPrice, setFormPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load products list for modals
  useEffect(() => {
    api.get('/products?limit=200&status=active').then((res) => {
      if (res.data) setProducts(res.data);
    }).catch(console.error);
  }, []);

  // Fetch History
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 100 };
      if (activeTab !== 'ALL') params.type = activeTab;
      if (search) params.search = search;

      const res = await api.get('/history', { params });
      setHistoryList(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, search]);

  // Open Modal
  const openModal = (mode) => {
    setModalMode(mode);
    setFormProductId(products[0]?.id?.toString() || '');
    setFormQuantity('');
    setFormPartyName('');
    setFormPrice('');
    setFormNotes('');
    setError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setIsSubmitting(false);
  };

  // When product changes, pre-fill price
  const handleProductChange = (prodId) => {
    setFormProductId(prodId);
    const selected = products.find((p) => String(p.id) === String(prodId));
    if (selected) {
      if (modalMode === 'BUY') {
        setFormPrice(selected.selling_price || '');
      } else {
        setFormPrice(selected.purchase_price || '');
      }
    }
  };

  // Submit Buy or Add
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (modalMode === 'BUY') {
        // Customer buys product
        const res = await api.post('/history/buy', {
          productId: parseInt(formProductId, 10),
          quantity: parseInt(formQuantity, 10),
          customerName: formPartyName.trim(),
          unitPrice: formPrice ? parseFloat(formPrice) : undefined,
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Customer purchase recorded successfully');
      } else if (modalMode === 'ADD') {
        // Add product stock
        const res = await api.post('/history/add', {
          productId: parseInt(formProductId, 10),
          quantity: parseInt(formQuantity, 10),
          supplierName: formPartyName.trim(),
          unitCost: formPrice ? parseFloat(formPrice) : undefined,
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Product stock addition recorded successfully');
      }

      closeModal();
      fetchHistory();
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProductObj = products.find((p) => String(p.id) === String(formProductId));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <HistoryIcon className="w-7 h-7 text-indigo-600" />
            Transaction History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track who bought products (customers & sales) and who added products (arrivals & suppliers) with user audit records.
          </p>
        </div>

        {canOperate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('BUY')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Record Customer Purchase</span>
            </button>
            <button
              onClick={() => openModal('ADD')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Stock Arrival</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
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
          title="Products Added (Stock In)"
          value={stats.total_added_units.toLocaleString()}
          icon={Boxes}
          color="purple"
          trend={{ isPositive: true, text: 'Procured' }}
          subtitle="Units received into base"
        />
        <StatusCard
          title="Stock Procurement Spend"
          value={`$${parseFloat(stats.total_added_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="rose"
          trend={{ isPositive: false, text: 'Cost Basis' }}
          subtitle="Total spent adding inventory"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
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
            All History ({historyList.length})
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
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Stock Arrivals (Added)</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search product, customer, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading history records...</p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <HistoryIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-base font-semibold text-slate-700">No History Records Found</h3>
            <p className="text-sm mt-1 text-slate-500">
              {search ? 'Try clearing your search term' : 'Record your first customer purchase or stock addition above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4">Customer / Supplier</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Handled By User</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((row) => {
                  const isBuy = row.action === 'BUY' || row.movement_type === 'OUT';
                  const isAdd = row.action === 'ADD' || row.movement_type === 'IN';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">{row.product_name}</div>
                        <div className="text-xs font-mono text-indigo-600 mt-0.5">{row.product_sku}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isBuy ? 'text-indigo-700' : 'text-emerald-700'
                          }`}
                        >
                          {isBuy ? `-${row.quantity}` : `+${row.quantity}`} units
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 text-xs">
                          {row.party_name || (isBuy ? 'Walk-in Customer' : 'Approved Supplier')}
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {isBuy ? 'Buyer / Customer' : 'Vendor / Supplier'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {row.unit_price && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            @ ${parseFloat(row.unit_price).toFixed(2)}/ea
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{row.user_name || 'System Admin'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{row.user_email || ''}</span>
                      </td>

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

      {/* ========================================================================= */}
      {/* RECORD CUSTOMER PURCHASE (BUY) OR STOCK ARRIVAL (ADD) MODAL              */}
      {/* ========================================================================= */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {modalMode === 'BUY' ? (
                  <>
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                    Record Customer Purchase (Sale)
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    Add Product Stock Arrival
                  </>
                )}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product *
                </label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Party Name (Customer or Supplier) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {modalMode === 'BUY' ? 'Customer / Buyer Name *' : 'Supplier / Vendor Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={modalMode === 'BUY' ? 'e.g. Miller Cattle Ranch' : 'e.g. Apex Industrial Metals'}
                  value={formPartyName}
                  onChange={(e) => setFormPartyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'BUY' ? 'Selling Price ($)' : 'Purchase Cost ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price per unit"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              {formQuantity && formPrice && !isNaN(parseFloat(formQuantity)) && !isNaN(parseFloat(formPrice)) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Total Transaction Amount:</span>
                  <span className="font-mono font-bold text-base text-slate-900">
                    ${(parseFloat(formQuantity) * parseFloat(formPrice)).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Invoice Reference
                </label>
                <textarea
                  rows="2"
                  placeholder="Receipt #, delivery details, payment method..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 ${
                    modalMode === 'BUY'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : modalMode === 'BUY'
                    ? 'Confirm Customer Purchase'
                    : 'Confirm Stock Addition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
