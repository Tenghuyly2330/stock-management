/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  DollarSign,
  AlertTriangle,
  Boxes,
  X,
  AlertCircle,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  ShoppingCart,
  Phone,
  User,
  Minus,
  Trash,
  Receipt,
  Check,
} from 'lucide-react';
import StatusCard from '../components/common/StatusCard';

export default function Products() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  const [cart, setCart] = useState([]);
  const [customerInput, setCustomerInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockSupplier, setRestockSupplier] = useState('Owner Restock');
  const [restockCost, setRestockCost] = useState('');
  const [restockNotes, setRestockNotes] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);
  const [restockError, setRestockError] = useState('');
  const [restockNotification, setRestockNotification] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [imageInputMode, setImageInputMode] = useState('upload');
  const [uploadingImage, setUploadingImage] = useState(false);

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
    minStockLevel: '5',
    initialStock: '0',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      if (res.data) setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        sort_by: 'created_at',
        sort_dir: 'DESC',
      };
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;
      if (stockStatus) params.stock_status = stockStatus;

      const res = await api.get('/products', { params });
      if (res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, stockStatus]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const addToCart = (product) => {
    const availableStock = parseInt(product.current_stock || 0, 10);
    if (availableStock <= 0) {
      toast.warning(`${product.name} is currently out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          toast.warning(`Cannot add more. Max stock available is ${availableStock} units.`);
          return prev;
        }
        toast.info(`Increased ${product.name} quantity to ${existing.quantity + 1}`);
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast.success(`Added ${product.name} to cart!`);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const availableStock = parseInt(item.product.current_stock || 0, 10);
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > availableStock) {
              toast.warning(`Max available stock is ${availableStock} units.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item) toast.info(`Removed ${item.product.name} from cart`);
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInput('');
  };

  const cartTotalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + (parseFloat(item.product.selling_price) || 0) * item.quantity,
    0
  );
  const cartGrandTotal = cartSubtotal;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const cleanCustomer = customerInput.trim();
    if (!cleanCustomer) {
      toast.error('Please enter a customer phone number or name.');
      return;
    }

    try {
      setIsCheckingOut(true);
      const payload = {
        customer: cleanCustomer,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: parseFloat(item.product.selling_price),
        })),
      };

      const res = await api.post('/history/checkout', payload);

      if (res.success && res.data) {
        toast.success(`Sale completed for ${cleanCustomer}! Total: $${cartGrandTotal.toFixed(2)}`);
        setCheckoutSuccess(res.data);
        clearCart();
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.message || 'Checkout failed. Please check product stock.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // restock
  const openRestockModal = (product) => {
    setRestockProduct(product);
    setRestockQty('');
    setRestockSupplier('Owner Restock');
    setRestockCost(product.purchase_price || '');
    setRestockNotes('');
    setRestockError('');
    setIsRestockModalOpen(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) {
      setRestockError('Please enter a valid quantity greater than zero.');
      toast.warning('Please enter a valid quantity greater than zero.');
      return;
    }

    try {
      setIsRestocking(true);
      setRestockError('');
      await api.post('/history/add', {
        productId: restockProduct.id,
        quantity: qty,
        supplierName: restockSupplier.trim() || 'Owner Restock',
        unitCost: restockCost ? parseFloat(restockCost) : null,
        notes: restockNotes.trim() || 'Restocked by owner',
      });

      toast.success(`Successfully added ${qty} units of ${restockProduct.name}! (Auto-logged to History)`);
      setIsRestockModalOpen(false);
      fetchProducts();
    } catch (err) {
      setRestockError(err.message || 'Failed to restock product');
      toast.error(err.message || 'Failed to restock product');
    } finally {
      setIsRestocking(false);
    }
  };

  // manage product
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('image', file);

    setUploadingImage(true);
    setFormError('');

    try {
      const res = await api.post('/products/upload-image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          imageUrl: res.data.imageUrl,
          imagePublicId: res.data.imagePublicId,
        }));
        toast.success('Image uploaded successfully to Cloudinary!');
      }
    } catch (err) {
      setFormError(err.message || 'Image upload failed.');
      toast.error(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAutoGenerateSKU = () => {
    const selectedCatObj = categories.find((c) => String(c.id) === String(formData.categoryId));
    const catName = selectedCatObj ? selectedCatObj.name : 'PRD';
    let prefix = 'PRD';
    if (catName.toLowerCase().includes('machin') || catName.toLowerCase().includes('tractor')) prefix = 'MCH';
    else if (catName.toLowerCase().includes('metal') || catName.toLowerCase().includes('steel')) prefix = 'MTL';

    const timestamp = Date.now().toString().slice(-4);
    const rand = Math.floor(Math.random() * 900 + 100);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${timestamp}-${rand}` }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      sku: '',
      barcode: '',
      description: '',
      imageUrl: '',
      imagePublicId: '',
      purchasePrice: '',
      sellingPrice: '',
      minStockLevel: '5',
      initialStock: '0',
    });
    setImageInputMode('upload');
    setFormError('');
    setIsModalOpen(true);
  };

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
      initialStock: '0',
    });
    setImageInputMode(p.image_url && !p.image_public_id ? 'url' : 'upload');
    setFormError('');
    setIsModalOpen(true);
  };

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
        initialStock: parseInt(formData.initialStock, 10) || 0,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success(`Product "${payload.name}" updated successfully!`);
      } else {
        await api.post('/products', payload);
        toast.success(`Product "${payload.name}" created successfully!`);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to save product');
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success(`Product "${name}" deleted.`);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
      toast.error(err.message || 'Failed to delete product');
    }
  };

  // Aggregate Stats
  const totalValuation = products.reduce(
    (sum, p) => sum + (parseFloat(p.selling_price) || 0) * (parseInt(p.current_stock, 10) || 0),
    0
  );
  const totalUnits = products.reduce((sum, p) => sum + (parseInt(p.current_stock, 10) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-600" />
            Products & Point of Sale
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>
          )}
        </div>
      </div>

      {/* Restock Notification */}
      {restockNotification && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{restockNotification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Active Products"
          value={products.length}
          icon={Package}
          color="indigo"
          subtitle="Machinery & Metals"
        />
        <StatusCard
          title="Base Stock Units"
          value={totalUnits.toLocaleString()}
          icon={Boxes}
          color="emerald"
          subtitle="Warehouse BASE-01"
        />
        <StatusCard
          title="Catalog Retail Value"
          value={`$${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="amber"
          subtitle="Total stock valuation"
        />
        <StatusCard
          title="Cart Items"
          value={`${cart.length} (${cartTotalUnits} units)`}
          icon={ShoppingCart}
          color="blue"
          subtitle={`Total: $${cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by short name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Stock Status</option>
                <option value="in_stock">In Stock (&gt; 5)</option>
                <option value="low_stock">Low Stock (1 - 5)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                Category:
              </span>
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === ''
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(String(cat.id))}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    String(selectedCategory) === String(cat.id)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-2" />
                <p className="text-sm">Loading product catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h3 className="text-base font-semibold text-slate-700">No products found</h3>
                <p className="text-sm mt-1 text-slate-500">
                  {search || selectedCategory ? 'Try resetting filters' : 'Add your first product above'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-center">Base Stock</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-center">Add to Cart</th>
                      {canManage && <th className="py-3 px-3 text-right">Owner Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const stock = parseInt(p.current_stock || 0, 10);
                      const isOutOfStock = stock <= 0;
                      const cartItem = cart.find((item) => item.product.id === p.id);
                      const inCartQty = cartItem ? cartItem.quantity : 0;

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            inCartQty > 0 ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">
                                  {p.name}
                                </div>
                                <div className="text-xs font-mono text-indigo-600 mt-0.5">
                                  {p.sku}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {p.category_name || 'General'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            ) : stock <= 5 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                {stock} left
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                {stock} units
                              </span>
                            )}
                          </td>

                          {/* 4. Unit Price */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              ${parseFloat(p.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {canManage && (
                              <div className="text-[11px] font-mono text-slate-400">
                                Cost: ${parseFloat(p.purchase_price || 0).toFixed(2)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isOutOfStock ? (
                              <button
                                disabled
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                              >
                                Sold Out
                              </button>
                            ) : inCartQty > 0 ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => addToCart(p)}
                                  disabled={inCartQty >= stock}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                    inCartQty >= stock
                                      ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                  title={inCartQty >= stock ? 'Maximum stock added' : 'Add another unit'}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>In Cart ({inCartQty})</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(p)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-transparent transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Add to Cart
                              </button>
                            )}
                          </td>

                          {/* Restock + Edit + Delete */}
                          {canManage && (
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openRestockModal(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-transparent transition-all cursor-pointer"
                                  title="Owner Restock: Add stock units into Base Warehouse (Auto-logs to History)"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Restock</span>
                                </button>

                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 cursor-pointer"
                                  title="Edit Product"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 cursor-pointer"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Active Order Cart</h3>
                <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm">Cart is Empty</h4>
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="p-5 space-y-4">
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {cart.map((item) => {
                    const availableStock = parseInt(item.product.current_stock || 0, 10);
                    const itemSubtotal =
                      (parseFloat(item.product.selling_price) || 0) * item.quantity;

                    return (
                      <div key={item.product.id} className="first:pt-0 flex items-center gap-3">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-11 h-11 object-cover rounded-md border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                            <Package className="w-5 h-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {item.product.name}
                          </h4>
                          <div className="text-[11px] font-mono text-slate-500">
                            ${parseFloat(item.product.selling_price).toFixed(2)}/ea
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs font-mono text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product.id, 1)}
                            disabled={item.quantity >= availableStock}
                            className={`w-6 h-6 flex items-center justify-center rounded-md border text-slate-600 cursor-pointer ${
                              item.quantity >= availableStock
                                ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            ${itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors mt-0.5 cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total Products:</span>
                    <span className="font-semibold text-slate-700">{cart.length} items ({cartTotalUnits} units)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Warehouse:</span>
                    <span className="font-semibold text-slate-700">Main Base (BASE-01)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                    <span className="text-xl font-bold font-mono text-indigo-700">
                      ${cartGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Single Customer Field (Phone or Name) - No Notes */}
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    Customer (Phone or Name) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Enter phone number or customer name..."
                      value={customerInput}
                      onChange={(e) => setCustomerInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Recorded in History — easily find later by this phone or name.
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  type="submit"
                  disabled={isCheckingOut}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  {isCheckingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Checkout...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      Complete Sale • ${cartGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CHECKOUT SUCCESS RECEIPT MODAL                                         */}
      {/* ========================================================================= */}
      {checkoutSuccess && (
        <div 
          onClick={() => setCheckoutSuccess(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95"
          >
            {/* Top-Right X Close Button */}
            <button
              type="button"
              onClick={() => setCheckoutSuccess(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Sale Recorded Successfully!</h3>
              <p className="text-xs text-slate-500">
                Stock has been deducted from Base Warehouse and automatically logged to History.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Customer (Phone/Name):</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {checkoutSuccess.customer || checkoutSuccess.partyIdentifier}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Items Sold:</span>
                <span className="font-bold text-slate-900">{checkoutSuccess.totalUnits} units</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-slate-900 text-sm">Total Paid:</span>
                <span className="font-mono font-bold text-emerald-700 text-base">
                  ${parseFloat(checkoutSuccess.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RESTOCK MODAL (Owner Adding More Products to Base Stock)               */}
      {/* ========================================================================= */}
      {isRestockModalOpen && restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                Add More Stock (Owner Restock)
              </h3>
              <button
                onClick={() => setIsRestockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              {restockError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{restockError}</span>
                </div>
              )}

              {/* Product Info Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm">{restockProduct.name}</div>
                <div className="font-mono text-indigo-600">SKU: {restockProduct.sku}</div>
                <div className="text-slate-500">
                  Current Base Stock: <span className="font-bold text-slate-800">{restockProduct.current_stock || 0} units</span>
                </div>
              </div>

              {/* Quantity to Add */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Quantity Units to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  placeholder="e.g. 10"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Supplier / Restock Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Supplier / Restock Source *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Owner Restock or Titan Machinery"
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Unit Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unit Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit purchase cost"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Restock Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stock shipment received by owner"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRestocking ? 'Restocking...' : 'Add Stock (Auto-Logs History)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE / EDIT PRODUCT MODAL (For Admins and Managers)                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Short Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farm Tractor or Steel Rebar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
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

              {/* SKU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SKU Code *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSKU}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCH-TRC-75HP"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Initial Stock (Only for new product creation) */}
              {!editingProduct && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Stock in Base Warehouse (Auto-logs to History)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10 units"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Added to Base Warehouse and automatically recorded as an ADD entry in History.
                  </span>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Purchase Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="22500.00"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="29990.00"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Product Image Selection (Upload to Cloudinary or URL Link) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Product Image (Optional)
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        imageInputMode === 'upload'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        imageInputMode === 'url'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Image Link (URL)
                    </button>
                  </div>
                </div>

                {/* Upload Mode */}
                {imageInputMode === 'upload' && (
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors rounded-xl p-4 text-center bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="product-image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="cursor-pointer flex flex-col items-center gap-1.5 text-slate-600 hover:text-indigo-600"
                    >
                      <UploadCloud className="w-8 h-8 text-indigo-500 animate-pulse" />
                      <span className="text-xs font-semibold">
                        {uploadingImage ? 'Uploading image...' : 'Click to upload from device'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Supports PNG, JPG, WEBP (Saved to Cloudinary storage)
                      </span>
                    </label>
                  </div>
                )}

                {/* URL Mode */}
                {imageInputMode === 'url' && (
                  <input
                    type="url"
                    placeholder="https://example.com/product-image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                        imagePublicId: '',
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}

                {/* Image Preview if image exists */}
                {formData.imageUrl && (
                  <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={formData.imageUrl}
                        alt="Product Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Image Selected
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {formData.imagePublicId ? 'Uploaded to Cloudinary' : 'Web URL link'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          imageUrl: '',
                          imagePublicId: '',
                        }))
                      }
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
