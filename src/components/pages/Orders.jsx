import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import ApperIcon from "@/components/ApperIcon";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import OrderStatusBadge from "@/components/molecules/OrderStatusBadge";
import { orderService } from "@/services/api/orderService";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment Proof Display Component
  const PaymentProofDisplay = ({ order }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    
    const getPaymentProofUrl = () => {
      if (order.paymentProofUrl) {
        return order.paymentProofUrl;
      }
      if (order.paymentProof?.fileUrl) {
        return order.paymentProof.fileUrl;
      }
      if (order.paymentProofFileName) {
        return `/api/payment-proofs/secure/${order.paymentProofFileName}?order=${order.id}`;
      }
      return null;
    };

    const getThumbnailUrl = () => {
      if (order.paymentProofThumbnailUrl) {
        return order.paymentProofThumbnailUrl;
      }
      if (order.paymentProof?.thumbnailUrl) {
        return order.paymentProof.thumbnailUrl;
      }
      return getPaymentProofUrl();
    };

    const handleDownload = async () => {
      if (!order.paymentProofFileName) return;
      
      setDownloadLoading(true);
      try {
        // Create download link
        const downloadUrl = getPaymentProofUrl();
        if (downloadUrl) {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = order.paymentProof?.originalName || order.paymentProofFileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Download failed:', error);
      } finally {
        setDownloadLoading(false);
      }
    };

    const proofUrl = getPaymentProofUrl();
    const thumbnailUrl = getThumbnailUrl();
    
    if (!proofUrl) {
      return (
        <div className="flex items-center space-x-2 text-gray-500 text-sm">
          <ApperIcon name="AlertCircle" size={16} />
          <span>Payment proof not available</span>
        </div>
      );
    }

    // Check if it's a PDF
    const isPdf = order.paymentProofFileName?.toLowerCase().endsWith('.pdf') || 
                  order.paymentProof?.fileType === 'application/pdf';

    if (isPdf) {
      return (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <ApperIcon name="FileText" size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.paymentProof?.originalName || order.paymentProofFileName}
                </p>
                <p className="text-xs text-gray-500">PDF Document</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloadLoading}
              className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
            >
              {downloadLoading ? (
                <ApperIcon name="Loader" size={16} className="animate-spin" />
              ) : (
                <ApperIcon name="Download" size={16} />
              )}
              <span className="text-sm">Download</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="space-y-3">
          {/* Image Display */}
          <div className="relative">
            {imageLoading && (
              <div className="w-full h-32 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <ApperIcon name="Image" size={24} className="text-gray-400" />
              </div>
            )}
            {!imageError ? (
              <img
                src={thumbnailUrl}
                alt="Payment Proof"
                className={`w-full h-32 object-cover rounded-lg cursor-pointer transition-opacity ${
                  imageLoading ? 'opacity-0 absolute' : 'opacity-100'
                }`}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                onClick={() => window.open(proofUrl, '_blank')}
              />
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <ApperIcon name="ImageOff" size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Image not available</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {order.paymentProof?.originalName || order.paymentProofFileName}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.open(proofUrl, '_blank')}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ApperIcon name="Eye" size={14} />
                <span className="text-xs">View</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                className="flex items-center space-x-1 text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
              >
                {downloadLoading ? (
                  <ApperIcon name="Loader" size={14} className="animate-spin" />
                ) : (
                  <ApperIcon name="Download" size={14} />
                )}
                <span className="text-xs">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
);
  };

  useEffect(() => {
    loadOrders();

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getAll();
      // Sort by most recent first
      const sortedOrders = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sortedOrders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="orders" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadOrders} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Empty 
          type="orders" 
          onAction={() => window.location.href = '/category/All'}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <Link 
          to="/category/All"
          className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
        >
          <ApperIcon name="Plus" size={20} />
          <span>Shop More</span>
        </Link>
      </div>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="card p-6 hover:shadow-premium transition-shadow duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex items-center space-x-4 mb-4 lg:mb-0">
<div className="bg-gradient-to-r from-primary to-accent p-3 rounded-lg">
                  <ApperIcon name="Package" size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.id}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}
                  </p>
                  {order.transactionId && (
                    <p className="text-xs text-gray-500 font-mono">
                      TXN: {order.transactionId}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                  <OrderStatusBadge status={order.status} />
                  {(order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank') && (
                    <div className="flex items-center space-x-1">
                      {order.verificationStatus === 'verified' && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                          <ApperIcon name="CheckCircle" size={12} className="mr-1" />
                          Payment Verified
                        </span>
                      )}
                      {order.verificationStatus === 'rejected' && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center">
                          <ApperIcon name="XCircle" size={12} className="mr-1" />
                          Payment Rejected
                        </span>
                      )}
                      {order.verificationStatus === 'pending' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full flex items-center">
                          <ApperIcon name="Clock" size={12} className="mr-1" />
                          Pending Verification
                        </span>
                      )}
</div>
                  )}
                <div className="text-right">
                  <p className="text-xl font-bold gradient-text">
                    Rs. {(() => {
                      // Calculate subtotal if order total is missing or zero
                      if (!order?.total || order.total === 0) {
                        const itemsSubtotal = order?.items?.reduce((sum, item) => {
                          return sum + ((item.price || 0) * (item.quantity || 0));
                        }, 0) || 0;
                        const deliveryCharge = order?.deliveryCharge || 0;
                        return (itemsSubtotal + deliveryCharge).toLocaleString();
                      }
                      return order.total.toLocaleString();
                    })()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order?.items?.length || 0} items
                  </p>
                </div>
              </div>
            </div>
            {/* Order Items Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.quantity}x</span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-sm text-gray-600">
                    +{order.items.length - 3} more items
                  </div>
                )}
              </div>
</div>

            {/* Payment Information */}
            {(order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank') && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <ApperIcon name="CreditCard" size={14} className="text-gray-500" />
                      <span className="text-sm text-gray-600 capitalize">
                        {order.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ApperIcon name="CheckCircle" size={14} className="text-gray-500" />
                      <span className={`text-sm capitalize ${
                        order.verificationStatus === 'verified' ? 'text-green-600' :
                        order.verificationStatus === 'rejected' ? 'text-red-600' :
                        'text-orange-600'
                      }`}>
                        Payment {order.verificationStatus || 'pending_verification'}
                      </span>
                    </div>
                    {order.transactionId && (
                      <div className="flex items-center space-x-2">
                        <ApperIcon name="Hash" size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-500 font-mono">
                          TID{order.transactionId}
                        </span>
                      </div>
                    )}
                    {order.paymentResult?.gatewayResponse?.reference && (
                      <div className="flex items-center space-x-2">
                        <ApperIcon name="ExternalLink" size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-500">
                          Gateway Ref: {order.paymentResult.gatewayResponse.reference}
                        </span>
                      </div>
                    )}
                  </div>
                  
{(order.paymentProof || order.paymentProofUrl) && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <ApperIcon name="FileImage" size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-600">Payment proof submitted</span>
                        </div>
                        <PaymentProofDisplay order={order} />
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Order Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <ApperIcon name="MapPin" size={16} />
                  <span>{order.deliveryAddress.city}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ApperIcon name="CreditCard" size={16} />
                  <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Link 
                  to={`/orders/${order.id}`}
                  className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors"
                >
                  <ApperIcon name="Eye" size={16} />
                  <span>View Details</span>
                </Link>
                
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
                  <ApperIcon name="MessageCircle" size={16} />
                  <span>Chat Support</span>
                </button>
                
                {order.status === 'delivered' && (
                  <button className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors">
                    <ApperIcon name="RotateCcw" size={16} />
                    <span>Reorder</span>
                  </button>
                )}
              </div>
            </div>
</div>
        ))}
      </div>
    </div>
  );
};

export default Orders;