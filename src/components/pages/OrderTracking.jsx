import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ApperIcon from '@/components/ApperIcon';
import OrderStatusBadge from '@/components/molecules/OrderStatusBadge';
import Loading from '@/components/ui/Loading';
import Error from '@/components/ui/Error';
import { orderService } from '@/services/api/orderService';

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
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <ApperIcon name="FileText" size={16} className="text-gray-500" />
                    <span className="text-gray-900">Payment proof uploaded</span>
                  </div>
<div className="relative">
<img
                      src={orderService.getPaymentProofThumbnailUrl(order)}
                      alt="Payment proof thumbnail"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => {
                        const fullImageUrl = orderService.getPaymentProofUrl(order);
                        window.open(fullImageUrl, '_blank');
                      }}
                      onError={(e) => {
                        console.warn('Failed to load payment proof image:', e.target.src);
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUgxMTVWMTE1SDg1Vjg1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNzAgNzBIMTMwVjEzMEg3MFY3MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEyIj5QYXltZW50IFByb29mPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEwIj5VbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                        e.target.alt = 'Payment proof image not available';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;