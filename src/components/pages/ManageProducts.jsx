import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import Empty from '@/components/ui/Empty';
import ProductGrid from '@/components/organisms/ProductGrid';
import productService from '@/services/api/productService';

const ManageProducts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minStock: searchParams.get('minStock') || '',
    maxStock: searchParams.get('maxStock') || '',
    inStock: searchParams.get('inStock') === 'true',
    lowStock: searchParams.get('lowStock') === 'true',
    featured: searchParams.get('featured') === 'true'
  });

  // Load products and categories
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsResponse, categoriesResponse, statsResponse] = await Promise.all([
        productService.getAllProducts({
          search: searchTerm,
          category: selectedCategory === 'all' ? null : selectedCategory,
          sortBy,
          sortOrder,
          minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined
        }),
        productService.getCategories(),
        productService.getProductStats()
      ]);

      let filteredProducts = productsResponse.data || [];

      // Apply additional filters
      if (filters.minStock) {
        filteredProducts = filteredProducts.filter(p => p.stock >= parseInt(filters.minStock));
      }
      if (filters.maxStock) {
        filteredProducts = filteredProducts.filter(p => p.stock <= parseInt(filters.maxStock));
      }
      if (filters.inStock) {
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
      }
      if (filters.lowStock) {
        filteredProducts = filteredProducts.filter(p => p.stock <= 10);
      }
      if (filters.featured) {
        filteredProducts = filteredProducts.filter(p => p.featured);
      }

      setProducts(filteredProducts);
      setCategories(['all', ...(categoriesResponse.data || [])]);
      setStats(statsResponse.data || {});
      
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (sortBy !== 'name') params.set('sortBy', sortBy);
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minStock) params.set('minStock', filters.minStock);
    if (filters.maxStock) params.set('maxStock', filters.maxStock);
    if (filters.inStock) params.set('inStock', 'true');
    if (filters.lowStock) params.set('lowStock', 'true');
    if (filters.featured) params.set('featured', 'true');
    
    setSearchParams(params);
  }, [searchTerm, selectedCategory, sortBy, sortOrder, filters, setSearchParams]);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory, sortBy, sortOrder, filters]);

  // Handle product deletion
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      toast.success('Product deleted successfully');
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Failed to delete product');
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.warning('Please select products to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(selectedProducts.map(id => productService.deleteProduct(id)));
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      toast.success(`${selectedProducts.length} products deleted successfully`);
    } catch (err) {
      console.error('Error deleting products:', err);
      toast.error('Failed to delete some products');
    }
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  // Export products
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status'].join(','),
      ...products.map(p => [
        p.id,
        `"${p.name}"`,
        p.category,
        p.price,
        p.stock,
        p.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Products exported successfully');
  };

  // Filtered and sorted products for display
  const displayProducts = useMemo(() => {
    return products;
  }, [products]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadProducts} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Products</h1>
            <p className="text-gray-600">
              Manage your product inventory • {displayProducts.length} products
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ApperIcon name="Download" size={16} />
              <span>Export</span>
            </Button>
            <Link to="/admin/products/add">
              <Button className="flex items-center space-x-2">
                <ApperIcon name="Plus" size={16} />
                <span>Add Product</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Products</p>
              <p className="text-2xl font-bold">{stats.totalProducts || 0}</p>
            </div>
            <ApperIcon name="Package" size={32} className="text-blue-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Categories</p>
              <p className="text-2xl font-bold">{stats.totalCategories || 0}</p>
            </div>
            <ApperIcon name="Grid3x3" size={32} className="text-green-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Low Stock</p>
              <p className="text-2xl font-bold">{stats.lowStockCount || 0}</p>
            </div>
            <ApperIcon name="AlertTriangle" size={32} className="text-orange-100" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Stock</p>
              <p className="text-2xl font-bold">{stats.totalStock || 0}</p>
            </div>
            <ApperIcon name="BarChart3" size={32} className="text-purple-100" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <ApperIcon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="lg:w-48">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="stock-asc">Stock (Low-High)</option>
              <option value="stock-desc">Stock (High-Low)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 flex items-center justify-center ${
                viewMode === 'grid' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ApperIcon name="Grid3x3" size={20} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-3 flex items-center justify-center ${
                viewMode === 'table' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ApperIcon name="List" size={20} />
            </button>
          </div>

          {/* Filters Toggle */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={`flex items-center space-x-2 ${showFilters ? 'bg-primary text-white' : ''}`}
          >
            <ApperIcon name="Filter" size={16} />
            <span>Filters</span>
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                <input
                  type="number"
                  placeholder="999999"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, minStock: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                <input
                  type="number"
                  placeholder="999999"
                  value={filters.maxStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxStock: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Low Stock Alert</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => setFilters(prev => ({ ...prev, featured: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Featured Products</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <ApperIcon name="CheckCircle" size={20} className="text-primary" />
              <span className="text-sm font-medium text-gray-900">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleBulkDelete}
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <ApperIcon name="Trash2" size={16} className="mr-1" />
                Delete Selected
              </Button>
              <Button
                onClick={() => setSelectedProducts([])}
                variant="outline"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Display */}
      {displayProducts.length === 0 ? (
        <Empty 
          type="products" 
          description="No products found matching your criteria"
          action="Add Product"
          onAction={() => navigate('/admin/products/add')}
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayProducts.map((product) => (
                <div key={product.id} className="relative group">
                  <div className={`card overflow-hidden ${selectedProducts.includes(product.id) ? 'ring-2 ring-primary' : ''}`}>
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleProductSelect(product.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary shadow-sm"
                      />
                    </div>

                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(product.name)}`;
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <p>Category: {product.category}</p>
                        <p>Price: Rs. {product.price?.toLocaleString()}</p>
                        <p>Stock: {product.stock} {product.unit}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link 
                          to={`/admin/products/edit/${product.id}`}
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full text-sm">
                            <ApperIcon name="Edit2" size={14} className="mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleDeleteProduct(product.id)}
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <ApperIcon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === displayProducts.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleProductSelect(product.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 flex-shrink-0">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-12 w-12 rounded-lg object-cover"
                                onError={(e) => {
                                  e.target.src = `https://via.placeholder.com/48x48?text=${encodeURIComponent(product.name.charAt(0))}`;
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">ID: {product.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">Rs. {product.price?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{product.stock} {product.unit}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock > 10 
                              ? 'bg-green-100 text-green-800'
                              : product.stock > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link 
                            to={`/admin/products/edit/${product.id}`}
                            className="text-primary hover:text-primary-dark"
                          >
                            <ApperIcon name="Edit2" size={16} />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <ApperIcon name="Trash2" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageProducts;