import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import CategoryFilter from '@/components/molecules/CategoryFilter'
import ProductGrid from '@/components/organisms/ProductGrid'
import SearchBar from '@/components/molecules/SearchBar'
import ApperIcon from '@/components/ApperIcon'
import productService from '@/services/api/productService'

const Category = () => {
  const { categoryName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categoryName || 'All');
  const [sortBy, setSortBy] = useState('name');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const categories = ['All', 'Groceries', 'Meat', 'Fruits', 'Vegetables'];
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'stock', label: 'Stock' }
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (categoryName) {
      setSelectedCategory(categoryName);
    }
  }, [categoryName]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [products, selectedCategory, sortBy, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'stock':
          return b.stock - a.stock;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchParams(searchTerm ? { search: searchTerm } : {});
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.trim()) {
      setSearchParams({ search: term });
    } else {
      setSearchParams({});
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchTerm('');
    setSortBy('name');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {selectedCategory === 'All' ? 'All Products' : selectedCategory}
        </h1>
        <p className="text-gray-600">
          {searchTerm ? `Search results for "${searchTerm}"` : 'Browse our fresh products'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-6">
        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Search and Sort */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search products..."
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ApperIcon name="Filter" size={20} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field py-2 pr-8"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {(selectedCategory !== 'All' || searchTerm || sortBy !== 'name') && (
              <button
                onClick={handleClearFilters}
                className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ApperIcon name="X" size={16} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Products Grid */}
      <ProductGrid
        products={filteredProducts}
        loading={loading}
        error={error}
        onRetry={loadProducts}
        emptyMessage={searchTerm ? `No products found for "${searchTerm}"` : "No products found in this category"}
      />
    </div>
  );
};

export default Category;