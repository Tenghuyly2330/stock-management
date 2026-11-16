import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Warehouse,
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  MapPin,
  Phone,
  Search,
  Edit2,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';

export default function WarehousePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Edit Base Warehouse Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '',
    contact_phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Stock to Base Modal
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addSupplier, setAddSupplier] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Fetch Base Warehouse Details (Warehouse 1 is base)
  const fetchBaseWarehouse = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch Warehouse 1 (Base Warehouse)
      const res = await api.get('/warehouses/1');
      if (res.data) {
        setWarehouse(res.data);
        setEditFormData({
          name: res.data.name || 'Main Base Warehouse',
          address: res.data.address || '',
          contact_phone: res.data.contact_phone || '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Base Warehouse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseWarehouse();
    // Load products for quick stock add
    api.get('/products?limit=150&status=active').then((res) => {
      if (res.data) {
        setProductsList(res.data);
      }
    }).catch(console.error);
  }, []);

  // Update Base Warehouse Info
  const handleUpdateWarehouse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.put('/warehouses/1', {
        name: editFormData.name.trim(),
        code: 'BASE-01',
        address: editFormData.address ? editFormData.address.trim() : null,
        contact_phone: editFormData.contact_phone ? editFormData.contact_phone.trim() : null,
      });
      setSuccessMsg('Base Warehouse details updated successfully');
      setIsEditModalOpen(false);
      fetchBaseWarehouse();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update Base Warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Add Stock into Base Warehouse
  const handleQuickAddStock = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/history/add', {
        productId: parseInt(selectedProductId, 10),
        quantity: parseInt(addQty, 10),
        supplierName: addSupplier || 'Approved Supplier',
        notes: addNotes || 'Stock arrival at Base Warehouse',
      });
      setSuccessMsg(`Added ${addQty} units into Base Warehouse`);
      setIsAddStockModalOpen(false);
      setSelectedProductId('');
      setAddQty('');
      setAddSupplier('');
      setAddNotes('');
      fetchBaseWarehouse();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inventoryItems = warehouse?.inventory || [];
  const filteredItems = inventoryItems.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  });

  const totalBaseUnits = inventoryItems.reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 0), 0);
  const totalBaseValuation = inventoryItems.reduce((acc, i) => acc + (parseFloat(i.valuation) || 0), 0);
  const lowStockBaseItems = inventoryItems.filter((i) => i.quantity <= i.min_stock_level).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Base Facility (1 is Base)
            </span>
            <span className="font-mono text-xs font-semibold text-slate-400">Code: BASE-01</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-indigo-600" />
            {warehouse?.name || 'Main Base Warehouse'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Primary storage depot and centralized inventory hub for all farm machinery, equipment, and industrial metals.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddStockModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock to Base</span>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              <span>Edit Base Info</span>
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

      {/* KPI Cards for Base Warehouse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKUs in Base</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{inventoryItems.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Stock Units</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalBaseUnits.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Stock Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              ${totalBaseValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{lowStockBaseItems}</h3>
          </div>
        </div>
      </div>

      {/* Facility Contact & Location Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">{warehouse?.address || '7700 Industrial Parkway, Base Depot, TX'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium">{warehouse?.contact_phone || '+1-800-555-BASE'}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle className="w-3.5 h-3.5" />
          Operational (Active Base)
        </span>
      </div>

      {/* Inventory Stored in Base Warehouse */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Search Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products in Base Warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{filteredItems.length}</strong> items in Base Warehouse
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
            <p className="text-sm">Loading Base Warehouse inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No items found matching search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Units In Base</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Base Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isLow = item.quantity <= item.min_stock_level;
                  const isZero = item.quantity === 0;

                  return (
                    <tr key={item.inventory_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">{item.product_name}</div>
                        <div className="text-xs font-mono text-indigo-600 mt-0.5">SKU: {item.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{item.category_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isZero
                              ? 'bg-rose-50 text-rose-700'
                              : isLow
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isZero ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-bold text-base text-slate-900">{item.quantity}</span>
                        <span className="text-[11px] text-slate-400 block">Min: {item.min_stock_level}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        ${Number(item.purchase_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${Number(item.valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Base Warehouse Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Edit Base Warehouse Information</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateWarehouse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Address
                </label>
                <textarea
                  rows="2"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editFormData.contact_phone}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Base Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Stock Modal */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add Stock into Base Warehouse
              </h3>
              <button onClick={() => setIsAddStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select product to add...</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 10"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Titan Industrial Metals"
                  value={addSupplier}
                  onChange={(e) => setAddSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Arrival Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Invoice or freight receipt reference..."
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStockModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Confirm Stock Addition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

