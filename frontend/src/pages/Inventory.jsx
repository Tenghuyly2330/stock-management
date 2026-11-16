/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Warehouse,
  DollarSign,
  AlertCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function Inventory() {
  const { user } = useAuth();
  const canOperate = ['admin', 'manager', 'staff'].includes(user?.role);
  const canAdjust = ['admin', 'manager'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('matrix');

  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({
    total_items: 0,
    total_quantity: 0,
    total_valuation: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
  });
  const [loadingInv, setLoadingInv] = useState(true);

  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedWh, setSelectedWh] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  const [movementSearch, setMovementSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [movementWh, setMovementWh] = useState('');

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [modalType, setModalType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formProductId, setFormProductId] = useState('');
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formDestWarehouseId, setFormDestWarehouseId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formNewCount, setFormNewCount] = useState('');
  const [formRefType, setFormRefType] = useState('MANUAL_ADJUSTMENT');
  const [formRefId, setFormRefId] = useState('');
  const [formReason, setFormReason] = useState('Physical count cycle audit');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [whRes, catRes, prodRes] = await Promise.all([
          api.get('/warehouses?limit=100'),
          api.get('/categories?status=active'),
          api.get('/products?limit=200&status=active'),
        ]);
        setWarehouses(whRes.data.data || []);
        setCategories(catRes.data.data || []);
        setProductsList(prodRes.data.data || []);
      } catch (err) {
        console.error('Failed to load auxiliary metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoadingInv(true);
      setError(null);
      const params = { limit: 50 };
      if (search) params.search = search;
      if (selectedWh) params.warehouse_id = selectedWh;
      if (selectedCat) params.category_id = selectedCat;
      if (stockStatus) params.stock_status = stockStatus;

      const res = await api.get('/inventory', { params });
      setInventory(res.data.data || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch inventory balances');
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matrix') {
      const timer = setTimeout(() => {
        fetchInventory();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [search, selectedWh, selectedCat, stockStatus, activeTab]);

  const fetchMovements = async () => {
    try {
      setLoadingMovements(true);
      setError(null);
      const params = { limit: 50 };
      if (movementSearch) params.search = movementSearch;
      if (movementType) params.movement_type = movementType;
      if (movementWh) params.warehouse_id = movementWh;

      const res = await api.get('/inventory/movements', { params });
      setMovements(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch movements history');
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'movements') {
      const timer = setTimeout(() => {
        fetchMovements();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [movementSearch, movementType, movementWh, activeTab]);

  const openModal = (type, item = null) => {
    setError(null);
    setModalType(type);
    setFormQuantity('');
    setFormNewCount('');
    setFormRefId('');
    setFormNotes('');
    setFormReason('Physical count cycle audit');

    if (item) {
      setFormProductId(item.product_id.toString());
      setFormWarehouseId(item.warehouse_id.toString());
      setFormDestWarehouseId('');
      if (type === 'ADJUST') {
        setFormNewCount(item.quantity.toString());
      }
    } else {
      setFormProductId(productsList[0]?.id?.toString() || '');
      setFormWarehouseId(warehouses[0]?.id?.toString() || '');
      setFormDestWarehouseId(warehouses[1]?.id?.toString() || '');
    }
  };

  const closeModal = () => {
    setModalType(null);
    setIsSubmitting(false);
  };

  const getCurrentStock = (prodId, whId) => {
    if (!prodId || !whId) return 0;
    const match = inventory.find(
      (i) => i.product_id === parseInt(prodId, 10) && i.warehouse_id === parseInt(whId, 10)
    );
    return match ? match.quantity : 0;
  };

  // Handle Form Submissions
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (modalType === 'STOCK_IN') {
        const res = await api.post('/inventory/stock-in', {
          productId: parseInt(formProductId, 10),
          warehouseId: parseInt(formWarehouseId, 10),
          quantity: parseInt(formQuantity, 10),
          referenceType: formRefType,
          referenceId: formRefId,
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Stock In recorded successfully');
      } else if (modalType === 'STOCK_OUT') {
        const res = await api.post('/inventory/stock-out', {
          productId: parseInt(formProductId, 10),
          warehouseId: parseInt(formWarehouseId, 10),
          quantity: parseInt(formQuantity, 10),
          referenceType: formRefType,
          referenceId: formRefId,
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Stock Out recorded successfully');
      } else if (modalType === 'TRANSFER') {
        const res = await api.post('/inventory/transfer', {
          productId: parseInt(formProductId, 10),
          sourceWarehouseId: parseInt(formWarehouseId, 10),
          destinationWarehouseId: parseInt(formDestWarehouseId, 10),
          quantity: parseInt(formQuantity, 10),
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Stock transfer executed successfully');
      } else if (modalType === 'ADJUST') {
        const res = await api.post('/inventory/adjust', {
          productId: parseInt(formProductId, 10),
          warehouseId: parseInt(formWarehouseId, 10),
          newQuantity: parseInt(formNewCount, 10),
          reason: formReason,
          notes: formNotes,
        });
        setSuccessMsg(res.data.message || 'Inventory adjustment reconciled successfully');
      }

      closeModal();
      fetchInventory();
      if (activeTab === 'movements') {
        fetchMovements();
      }
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAvailableStock = getCurrentStock(formProductId, formWarehouseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-indigo-600" />
            Inventory & Stock Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-warehouse inventory matrix, double-entry transfer routes, and immutable audit ledger.
          </p>
        </div>

        {canOperate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openModal('STOCK_IN')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Stock In
            </button>
            <button
              onClick={() => openModal('STOCK_OUT')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <MinusCircle className="w-4 h-4" />
              Stock Out
            </button>
            <button
              onClick={() => openModal('TRANSFER')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer Stock
            </button>
            {canAdjust && (
              <button
                onClick={() => openModal('ADJUST')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Adjust Count
              </button>
            )}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units Stored</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_quantity.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inventory Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              ${parseFloat(stats.total_valuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-0.5">{stats.low_stock_count}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Out of Stock Items</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-0.5">{stats.out_of_stock_count}</h3>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Live Stock Matrix
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'movements'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            Stock Movement Audit Ledger
          </button>
        </div>
      </div>

      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product, SKU, barcode, warehouse..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedWh}
                onChange={(e) => setSelectedWh(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Stock Levels</option>
                <option value="in_stock">In Stock (Optimal)</option>
                <option value="low_stock">Low Stock (At / below min)</option>
                <option value="out_of_stock">Out of Stock (Zero)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingInv ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                <p className="text-sm">Loading stock inventory balances...</p>
              </div>
            ) : inventory.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Inventory Records Found</h3>
                <p className="text-sm mt-1 text-slate-500">
                  {search || selectedWh || selectedCat || stockStatus
                    ? 'Try clearing your search filters'
                    : 'Use the Stock In button above to receive inventory into a warehouse.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4 text-center">Stock Level</th>
                      <th className="py-3 px-4 text-right">Available Qty</th>
                      <th className="py-3 px-4 text-right">Reorder Threshold</th>
                      <th className="py-3 px-4 text-right">Total Valuation</th>
                      <th className="py-3 px-4 text-right">Row Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((row) => {
                      const isLowStock = row.quantity > 0 && row.quantity <= row.min_stock_level;
                      const isOutOfStock = row.quantity === 0;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {row.image_url ? (
                                  <img src={row.image_url} alt={row.product_name} className="w-full h-full object-cover" />
                                ) : (
                                  <Boxes className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">{row.product_name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">SKU: {row.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{row.category_name}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 text-xs">{row.warehouse_name}</div>
                            <span className="inline-block px-1.5 py-0.2 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded">
                              {row.warehouse_code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                                <XCircle className="w-3.5 h-3.5" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`text-base font-bold ${
                                isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {row.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-slate-500">
                            Min: {row.min_stock_level}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            ${parseFloat(row.valuation || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {canOperate && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openModal('STOCK_IN', row)}
                                  title="Stock In to this facility"
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openModal('STOCK_OUT', row)}
                                  title="Stock Out from this facility"
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                >
                                  <MinusCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openModal('TRANSFER', row)}
                                  title="Transfer to another warehouse"
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-4 h-4" />
                                </button>
                                {canAdjust && (
                                  <button
                                    onClick={() => openModal('ADJUST', row)}
                                    title="Adjust physical audit count"
                                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                                  >
                                    <SlidersHorizontal className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            )}
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
      )}

      {/* TAB 2: AUDIT MOVEMENT LEDGER */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, reference, notes..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Movement Types</option>
                <option value="IN">Stock In (Receipts)</option>
                <option value="OUT">Stock Out (Dispatches)</option>
                <option value="TRANSFER">Transfers (Inter-Warehouse)</option>
                <option value="ADJUSTMENT">Adjustments (Audits)</option>
              </select>

              <select
                value={movementWh}
                onChange={(e) => setMovementWh(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Movements Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {loadingMovements ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                <p className="text-sm">Loading audit movement ledger...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No Stock Movements Logged</h3>
                <p className="text-sm mt-1 text-slate-500">
                  {movementSearch || movementType || movementWh
                    ? 'No records match the active filters'
                    : 'Stock movements will appear here automatically when stock is modified.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Logistics Route</th>
                      <th className="py-3 px-4 text-right">Units</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Audit Notes</th>
                      <th className="py-3 px-4">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((m) => {
                      const isTransfer = m.movement_type === 'TRANSFER';
                      const isIn = m.movement_type === 'IN';
                      const isOut = m.movement_type === 'OUT';
                      const isAdj = m.movement_type === 'ADJUSTMENT';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                            <div className="font-medium text-slate-800">
                              {new Date(m.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isIn && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                IN
                              </span>
                            )}
                            {isOut && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                OUT
                              </span>
                            )}
                            {isTransfer && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                TRANSFER
                              </span>
                            )}
                            {isAdj && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700">
                                <RefreshCw className="w-3.5 h-3.5" />
                                ADJUST
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 text-xs">{m.product_name}</div>
                            <div className="text-[11px] text-slate-400">SKU: {m.product_sku}</div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {isTransfer ? (
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="text-slate-700">{m.source_warehouse_code}</span>
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <span className="text-indigo-700">{m.destination_warehouse_code}</span>
                              </div>
                            ) : isIn ? (
                              <span className="text-emerald-700 font-medium">To: {m.destination_warehouse_code || 'Warehouse'}</span>
                            ) : isOut ? (
                              <span className="text-rose-700 font-medium">From: {m.source_warehouse_code || 'Warehouse'}</span>
                            ) : (
                              <span className="text-purple-700 font-medium">
                                At: {m.destination_warehouse_code || m.source_warehouse_code || 'Warehouse'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-mono font-bold text-sm ${
                                isIn ? 'text-emerald-700' : isOut ? 'text-rose-700' : 'text-slate-900'
                              }`}
                            >
                              {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs font-semibold text-slate-800">{m.reference_id || '—'}</div>
                            <div className="text-[10px] text-slate-400">{m.reference_type}</div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate" title={m.notes}>
                            {m.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{m.created_by_name || 'System Admin'}</div>
                            <div className="text-[10px] text-slate-400">{m.created_by_email || ''}</div>
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
      )}

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/75">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {modalType === 'STOCK_IN' && <PlusCircle className="w-5 h-5 text-emerald-600" />}
                {modalType === 'STOCK_OUT' && <MinusCircle className="w-5 h-5 text-rose-600" />}
                {modalType === 'TRANSFER' && <ArrowLeftRight className="w-5 h-5 text-blue-600" />}
                {modalType === 'ADJUST' && <SlidersHorizontal className="w-5 h-5 text-purple-600" />}
                {modalType === 'STOCK_IN' && 'Stock In (Receive Inventory)'}
                {modalType === 'STOCK_OUT' && 'Stock Out (Dispatch Inventory)'}
                {modalType === 'TRANSFER' && 'Inter-Warehouse Stock Transfer'}
                {modalType === 'ADJUST' && 'Cycle Count Audit Adjustment'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product *
                </label>
                <select
                  required
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a product...</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {modalType === 'STOCK_IN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Destination Warehouse *
                  </label>
                  <select
                    required
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select receiving warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'STOCK_OUT' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Source Warehouse *
                    </label>
                    <span className="text-xs text-slate-500">
                      Available Stock: <strong className="text-indigo-600">{currentAvailableStock} units</strong>
                    </span>
                  </div>
                  <select
                    required
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select dispatch warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'TRANSFER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      From Source Warehouse *
                    </label>
                    <select
                      required
                      value={formWarehouseId}
                      onChange={(e) => setFormWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select source...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code} - {w.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">Available: {currentAvailableStock} units</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      To Destination Warehouse *
                    </label>
                    <select
                      required
                      value={formDestWarehouseId}
                      onChange={(e) => setFormDestWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select destination...</option>
                      {warehouses
                        .filter((w) => w.id.toString() !== formWarehouseId)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {modalType === 'ADJUST' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Warehouse Location *
                    </label>
                    <span className="text-xs text-slate-500">
                      System Count: <strong className="text-indigo-600">{currentAvailableStock} units</strong>
                    </span>
                  </div>
                  <select
                    required
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select facility...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity Input for IN, OUT, TRANSFER */}
              {modalType !== 'ADJUST' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to {modalType === 'STOCK_IN' ? 'Receive' : modalType === 'STOCK_OUT' ? 'Deduct' : 'Transfer'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 25"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {modalType === 'STOCK_OUT' && parseInt(formQuantity, 10) > currentAvailableStock && (
                    <p className="text-xs text-rose-600 mt-1">
                      Warning: Requested quantity ({formQuantity}) exceeds available stock ({currentAvailableStock}).
                    </p>
                  )}
                </div>
              )}

              {/* Direct Count Input for ADJUST */}
              {modalType === 'ADJUST' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Verified Physical Count *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={formNewCount}
                    onChange={(e) => setFormNewCount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formNewCount !== '' && !isNaN(parseInt(formNewCount, 10)) && (
                    <p className="text-xs mt-1 font-medium text-slate-600">
                      Delta:{' '}
                      <span
                        className={
                          parseInt(formNewCount, 10) - currentAvailableStock > 0
                            ? 'text-emerald-600'
                            : parseInt(formNewCount, 10) - currentAvailableStock < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }
                      >
                        {parseInt(formNewCount, 10) - currentAvailableStock > 0 ? '+' : ''}
                        {parseInt(formNewCount, 10) - currentAvailableStock} units
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Reference ID / Reason */}
              {modalType === 'ADJUST' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Adjustment Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Reference Type
                    </label>
                    <select
                      value={formRefType}
                      onChange={(e) => setFormRefType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                      {modalType === 'STOCK_IN' && <option value="PURCHASE_ORDER">Purchase Order</option>}
                      {modalType === 'STOCK_IN' && <option value="INITIAL_STOCK">Initial Stock</option>}
                      {modalType === 'STOCK_OUT' && <option value="SALES_ORDER">Sales Order</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Reference # (PO/SO)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-8921 or SO-102"
                      value={formRefId}
                      onChange={(e) => setFormRefId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Notes / Remarks
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional logistics or inspection notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                    modalType === 'STOCK_IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : modalType === 'STOCK_OUT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : modalType === 'TRANSFER'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : modalType === 'STOCK_IN'
                    ? 'Confirm Stock In'
                    : modalType === 'STOCK_OUT'
                    ? 'Confirm Stock Out'
                    : modalType === 'TRANSFER'
                    ? 'Execute Transfer'
                    : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

