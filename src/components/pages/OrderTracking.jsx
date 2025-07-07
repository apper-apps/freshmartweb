import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ApperIcon from '@/components/ApperIcon';
import OrderStatusBadge from '@/components/molecules/OrderStatusBadge';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import { orderService } from '@/services/api/orderService';

// Payment Proof Image Component with enhanced error handling and retry functionality
const PaymentProofImage = ({ order }) => {
  const [imageState, setImageState] = useState({
    loading: true,
    error: false,
    retryCount: 0,
    src: orderService.getPaymentProofThumbnailUrl(order)
  });

  const handleImageLoad = () => {
    setImageState(prev => ({
      ...prev,
      loading: false,
      error: false
    }));
  };

  const handleImageError = (e) => {
    console.warn('Failed to load payment proof image:', e.target.src);
    
    // Don't retry if already a placeholder or after 2 attempts
    if (e.target.src.startsWith('data:image/svg+xml') || imageState.retryCount >= 2) {
      setImageState(prev => ({
        ...prev,
        loading: false,
        error: true
      }));
      return;
    }

    // Try alternative URL generation or increment retry
    setImageState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      loading: false,
      error: true
    }));
  };

  const handleRetry = () => {
    setImageState(prev => ({
      ...prev,
      loading: true,
      error: false,
      src: orderService.getPaymentProofUrl(order) // Try full URL instead of thumbnail
    }));
  };

  const handleViewFullImage = () => {
    const fullImageUrl = orderService.getPaymentProofUrl(order);
    if (fullImageUrl && !fullImageUrl.startsWith('data:image/svg+xml')) {
      window.open(fullImageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <ApperIcon name="FileText" size={16} className="text-gray-500" />
        <span className="text-gray-900">Payment proof uploaded</span>
      </div>
      
      <div className="relative group">
        {imageState.loading && (
          <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
            <div className="animate-spin">
              <ApperIcon name="Loader2" size={16} className="text-gray-400" />
            </div>
          </div>
        )}
        
        {imageState.error && !imageState.loading ? (
          <div className="w-20 h-20 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center space-y-1">
            <ApperIcon name="ImageOff" size={16} className="text-gray-400" />
            <button
              onClick={handleRetry}
              className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <img
            src={imageState.src}
            alt="Payment proof thumbnail"
            className={`w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-all duration-200 ${
              imageState.loading ? 'opacity-0 absolute' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={handleViewFullImage}
          />
        )}
        
        {!imageState.loading && !imageState.error && (
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ApperIcon name="Expand" size={16} className="text-white" />
          </div>
        )}
      </div>
      
      {imageState.error && imageState.retryCount >= 2 && (
        <p className="text-xs text-gray-500">Payment proof image not available</p>
      )}
    </div>
  );
};
const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getById(parseInt(orderId));
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: 'ShoppingCart' },
      { key: 'confirmed', label: 'Confirmed', icon: 'CheckCircle' },
      { key: 'packed', label: 'Packed', icon: 'Package' },
      { key: 'shipped', label: 'Shipped', icon: 'Truck' },
      { key: 'delivered', label: 'Delivered', icon: 'Home' }
    ];

    const currentIndex = steps.findIndex(step => step.key === order?.status?.toLowerCase());
    
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="default" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadOrder} type="not-found" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message="Order not found" onRetry={() => navigate('/orders')} type="not-found" />
      </div>
    );
  }

  const statusSteps = getStatusSteps();

return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ApperIcon name="ArrowLeft" size={20} />
          <span>Back to Orders</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
            <ApperIcon name="MessageCircle" size={16} />
            <span>Chat Support</span>
          </button>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Order Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-gray-600">
              Placed on {format(new Date(order.createdAt), 'MMMM dd, yyyy • hh:mm a')}
            </p>
          </div>
<div className="text-right">
            <p className="text-2xl font-bold gradient-text">
              Rs. {(order?.total || 0).toLocaleString()}
            </p>
            <p className="text-gray-600">{(order?.items || []).length} items</p>
          </div>
        </div>
      </div>

      {/* Order Status Timeline */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
        
        <div className="relative">
          {statusSteps.map((step, index) => (
            <div key={step.key} className="flex items-center mb-6 last:mb-0">
              <div className={`
                relative z-10 flex items-center justify-center w-10 h-10 rounded-full
                ${step.completed 
                  ? 'bg-gradient-to-r from-primary to-accent text-white' 
                  : 'bg-gray-200 text-gray-400'
                }
              `}>
                <ApperIcon name={step.icon} size={20} />
              </div>
              
              <div className="ml-4 flex-1">
                <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.active && (
                  <p className="text-sm text-primary">Current status</p>
                )}
              </div>
              
              {index < statusSteps.length - 1 && (
                <div className={`
                  absolute left-5 top-10 w-0.5 h-6 -ml-px
                  ${step.completed ? 'bg-primary' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          
          <div className="space-y-4">
{(order?.items || []).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item?.name || 'Unknown Item'}</p>
                  <p className="text-sm text-gray-600">
                    {item?.quantity || 0} x Rs. {(item?.price || 0).toLocaleString()}
                  </p>
                </div>
                <p className="font-medium">
                  Rs. {((item?.quantity || 0) * (item?.price || 0)).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          
<div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">Rs. {((order?.total || 0) - (order?.deliveryCharge || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Delivery Charge</span>
              <span className="font-medium">Rs. {(order?.deliveryCharge || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold gradient-text">
                Rs. {(order?.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <ApperIcon name="User" size={16} className="text-gray-500" />
                <span className="text-gray-900">{order.deliveryAddress.name}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <ApperIcon name="Phone" size={16} className="text-gray-500" />
                <span className="text-gray-900">{order.deliveryAddress.phone}</span>
              </div>
              
              {order.deliveryAddress.email && (
                <div className="flex items-center space-x-3">
                  <ApperIcon name="Mail" size={16} className="text-gray-500" />
                  <span className="text-gray-900">{order.deliveryAddress.email}</span>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <ApperIcon name="MapPin" size={16} className="text-gray-500 mt-1" />
                <div>
                  <p className="text-gray-900">{order.deliveryAddress.address}</p>
                  <p className="text-gray-600">
                    {order.deliveryAddress.city}
                    {order.deliveryAddress.postalCode && `, ${order.deliveryAddress.postalCode}`}
                  </p>
                </div>
              </div>
              
              {order.deliveryAddress.instructions && (
                <div className="flex items-start space-x-3">
                  <ApperIcon name="MessageSquare" size={16} className="text-gray-500 mt-1" />
                  <p className="text-gray-900">{order.deliveryAddress.instructions}</p>
                </div>
              )}
            </div>
          </div>

{/* Payment Information */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <ApperIcon name="CreditCard" size={16} className="text-gray-500" />
                <span className="text-gray-900 capitalize">
                  {order.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <ApperIcon name="CheckCircle" size={16} className="text-gray-500" />
                <span className={`text-gray-900 capitalize ${
                  order.paymentStatus === 'completed' ? 'text-green-600' :
                  order.paymentStatus === 'pending' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  Payment {order.paymentStatus}
                </span>
              </div>

              {order.paymentResult && (
                <div className="flex items-center space-x-3">
                  <ApperIcon name="Hash" size={16} className="text-gray-500" />
                  <span className="text-gray-900 font-mono text-sm">
                    {order.paymentResult.transactionId}
                  </span>
                </div>
              )}

              {order.paymentResult?.gatewayResponse && (
                <div className="flex items-center space-x-3">
                  <ApperIcon name="ExternalLink" size={16} className="text-gray-500" />
                  <span className="text-gray-900 text-sm">
                    Gateway Ref: {order.paymentResult.gatewayResponse.reference}
                  </span>
                </div>
              )}
              
{order.paymentProof && (
                <PaymentProofImage order={order} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;