import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import productService from '@/services/api/productService';

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [originalData, setOriginalData] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    previousPrice: '',
    purchasePrice: '',
    discountType: 'Fixed Amount',
    discountValue: '',
    unit: 'kg',
    stock: '',
    imageUrl: '',
    barcode: '',
    featured: false,
    isActive: true
  });

  // Image management
  const [imageUpload, setImageUpload] = useState({
    file: null,
    preview: null,
    uploading: false
  });

  // AI Image generation
  const [aiImageGeneration, setAiImageGeneration] = useState({
    prompt: '',
    generating: false,
    suggestions: []
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productResponse, categoriesResponse] = await Promise.all([
          productService.getProductById(id),
          productService.getCategories()
        ]);

        const product = productResponse.data;
        setOriginalData(product);
        setFormData({
          name: product.name || '',
          category: product.category || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          previousPrice: product.previousPrice?.toString() || '',
          purchasePrice: product.purchasePrice?.toString() || '',
          discountType: product.discountType || 'Fixed Amount',
          discountValue: product.discountValue?.toString() || '',
          unit: product.unit || 'kg',
          stock: product.stock?.toString() || '',
          imageUrl: product.imageUrl || '',
          barcode: product.barcode || '',
          featured: product.featured || false,
          isActive: product.isActive !== false
        });

        if (product.imageUrl) {
          setImageUpload(prev => ({ ...prev, preview: product.imageUrl }));
        }

        setCategories(['Groceries', 'Meat', 'Fruits', 'Vegetables', ...(categoriesResponse.data || [])]);
        
      } catch (err) {
        console.error('Error loading product:', err);
        setError(err.message || 'Failed to load product');
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  // Calculate derived values
  const calculatedValues = React.useMemo(() => {
    const price = parseFloat(formData.price) || 0;
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const discountValue = parseFloat(formData.discountValue) || 0;
    
    let finalPrice = price;
    if (discountValue > 0) {
      if (formData.discountType === 'Percentage') {
        finalPrice = price - (price * discountValue / 100);
      } else {
        finalPrice = price - discountValue;
      }
    }
    
    const profitMargin = purchasePrice > 0 ? ((finalPrice - purchasePrice) / purchasePrice) * 100 : 0;
    const minSellingPrice = purchasePrice * 1.1; // 10% minimum margin

    return {
      finalPrice: Math.max(0, finalPrice),
      profitMargin: Math.max(0, profitMargin),
      minSellingPrice
    };
  }, [formData.price, formData.purchasePrice, formData.discountValue, formData.discountType]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) newErrors.purchasePrice = 'Valid purchase price is required';
    if (!formData.stock || parseInt(formData.stock) < 0) newErrors.stock = 'Valid stock quantity is required';
    if (parseFloat(formData.price) <= parseFloat(formData.purchasePrice)) {
      newErrors.price = 'Selling price must be higher than purchase price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageUpload(prev => ({ ...prev, uploading: true }));

      // Validate image
      const validation = await productService.validateImage(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      // Process image
      const processed = await productService.processImage(file);
      
      setImageUpload({
        file,
        preview: processed.url,
        uploading: false
      });

      setFormData(prev => ({ ...prev, imageUrl: processed.url }));
      toast.success('Image uploaded successfully');
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setImageUpload(prev => ({ ...prev, uploading: false }));
    }
  };

  // Generate AI image
  const handleAIGenerate = async () => {
    if (!aiImageGeneration.prompt.trim()) {
      toast.warning('Please enter a description for AI image generation');
      return;
    }

    try {
      setAiImageGeneration(prev => ({ ...prev, generating: true }));
      
      const result = await productService.generateAIImage(aiImageGeneration.prompt);
      
      setFormData(prev => ({ ...prev, imageUrl: result.url }));
      setImageUpload({ file: null, preview: result.url, uploading: false });
      
      toast.success('AI image generated successfully');
      
    } catch (error) {
      console.error('Error generating AI image:', error);
      toast.error('Failed to generate AI image');
    } finally {
      setAiImageGeneration(prev => ({ ...prev, generating: false }));
    }
  };

  // Generate barcode
  const generateBarcode = () => {
    const barcode = Date.now().toString().slice(-13);
    setFormData(prev => ({ ...prev, barcode }));
    toast.success('Barcode generated');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        previousPrice: parseFloat(formData.previousPrice) || parseFloat(formData.price),
        purchasePrice: parseFloat(formData.purchasePrice),
        discountValue: parseFloat(formData.discountValue) || 0,
        stock: parseInt(formData.stock),
        profitMargin: calculatedValues.profitMargin,
        minSellingPrice: calculatedValues.minSellingPrice
      };

      await productService.updateProduct(id, productData);
      
      toast.success('Product updated successfully');
      navigate('/admin/products');
      
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  // Reset form to original data
  const handleReset = () => {
    if (originalData) {
      setFormData({
        name: originalData.name || '',
        category: originalData.category || '',
        description: originalData.description || '',
        price: originalData.price?.toString() || '',
        previousPrice: originalData.previousPrice?.toString() || '',
        purchasePrice: originalData.purchasePrice?.toString() || '',
        discountType: originalData.discountType || 'Fixed Amount',
        discountValue: originalData.discountValue?.toString() || '',
        unit: originalData.unit || 'kg',
        stock: originalData.stock?.toString() || '',
        imageUrl: originalData.imageUrl || '',
        barcode: originalData.barcode || '',
        featured: originalData.featured || false,
        isActive: originalData.isActive !== false
      });
      setImageUpload(prev => ({ ...prev, preview: originalData.imageUrl }));
      setErrors({});
      toast.info('Form reset to original values');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="page" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            onClick={() => navigate('/admin/products')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ApperIcon name="ArrowLeft" size={16} />
            <span>Back to Products</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Product</h1>
        <p className="text-gray-600">Update product information • ID: {id}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter product name"
                error={errors.name}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`input-field ${errors.category ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="gram">Gram (g)</option>
                <option value="liter">Liter (L)</option>
                <option value="piece">Piece</option>
                <option value="dozen">Dozen</option>
                <option value="pack">Pack</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`input-field ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Enter product description"
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Inventory */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Pricing & Inventory</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Input
                label="Purchase Price"
                name="purchasePrice"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                placeholder="0.00"
                error={errors.purchasePrice}
                required
              />
            </div>

            <div>
              <Input
                label="Selling Price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                error={errors.price}
                required
              />
            </div>

            <div>
              <Input
                label="Previous Price"
                name="previousPrice"
                type="number"
                step="0.01"
                value={formData.previousPrice}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>

            <div>
              <Input
                label="Stock Quantity"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="0"
                error={errors.stock}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="Fixed Amount">Fixed Amount</option>
                <option value="Percentage">Percentage</option>
              </select>
            </div>

            <div>
              <Input
                label={`Discount Value ${formData.discountType === 'Percentage' ? '(%)' : '(Rs.)'}`}
                name="discountValue"
                type="number"
                step="0.01"
                value={formData.discountValue}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4">
                <Input
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="Enter or generate barcode"
                />
                <Button
                  type="button"
                  onClick={generateBarcode}
                  variant="outline"
                  className="mt-6"
                >
                  Generate
                </Button>
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Price Calculations</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Final Price:</span>
                    <div className="font-semibold text-green-600">
                      Rs. {calculatedValues.finalPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit Margin:</span>
                    <div className="font-semibold text-blue-600">
                      {calculatedValues.profitMargin.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Min. Selling Price:</span>
                    <div className="font-semibold text-orange-600">
                      Rs. {calculatedValues.minSellingPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Stock Value:</span>
                    <div className="font-semibold text-purple-600">
                      Rs. {(calculatedValues.finalPrice * (parseInt(formData.stock) || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Images</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
              {imageUpload.preview ? (
                <div className="space-y-3">
                  <img
                    src={imageUpload.preview}
                    alt="Current"
                    className="w-full h-64 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <ApperIcon name="Upload" size={16} className="mr-2" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ApperIcon name="Upload" size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-900">Click to upload image</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Image URL */}
            <div>
              <Input
                label="Or paste image URL"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
              />
              
              {/* AI Generation */}
              <div className="mt-4 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Describe image to generate..."
                    value={aiImageGeneration.prompt}
                    onChange={(e) => setAiImageGeneration(prev => ({ ...prev, prompt: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={aiImageGeneration.generating}
                    variant="outline"
                  >
                    {aiImageGeneration.generating ? (
                      <Loading type="spinner" />
                    ) : (
                      <ApperIcon name="Wand2" size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Settings</h2>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Featured Product</span>
                <p className="text-xs text-gray-500">Display this product prominently</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Active Product</span>
                <p className="text-xs text-gray-500">Available for sale and visible to customers</p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/products')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <Loading type="spinner" />
            ) : (
              <ApperIcon name="Save" size={16} />
            )}
            <span>Update Product</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;