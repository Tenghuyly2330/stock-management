import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Warehouse,
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Boxes,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Package,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function Warehouses() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contact_phone: '',
    is_active: true,
  });

  // View Warehouse Inventory Modal
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/warehouses', { params });
      setWarehouses(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWarehouses();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Open Create/Edit modal
  const handleOpenModal = (wh = null) => {
    setError(null);
    if (wh) {
      setEditingWarehouse(wh);
      setFormData({
        name: wh.name,
        code: wh.code,
        address: wh.address || '',
        contact_phone: wh.contact_phone || '',
        is_active: wh.is_active,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        contact_phone: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingWarehouse) {
        await api.put(`/warehouses/${editingWarehouse.id}`, formData);
        setSuccessMsg(`Warehouse '${formData.name}' updated successfully`);
      } else {
        await api.post('/warehouses', formData);
        setSuccessMsg(`Warehouse '${formData.name}' created successfully`);
      }
      handleCloseModal();
      fetchWarehouses();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View warehouse inventory breakdown
  const handleViewInventory = async (wh) => {
    try {
      setSelectedWarehouse(wh);
      setInventoryModalOpen(true);
      setLoadingInventory(true);
      const res = await api.get(`/warehouses/${wh.id}`);
      setSelectedWarehouse(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load warehouse inventory');
    } finally {
      setLoadingInventory(false);
    }
  };

  // Delete or deactivate warehouse
  const handleDelete = async (wh) => {
    if (wh.total_stock_units > 0) {
      alert(`Cannot delete ${wh.name}. It currently holds ${wh.total_stock_units} units of stock. Please transfer or adjust stock first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete or deactivate warehouse '${wh.name}'?`)) {
      return;
    }

    try {
      const res = await api.delete(`/warehouses/${wh.id}`);
      setSuccessMsg(res.data.message || `Warehouse '${wh.name}' deleted`);
      fetchWarehouses();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete warehouse');
    }
  };

  // Calculate high-level stats
  const totalWarehouses = warehouses.length;
  const activeWarehouses = warehouses.filter((w) => w.is_active).length;
  const totalStockUnits = warehouses.reduce((sum, w) => sum + (parseInt(w.total_stock_units, 10) || 0), 0);
  const totalValuation = warehouses.reduce((sum, w) => sum + (parseFloat(w.total_inventory_valuation) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-indigo-600" />
            Warehouse Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage distribution centers, retail stock rooms, and per-facility inventory storage.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </button>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Facilities</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalWarehouses}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Warehouses</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{activeWarehouses}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Units Stored</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalStockUnits.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stored Valuation</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search warehouse name, code, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
          <p className="text-sm">Loading warehouse facilities...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Warehouses Found</h3>
          <p className="text-sm mt-1 text-slate-500">
            {search || statusFilter ? 'Try clearing your search filters' : 'Add your first warehouse to begin tracking stock.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className={`bg-white rounded-xl border transition-shadow hover:shadow-md flex flex-col justify-between overflow-hidden ${
                wh.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="p-5">
                {/* Header: Name + Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 mb-1.5">
                      {wh.code}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{wh.name}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      wh.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {wh.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-600 mt-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{wh.address || 'No physical address provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{wh.contact_phone || 'No phone number'}</span>
                  </div>
                </div>

                {/* Metric Badges */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Products</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{wh.total_unique_products || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Units</p>
                    <p className="text-base font-bold text-indigo-700 mt-0.5">{wh.total_stock_units || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Valuation</p>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      ${parseFloat(wh.total_inventory_valuation || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleViewInventory(wh)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  View Inventory
                </button>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(wh)}
                      title="Edit Warehouse"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(wh)}
                        title="Delete / Deactivate"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">
                {editingWarehouse ? 'Edit Warehouse Facility' : 'Create New Warehouse'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Coast Fulfillment Center"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Warehouse Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. W-WEST or W-SEA"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Unique facility identifier used in logistics ledgers</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <textarea
                  rows="2"
                  placeholder="Street, City, State, ZIP"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+1-800-555-0100"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="wh_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="wh_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Warehouse is operational (Active)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingWarehouse ? 'Update Facility' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Inventory Breakdown Modal */}
      {inventoryModalOpen && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-xl flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-100 text-indigo-800 rounded">
                    {selectedWarehouse.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedWarehouse.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedWarehouse.address || 'No address registered'}</p>
              </div>
              <button
                onClick={() => setInventoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingInventory ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                  <p className="text-sm">Loading stock inventory...</p>
                </div>
              ) : !selectedWarehouse.inventory || selectedWarehouse.inventory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">No inventory currently stored in this warehouse.</p>
                  <p className="text-xs text-slate-400 mt-1">Use the Inventory page to Stock In or Transfer items here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                        <th className="pb-3 pl-2">Product</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3 text-right">Units In Stock</th>
                        <th className="pb-3 text-right">Unit Cost</th>
                        <th className="pb-3 text-right">Total Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedWarehouse.inventory.map((item) => (
                        <tr key={item.inventory_id} className="hover:bg-slate-50">
                          <td className="py-3 pl-2">
                            <div className="font-semibold text-slate-900">{item.product_name}</div>
                            <div className="text-xs text-slate-400 font-mono">SKU: {item.sku}</div>
                          </td>
                          <td className="py-3 text-slate-600 text-xs">{item.category_name}</td>
                          <td className="py-3 text-right">
                            <span
                              className={`font-bold ${
                                item.quantity <= item.min_stock_level ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {item.quantity}
                            </span>
                            {item.quantity <= item.min_stock_level && (
                              <span className="block text-[10px] text-amber-600 font-medium">Low Stock</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-slate-600 font-mono">${parseFloat(item.purchase_price).toFixed(2)}</td>
                          <td className="py-3 text-right font-bold font-mono text-emerald-700">
                            ${parseFloat(item.valuation).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total Units Stored: <strong className="text-slate-900">{selectedWarehouse.total_stock_units}</strong>
              </span>
              <span>
                Total Inventory Valuation:{' '}
                <strong className="text-emerald-700 font-mono">
                  ${parseFloat(selectedWarehouse.total_inventory_valuation || 0).toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
