import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Barcode,
  Layers,
  DollarSign,
  AlertTriangle,
  Boxes,
  Percent,
  Warehouse,
  ExternalLink,
  X,
  AlertCircle,
  Sparkles,
  Eye,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('DESC');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [warehouseDetails, setWarehouseDetails] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Product Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    sku: '',
    barcode: '',
    description: '',
    imageUrl: '',
    purchasePrice: '',
    sellingPrice: '',
    minStockLevel: '10',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (stockStatus) params.append('stock_status', stockStatus);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortDir) params.append('sort_dir', sortDir);

      const [prodsRes, catsRes] = await Promise.all([
        api.get(`/products?${params.toString()}`),
        api.get('/categories?status=active'),
      ]);

      if (prodsRes.success) {
        setProducts(prodsRes.data);
      }
      if (catsRes.success) {
        setCategories(catsRes.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, stockStatus, sortBy, sortDir]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // SKU and Barcode generator triggers
  const handleAutoGenerateSKU = () => {
    const selectedCatObj = categories.find((c) => String(c.id) === String(formData.categoryId));
    const catName = selectedCatObj ? selectedCatObj.name : 'PRD';
    const prefix = catName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'PRD';
    const timestamp = Date.now().toString().slice(-5);
    const rand = Math.floor(Math.random() * 900 + 100);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${timestamp}-${rand}` }));
  };

  const handleAutoGenerateBarcode = () => {
    const rand = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
    setFormData((prev) => ({ ...prev, barcode: `890${rand.substring(0, 10)}` }));
  };

  // Real-time margin calculator for form preview
  const formCost = parseFloat(formData.purchasePrice) || 0;
  const formSell = parseFloat(formData.sellingPrice) || 0;
  const formMargin = formSell > 0 ? (((formSell - formCost) / formSell) * 100).toFixed(1) : '0.0';

  // Create Product Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.post('/products', {
        name: formData.name,
        categoryId: parseInt(formData.categoryId, 10),
        sku: formData.sku,
        barcode: formData.barcode,
        description: formData.description,
        imageUrl: formData.imageUrl,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        minStockLevel: parseInt(formData.minStockLevel, 10) || 10,
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          categoryId: '',
          sku: '',
          barcode: '',
          description: '',
          imageUrl: '',
          purchasePrice: '',
          sellingPrice: '',
          minStockLevel: '10',
        });
        fetchProducts();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Product Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.put(`/products/${selectedProduct.id}`, {
        name: formData.name,
        categoryId: parseInt(formData.categoryId, 10),
        sku: formData.sku,
        barcode: formData.barcode,
        description: formData.description,
        imageUrl: formData.imageUrl,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        minStockLevel: parseInt(formData.minStockLevel, 10) || 10,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        setSelectedProduct(null);
        fetchProducts();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p) => {
    setSelectedProduct(p);
    setFormData({
      name: p.name,
      categoryId: p.category_id,
      sku: p.sku,
      barcode: p.barcode || '',
      description: p.description || '',
      imageUrl: p.image_url || '',
      purchasePrice: p.purchase_price,
      sellingPrice: p.selling_price,
      minStockLevel: p.min_stock_level,
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openWarehouseBreakdown = async (p) => {
    setSelectedProduct(p);
    try {
      const res = await api.get(`/products/${p.id}`);
      if (res.success && res.data) {
        setWarehouseDetails(res.data.warehouses || []);
        setIsWarehouseModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load warehouse breakdown');
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate '${p.name}'?`)) {
      return;
    }

    try {
      const res = await api.delete(`/products/${p.id}`);
      alert(res.message);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  // Compute metrics
  const totalItems = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock_badge === 'LOW_STOCK' || p.stock_badge === 'OUT_OF_STOCK').length;
  const avgMargin = totalItems > 0
    ? (products.reduce((acc, p) => acc + parseFloat(p.margin_pct || 0), 0) / totalItems).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Master Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain catalog goods, SKUs, barcodes, cost pricing, margins, and safety stock thresholds.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setFormData({
                name: '',
                categoryId: categories[0]?.id || '',
                sku: '',
                barcode: '',
                description: '',
                imageUrl: '',
                purchasePrice: '',
                sellingPrice: '',
                minStockLevel: '10',
              });
              setFormError('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Catalog SKUs"
          value={totalItems}
          icon={Package}
          color="blue"
          trend={{ isPositive: true, text: 'Active Catalog' }}
          subtitle="Unique Product Records"
        />
        <StatusCard
          title="Total Stock Units"
          value={totalStockUnits}
          icon={Boxes}
          color="emerald"
          trend={{ isPositive: true, text: 'Warehouses' }}
          subtitle="Units across all locations"
        />
        <StatusCard
          title="Low & Out of Stock"
          value={lowStockCount}
          icon={AlertTriangle}
          color="rose"
          trend={{ isPositive: false, text: 'Needs Reorder' }}
          subtitle="Below safety threshold"
        />
        <StatusCard
          title="Avg Gross Margin"
          value={`${avgMargin}%`}
          icon={Percent}
          color="purple"
          trend={{ isPositive: true, text: 'Profit Margin' }}
          subtitle="Selling vs. Cost price"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, barcode..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
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
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock (Optimal)</option>
            <option value="low_stock">Low Stock (At Risk)</option>
            <option value="out_of_stock">Out of Stock (Zero)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="created_at">Sort by Date Added</option>
            <option value="name">Sort by Product Name</option>
            <option value="price">Sort by Selling Price</option>
            <option value="stock">Sort by Available Stock</option>
          </select>

          <button
            onClick={fetchProducts}
            title="Refresh Products"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3.5">Product & SKU</th>
                <th scope="col" className="px-6 py-3.5">Category</th>
                <th scope="col" className="px-6 py-3.5">Cost / Sell Price</th>
                <th scope="col" className="px-6 py-3.5">Gross Margin</th>
                <th scope="col" className="px-6 py-3.5">Available Stock</th>
                <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>Loading master catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400 text-sm">
                    No products found matching your search filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const stockBadgeConfig = {
                    OPTIMAL: {
                      bg: 'bg-emerald-50',
                      text: 'text-emerald-700',
                      border: 'border-emerald-200',
                      label: 'Optimal',
                      dot: 'bg-emerald-500',
                    },
                    LOW_STOCK: {
                      bg: 'bg-amber-50',
                      text: 'text-amber-700',
                      border: 'border-amber-200',
                      label: 'Low Stock',
                      dot: 'bg-amber-500',
                    },
                    OUT_OF_STOCK: {
                      bg: 'bg-rose-50',
                      text: 'text-rose-700',
                      border: 'border-rose-200',
                      label: 'Out of Stock',
                      dot: 'bg-rose-500',
                    },
                  }[p.stock_badge] || {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                    label: 'Normal',
                    dot: 'bg-slate-400',
                  };

                  const marginVal = parseFloat(p.margin_pct);
                  const marginColor =
                    marginVal >= 35
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : marginVal >= 20
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs">
                            <Package className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-snug">{p.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                              <span className="text-indigo-600 font-medium">SKU: {p.sku}</span>
                              {p.barcode && <span>• {p.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{p.category_name}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <div className="font-semibold text-slate-900">
                            ${Number(p.selling_price).toFixed(2)}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">sell</span>
                          </div>
                          <div className="text-slate-400">
                            ${Number(p.purchase_price).toFixed(2)}
                            <span className="text-[10px] font-normal ml-1">cost</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${marginColor}`}>
                          <span>+{p.margin_pct}%</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{p.current_stock}</span>
                            <span className="text-xs text-slate-400 font-normal">units</span>
                            <button
                              onClick={() => openWarehouseBreakdown(p)}
                              title="View breakdown by warehouse"
                              className="text-slate-400 hover:text-indigo-600 transition"
                            >
                              <Warehouse className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.2 rounded-full text-[10px] font-semibold border ${stockBadgeConfig.bg} ${stockBadgeConfig.text} ${stockBadgeConfig.border}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${stockBadgeConfig.dot}`} />
                              {stockBadgeConfig.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openWarehouseBreakdown(p)}
                            title="Warehouse Breakdown"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => openEdit(p)}
                                title="Edit Product"
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDelete(p)}
                                  title="Deactivate / Delete"
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add New Product</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Title / Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wireless Barcode Scanner 2D"
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Classification *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU & Barcode with Auto-Generators */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">SKU Code</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSKU}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Auto or custom"
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700">Barcode (EAN-13)</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateBarcode}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="890XXXXXXXXXX"
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pricing & Margins */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Margin Preview</label>
                  <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-bold text-indigo-600 flex items-center justify-between">
                    <span>{formMargin}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Safety Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Specifications</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Technical details, dimensions, warranty..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Creating Product...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Product: {selectedProduct.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Margin Preview</label>
                  <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-bold text-indigo-600">
                    {formMargin}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAREHOUSE BREAKDOWN MODAL */}
      {isWarehouseModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Warehouse Stock Breakdown</h3>
                <p className="text-xs text-slate-500">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {warehouseDetails.map((wh) => (
                <div key={wh.warehouse_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{wh.warehouse_name}</div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{wh.warehouse_code}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900">{wh.quantity}</span>
                    <span className="text-xs text-slate-400 ml-1">units</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-xs transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
