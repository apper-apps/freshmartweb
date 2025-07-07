import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ApperIcon from '@/components/ApperIcon';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Loading from '@/components/ui/Loading';
import productService from '@/services/api/productService';

const AddProduct = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form state
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  
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

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productService.getCategories();
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Failed to load categories');
      }
    };
    loadCategories();
  }, []);

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

  // Validate form step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        break;
      case 2: // Pricing & Inventory
        if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
        if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) newErrors.purchasePrice = 'Valid purchase price is required';
        if (!formData.stock || parseInt(formData.stock) < 0) newErrors.stock = 'Valid stock quantity is required';
        if (parseFloat(formData.price) <= parseFloat(formData.purchasePrice)) {
          newErrors.price = 'Selling price must be higher than purchase price';
        }
        break;
      case 3: // Images
        if (!formData.imageUrl && !imageUpload.preview) {
          newErrors.imageUrl = 'Product image is required';
        }
        break;
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

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } };
      handleFileUpload(fakeEvent);
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

  // Search external images
  const handleImageSearch = async () => {
    if (!formData.name.trim()) {
      toast.warning('Please enter product name first');
      return;
    }

    try {
      const results = await productService.searchImages(formData.name);
      setAiImageGeneration(prev => ({ ...prev, suggestions: results }));
    } catch (error) {
      console.error('Error searching images:', error);
      toast.error('Failed to search images');
    }
  };

  // Select suggested image
  const handleSelectSuggestion = (imageUrl) => {
    setFormData(prev => ({ ...prev, imageUrl }));
    setImageUpload({ file: null, preview: imageUrl, uploading: false });
    setAiImageGeneration(prev => ({ ...prev, suggestions: [] }));
    toast.success('Image selected successfully');
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
    
    if (!validateStep(currentStep)) return;
    
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    try {
      setLoading(true);
      
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

      await productService.createProduct(productData);
      
      toast.success('Product created successfully');
      navigate('/admin/products');
      
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Basic Information', icon: 'Info' },
    { id: 2, title: 'Pricing & Inventory', icon: 'DollarSign' },
    { id: 3, title: 'Images', icon: 'Image' },
    { id: 4, title: 'Review', icon: 'CheckCircle' }
  ];

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Product</h1>
        <p className="text-gray-600">Create a new product for your inventory</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-primary border-primary text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                <ApperIcon name={step.icon} size={20} />
              </div>
              <div className="ml-3 hidden sm:block">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-8 lg:w-16 ml-4 ${
                  currentStep > step.id ? 'bg-primary' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
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
        )}

        {/* Step 2: Pricing & Inventory */}
        {currentStep === 2 && (
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
                  label="Previous Price (Optional)"
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
        )}

        {/* Step 3: Images */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Manual Upload */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Images</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      imageUpload.uploading ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imageUpload.uploading ? (
                      <div className="flex items-center justify-center">
                        <Loading type="spinner" />
                        <span className="ml-2 text-blue-600">Uploading...</span>
                      </div>
                    ) : imageUpload.preview ? (
                      <div className="space-y-3">
                        <img
                          src={imageUpload.preview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg mx-auto"
                        />
                        <p className="text-sm text-green-600">Image uploaded successfully</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ApperIcon name="Upload" size={48} className="mx-auto text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {errors.imageUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.imageUrl}</p>
                  )}
                </div>

                {/* Direct URL */}
                <div>
                  <Input
                    label="Or paste image URL"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.imageUrl && !imageUpload.preview && (
                    <div className="mt-3">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={() => toast.error('Invalid image URL')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Image Generation */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Image Generation</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <Input
                    placeholder="Describe the product image you want to generate..."
                    value={aiImageGeneration.prompt}
                    onChange={(e) => setAiImageGeneration(prev => ({ ...prev, prompt: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAIGenerate}
                    disabled={aiImageGeneration.generating}
                    className="flex items-center space-x-2"
                  >
                    {aiImageGeneration.generating ? (
                      <Loading type="spinner" />
                    ) : (
                      <ApperIcon name="Wand2" size={16} />
                    )}
                    <span>Generate</span>
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={handleImageSearch}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <ApperIcon name="Search" size={16} />
                    <span>Search Images</span>
                  </Button>
                </div>

                {/* Image Suggestions */}
                {aiImageGeneration.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Suggested Images:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {aiImageGeneration.suggestions.map((image, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary"
                          onClick={() => handleSelectSuggestion(image.url)}
                        >
                          <img
                            src={image.thumbnail}
                            alt={image.description}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Review Product</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Preview */}
              <div>
                <div className="border rounded-lg p-4">
                  {(formData.imageUrl || imageUpload.preview) && (
                    <img
                      src={formData.imageUrl || imageUpload.preview}
                      alt={formData.name}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{formData.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{formData.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      Rs. {calculatedValues.finalPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formData.stock} {formData.unit} in stock
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Product Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{formData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unit:</span>
                      <span className="font-medium">{formData.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Barcode:</span>
                      <span className="font-medium">{formData.barcode || 'Auto-generated'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Price:</span>
                      <span className="font-medium">Rs. {parseFloat(formData.purchasePrice || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selling Price:</span>
                      <span className="font-medium">Rs. {parseFloat(formData.price || 0).toLocaleString()}</span>
                    </div>
                    {formData.discountValue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-orange-600">
                          {formData.discountValue}{formData.discountType === 'Percentage' ? '%' : ' Rs.'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Final Price:</span>
                      <span className="font-bold text-green-600">Rs. {calculatedValues.finalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className="font-medium text-blue-600">{calculatedValues.profitMargin.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Settings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Featured Product:</span>
                      <span className={`font-medium ${formData.featured ? 'text-green-600' : 'text-gray-600'}`}>
                        {formData.featured ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${formData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={formData.featured}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Featured Product</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Active Product</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ApperIcon name="ChevronLeft" size={16} />
            <span>Previous</span>
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loading type="spinner" />
            ) : currentStep === 4 ? (
              <>
                <ApperIcon name="Check" size={16} />
                <span>Create Product</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ApperIcon name="ChevronRight" size={16} />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;