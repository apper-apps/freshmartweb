import { products } from '@/services/mockData/products.json';

/**
 * Product Service - Handles all product-related API operations
 * @module ProductService
 */

// Mock API base URL (replace with actual API endpoint in production)
const API_BASE_URL = '/api/products';

/**
 * Simulates API delay for realistic behavior
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all products with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.category - Filter by category
 * @param {string} filters.search - Search term
 * @param {number} filters.minPrice - Minimum price
 * @param {number} filters.maxPrice - Maximum price
 * @param {string} filters.sortBy - Sort field (name, price, rating)
 * @param {string} filters.sortOrder - Sort order (asc, desc)
 * @returns {Promise<Array>} Array of products
 */
export const getAllProducts = async (filters = {}) => {
  try {
    await delay(500);
    
    let filteredProducts = [...products];

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.category.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply price range filter
    if (filters.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.price <= filters.maxPrice);
    }

    // Apply sorting
    if (filters.sortBy) {
      filteredProducts.sort((a, b) => {
        let aValue = a[filters.sortBy];
        let bValue = b[filters.sortBy];

        if (filters.sortBy === 'price') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        } else if (filters.sortBy === 'rating') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        }

        if (filters.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    return {
      success: true,
      data: filteredProducts,
      total: filteredProducts.length,
      filters: filters
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products');
  }
};

/**
 * Get a single product by ID
 * @param {string|number} id - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getProductById = async (id) => {
  try {
    await delay(300);
    
    const product = products.find(p => p.id === parseInt(id) || p.id === id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      success: true,
      data: product
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw new Error(error.message || 'Failed to fetch product');
  }
};

/**
 * Get products by category
 * @param {string} category - Category name
 * @param {number} limit - Maximum number of products to return
 * @returns {Promise<Array>} Array of products in the category
 */
export const getProductsByCategory = async (category, limit = null) => {
  try {
    await delay(400);
    
    let categoryProducts = products.filter(product => 
      product.category.toLowerCase() === category.toLowerCase()
    );

    if (limit) {
      categoryProducts = categoryProducts.slice(0, limit);
    }

    return {
      success: true,
      data: categoryProducts,
      total: categoryProducts.length,
      category: category
    };
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw new Error('Failed to fetch products by category');
  }
};

/**
 * Search products by name or description
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of matching products
 */
export const searchProducts = async (query, limit = 20) => {
  try {
    await delay(300);
    
    if (!query || query.trim() === '') {
      return {
        success: true,
        data: [],
        total: 0,
        query: query
      };
    }

    const searchTerm = query.toLowerCase().trim();
    let results = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm)
    );

    if (limit) {
      results = results.slice(0, limit);
    }

    return {
      success: true,
      data: results,
      total: results.length,
      query: query
    };
  } catch (error) {
    console.error('Error searching products:', error);
    throw new Error('Failed to search products');
  }
};

/**
 * Get featured products
 * @param {number} limit - Maximum number of featured products
 * @returns {Promise<Array>} Array of featured products
 */
export const getFeaturedProducts = async (limit = 8) => {
  try {
    await delay(400);
    
    // Get products with high ratings or featured flag
    const featuredProducts = products
      .filter(product => product.rating >= 4.5 || product.featured)
      .slice(0, limit);

    return {
      success: true,
      data: featuredProducts,
      total: featuredProducts.length
    };
  } catch (error) {
    console.error('Error fetching featured products:', error);
    throw new Error('Failed to fetch featured products');
  }
};

/**
 * Get product categories
 * @returns {Promise<Array>} Array of unique categories
 */
export const getCategories = async () => {
  try {
    await delay(200);
    
    const categories = [...new Set(products.map(product => product.category))];
    
    return {
      success: true,
      data: categories,
      total: categories.length
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories');
  }
};

/**
 * Create a new product (Admin only)
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    await delay(800);
    
    // Validate required fields
    const requiredFields = ['name', 'price', 'category', 'description'];
    const missingFields = requiredFields.filter(field => !productData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Generate new ID
    const newId = Math.max(...products.map(p => p.id)) + 1;
    
    const newProduct = {
      id: newId,
      ...productData,
      rating: productData.rating || 0,
      stock: productData.stock || 0,
      featured: productData.featured || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real app, this would make an API call
    // For now, we'll just return the created product
    return {
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw new Error(error.message || 'Failed to create product');
  }
};

/**
 * Update an existing product (Admin only)
 * @param {string|number} id - Product ID
 * @param {Object} updateData - Updated product data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, updateData) => {
  try {
    await delay(600);
    
    const existingProduct = products.find(p => p.id === parseInt(id) || p.id === id);
    
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    const updatedProduct = {
      ...existingProduct,
      ...updateData,
      id: existingProduct.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    };
  } catch (error) {
    console.error('Error updating product:', error);
    throw new Error(error.message || 'Failed to update product');
  }
};

/**
 * Delete a product (Admin only)
 * @param {string|number} id - Product ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteProduct = async (id) => {
  try {
    await delay(500);
    
    const product = products.find(p => p.id === parseInt(id) || p.id === id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    return {
      success: true,
      data: { id: product.id },
      message: 'Product deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw new Error(error.message || 'Failed to delete product');
  }
};

/**
 * Update product stock
 * @param {string|number} id - Product ID
 * @param {number} newStock - New stock quantity
 * @returns {Promise<Object>} Updated product
 */
export const updateProductStock = async (id, newStock) => {
  try {
    await delay(400);
    
    const product = products.find(p => p.id === parseInt(id) || p.id === id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }

    const updatedProduct = {
      ...product,
      stock: newStock,
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: updatedProduct,
      message: 'Product stock updated successfully'
    };
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw new Error(error.message || 'Failed to update product stock');
  }
};

/**
 * Get low stock products
 * @param {number} threshold - Stock threshold (default: 10)
 * @returns {Promise<Array>} Array of low stock products
 */
export const getLowStockProducts = async (threshold = 10) => {
  try {
    await delay(300);
    
    const lowStockProducts = products.filter(product => product.stock <= threshold);

    return {
      success: true,
      data: lowStockProducts,
      total: lowStockProducts.length,
      threshold: threshold
    };
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    throw new Error('Failed to fetch low stock products');
  }
};

/**
 * Get product statistics
 * @returns {Promise<Object>} Product statistics
 */
export const getProductStats = async () => {
  try {
    await delay(400);
    
    const stats = {
      totalProducts: products.length,
      totalCategories: new Set(products.map(p => p.category)).size,
      averagePrice: products.reduce((sum, p) => sum + p.price, 0) / products.length,
      averageRating: products.reduce((sum, p) => sum + p.rating, 0) / products.length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: products.filter(p => p.stock <= 10).length,
      featuredCount: products.filter(p => p.featured).length
    };

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error('Error fetching product statistics:', error);
    throw new Error('Failed to fetch product statistics');
  }
};

// Default export for backward compatibility
export default {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getLowStockProducts,
  getProductStats
};