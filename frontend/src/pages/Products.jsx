import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
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
  UploadCloud,
  Link as LinkIcon,
  Image as ImageIcon,
  LayoutGrid,
  List,
  CheckCircle2,
  XCircle,
  Truck,
  Tractor,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';

// Sample Presets for Farm Machinery & Metal Products
const IMAGE_PRESETS = [
  {
    label: 'Utility Tractor',
    url: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80',
    category: 'Farm Machinery',
  },
  {
    label: 'Rotary Tiller',
    url: 'https://images.unsplash.com/photo-1589824783837-6169889fa20f?auto=format&fit=crop&w=800&q=80',
    category: 'Farm Machinery',
  },
  {
    label: 'Steel Rebar',
    url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    category: 'Metals',
  },
  {
    label: 'Corrugated Metal',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    category: 'Metals',
  },
];

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('DESC');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [warehouseDetails, setWarehouseDetails] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Image mode in form: 'preset' | 'upload' | 'url'
  const [imageInputMode, setImageInputMode] = useState('preset');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    sku: '',
    barcode: '',
    description: '',
    imageUrl: '',
    imagePublicId: '',
    purchasePrice: '',
    sellingPrice: '',
    minStockLevel: '10',
  });

  // Fetch Products & Categories
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (stockStatus) params.append('stock_status', stockStatus);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortDir) params.append('sort_dir', sortDir);
      params.append('limit', '100');

      const [prodsRes, catsRes] = await Promise.all([
        api.get(`/products?${params.toString()}`),
        api.get('/categories?status=active'),
      ]);

      if (prodsRes.success) {
        setProducts(prodsRes.data || []);
      }
      if (catsRes.success) {
        setCategories(catsRes.data || []);
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

  // Handle direct file upload to Cloudinary/Local storage
  const handleImageFileUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setFormError('');

    try {
      const uploadData = new FormData();
      uploadData.append('image', file);

      const res = await api.post('/products/upload-image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: res.data.imageUrl,
          imagePublicId: res.data.imagePublicId,
        }));
      }
    } catch (err) {
      setFormError(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Auto-generate SKU & Barcode
  const handleAutoGenerateSKU = () => {
    const selectedCatObj = categories.find((c) => String(c.id) === String(formData.categoryId));
    const catName = selectedCatObj ? selectedCatObj.name : 'PRD';
    let prefix = 'PRD';
    if (catName.toLowerCase().includes('machin') || catName.toLowerCase().includes('tractor')) prefix = 'MCH';
    else if (catName.toLowerCase().includes('metal') || catName.toLowerCase().includes('steel')) prefix = 'MTL';
    else if (catName.toLowerCase().includes('pump') || catName.toLowerCase().includes('irrigation')) prefix = 'AGR';
    else if (catName.toLowerCase().includes('fence') || catName.toLowerCase().includes('hardware')) prefix = 'HRD';

    const timestamp = Date.now().toString().slice(-4);
    const rand = Math.floor(Math.random() * 900 + 100);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${timestamp}-${rand}` }));
  };

  const handleAutoGenerateBarcode = () => {
    const rand = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
    setFormData((prev) => ({ ...prev, barcode: `890${rand.substring(0, 9)}` }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      sku: '',
      barcode: '',
      description: '',
      imageUrl: IMAGE_PRESETS[0].url,
      imagePublicId: '',
      purchasePrice: '',
      sellingPrice: '',
      minStockLevel: '10',
    });
    setImageInputMode('preset');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      categoryId: p.category_id,
      sku: p.sku,
      barcode: p.barcode || '',
      description: p.description || '',
      imageUrl: p.image_url || '',
      imagePublicId: p.image_public_id || '',
      purchasePrice: p.purchase_price,
      sellingPrice: p.selling_price,
      minStockLevel: p.min_stock_level,
    });
    setImageInputMode(p.image_url ? 'url' : 'preset');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Product (Create or Update)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        categoryId: parseInt(formData.categoryId, 10),
        sku: formData.sku.trim(),
        barcode: formData.barcode ? formData.barcode.trim() : null,
        description: formData.description ? formData.description.trim() : '',
        imageUrl: formData.imageUrl ? formData.imageUrl.trim() : null,
        imagePublicId: formData.imagePublicId || null,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        minStockLevel: parseInt(formData.minStockLevel, 10) || 5,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete product
  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to delete '${p.name}'?`)) {
      return;
    }
    try {
      await api.delete(`/products/${p.id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete product');
    }
  };

  // Open warehouse breakdown
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

  // Helper to format image URL
  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      return `http://localhost:5000${url}`;
    }
    return url;
  };

  // Metrics
  const totalItems = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.current_stock || 0), 0);
  const lowStockCount = products.filter(
    (p) => p.stock_badge === 'LOW_STOCK' || p.stock_badge === 'OUT_OF_STOCK'
  ).length;
  const totalValuation = products.reduce(
    (acc, p) => acc + (p.current_stock || 0) * (parseFloat(p.purchase_price) || 0),
    0
  );

  // Live profit margin calculation for modal
  const formCost = parseFloat(formData.purchasePrice) || 0;
  const formSell = parseFloat(formData.sellingPrice) || 0;
  const formProfit = formSell - formCost;
  const formMargin = formSell > 0 ? ((formProfit / formSell) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Tractor className="w-7 h-7 text-indigo-600" />
            Farm Machinery & Metals Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, manage, and sell farm machinery, tractors, industrial metals, and agricultural supplies.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Catalog Products"
          value={totalItems}
          icon={Package}
          color="blue"
          trend={{ isPositive: true, text: 'Active Catalog' }}
          subtitle="Machines, Metals & Supplies"
        />
        <StatusCard
          title="Total Stock Units"
          value={totalStockUnits.toLocaleString()}
          icon={Boxes}
          color="emerald"
          trend={{ isPositive: true, text: 'Warehouses' }}
          subtitle="Available for sale"
        />
        <StatusCard
          title="Inventory Valuation"
          value={`$${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="purple"
          trend={{ isPositive: true, text: 'Cost Basis' }}
          subtitle="Total stock asset value"
        />
        <StatusCard
          title="Low & Out of Stock"
          value={lowStockCount}
          icon={AlertTriangle}
          color="rose"
          trend={{ isPositive: false, text: 'Reorder Needed' }}
          subtitle="Needs replenishment"
        />
      </div>

      {/* Quick Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === ''
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items ({totalItems})
        </button>
        {categories.map((c) => {
          const isSelected = String(selectedCategory) === String(c.id);
          let emoji = '📦';
          if (c.name.toLowerCase().includes('machin') || c.name.toLowerCase().includes('tractor')) emoji = '🚜';
          else if (c.name.toLowerCase().includes('metal') || c.name.toLowerCase().includes('steel')) emoji = '🔩';
          else if (c.name.toLowerCase().includes('pump') || c.name.toLowerCase().includes('irrigation')) emoji = '💧';
          else if (c.name.toLowerCase().includes('fence') || c.name.toLowerCase().includes('hardware')) emoji = '🌾';

          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(isSelected ? '' : c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{emoji}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search machines, metals, SKU, barcode..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Stock Filter */}
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Stock Status</option>
            <option value="in_stock">In Stock (Optimal)</option>
            <option value="low_stock">Low Stock (At Risk)</option>
            <option value="out_of_stock">Out of Stock (Zero)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="created_at">Sort: Date Added</option>
            <option value="name">Sort: Product Name</option>
            <option value="price">Sort: Selling Price</option>
            <option value="stock">Sort: Available Stock</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('cards')}
              title="Grid Cards View"
              className={`p-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Compact Table View"
              className={`p-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchProducts}
            title="Refresh Products"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent mb-2" />
          <p className="text-sm font-medium">Loading catalog products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Products Found</h3>
          <p className="text-sm mt-1 text-slate-500">
            {search || selectedCategory || stockStatus ? 'Try resetting your search filters' : 'Add your first product to get started.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ========================================================================= */
        /* SIMPLE VISUAL CARDS VIEW                                                  */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => {
            const isOutOfStock = (p.current_stock || 0) === 0;
            const isLowStock = !isOutOfStock && p.stock_badge === 'LOW_STOCK';
            const imageSrc = resolveImageUrl(p.image_url);

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner with Category Tag */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    {/* Category Overlay Tag */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs">
                      {p.category_name}
                    </span>

                    {/* Stock Status Pill */}
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                        isOutOfStock
                          ? 'bg-rose-600 text-white'
                          : isLowStock
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : `${p.current_stock || 0} in stock`}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1" title={p.name}>
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span className="text-indigo-600 font-semibold">{p.sku}</span>
                        {p.barcode && <span>• {p.barcode}</span>}
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                    )}

                    {/* Pricing Box */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Selling Price: </span>
                        <span className="text-lg font-bold text-slate-900 font-mono">
                          ${Number(p.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400">Cost: ${Number(p.purchase_price).toFixed(2)}</span>
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          +{p.margin_pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => openWarehouseBreakdown(p)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    <Warehouse className="w-3.5 h-3.5" />
                    <span>Locations</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete Product"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* SIMPLE TABLE VIEW                                                         */
        /* ========================================================================= */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Product & SKU</th>
                  <th scope="col" className="px-6 py-3.5">Category</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Selling Price</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Cost Price</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Gross Margin</th>
                  <th scope="col" className="px-6 py-3.5 text-center">Stock Level</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const imageSrc = resolveImageUrl(p.image_url);
                  const isOutOfStock = (p.current_stock || 0) === 0;
                  const isLowStock = !isOutOfStock && p.stock_badge === 'LOW_STOCK';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {imageSrc ? (
                              <img src={imageSrc} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{p.name}</div>
                            <div className="text-xs text-indigo-600 font-mono mt-0.5">{p.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-xs text-slate-700">{p.category_name}</td>

                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        ${Number(p.selling_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-3.5 text-right font-mono text-xs text-slate-500">
                        ${Number(p.purchase_price).toFixed(2)}
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                          +{p.margin_pct}%
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.current_stock || 0} units
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openWarehouseBreakdown(p)}
                            title="Warehouse Breakdown"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <Warehouse className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEditModal(p)}
                                title="Edit Product"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                title="Delete Product"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIMPLIFIED ADD / EDIT PRODUCT MODAL                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Product Details' : 'Add Product to Catalog'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 75HP 4WD Utility Farm Tractor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Pricing & Profit Margin Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="29990.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cost / Purchase Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="22500.00"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Profit Margin
                  </label>
                  <div className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-sm">
                    <span className="font-bold text-emerald-700 font-mono">+{formMargin}%</span>
                    <span className="text-[11px] text-slate-400">
                      ${formProfit > 0 ? formProfit.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. SKU & Barcode with 1-click generators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">SKU *</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSKU}
                      className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer"
                    >
                      Generate SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MCH-TRC-75HP"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Barcode
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateBarcode}
                      className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer"
                    >
                      Generate Barcode
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 890554433001"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 4. Product Image Selection (Preset vs. File Upload vs. URL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Product Image
                </label>

                {/* Preset Picker Buttons */}
                <div className="mb-3">
                  <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Quick Farm & Metal Presets:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {IMAGE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => {
                          setFormData({ ...formData, imageUrl: preset.url, imagePublicId: '' });
                          setImageInputMode('preset');
                        }}
                        className={`relative rounded-lg overflow-hidden border p-1 text-center transition cursor-pointer ${
                          formData.imageUrl === preset.url
                            ? 'border-indigo-600 ring-2 ring-indigo-500'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-12 object-cover rounded" />
                        <span className="block text-[10px] font-medium text-slate-700 truncate mt-1">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct File or Custom Link Input */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="w-full sm:flex-1">
                    <input
                      type="text"
                      placeholder="Or paste custom image link (URL)..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <label className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium rounded-lg cursor-pointer">
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => handleImageFileUpload(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* 5. Minimum Stock Safety Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Minimum Stock Reorder Alert Level
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 5"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 6. Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Key specifications, horsepower, metal gauge, dimensions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Locations Breakdown Modal */}
      {isWarehouseModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
              </div>
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Current Stock by Facility:
              </h4>
              {warehouseDetails.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No warehouse balances recorded.</p>
              ) : (
                <div className="space-y-2">
                  {warehouseDetails.map((wh) => (
                    <div
                      key={wh.warehouse_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 text-sm">{wh.warehouse_name}</span>
                        <span className="block text-[11px] font-mono text-indigo-600">{wh.warehouse_code}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-slate-900">{wh.quantity} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
