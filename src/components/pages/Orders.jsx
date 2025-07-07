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

  useEffect(() => {
    loadOrders();
  }, []);

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
                          <span className="text-sm text-gray-600">Payment proof uploaded</span>
                        </div>
                        {order.paymentProof && (
                          <div className="relative group">
                            <div className="w-30 h-30 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                              <img
                                className="w-30 h-30 object-cover cursor-pointer transition-transform hover:scale-105"
                                src={orderService.getPaymentProofThumbnailUrl(order)}
                                alt="Payment Proof Thumbnail"
                                style={{ width: '120px', height: '120px' }}
                                loading="lazy"
                                onClick={() => {
                                  const fullImageUrl = orderService.getPaymentProofUrl(order);
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
                                  modal.innerHTML = `
                                    <div class="relative max-w-6xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl">
                                      <div class="relative">
                                        <div class="flex items-center justify-center min-h-[500px] bg-gray-100">
                                          <div class="absolute inset-0 flex items-center justify-center">
                                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                          </div>
                                          <img 
                                            src="${fullImageUrl}" 
                                            alt="Payment proof fullscreen" 
                                            class="max-w-full max-h-[85vh] mx-auto block object-contain relative z-10"
                                            style="background: white;"
                                            onload="
                                              this.parentElement.querySelector('.animate-spin').style.display = 'none';
                                              this.parentElement.classList.remove('bg-gray-100');
                                              this.style.opacity = '1';
                                            "
style="opacity: 0; transition: opacity 0.3s ease;"
                                            onload="
                                              this.parentElement.querySelector('.animate-spin').style.display = 'none';
                                              this.parentElement.classList.remove('bg-gray-100');
                                              this.style.opacity = '1';
                                            "
                                            onerror="
                                              let retryCount = parseInt(this.dataset.retryCount || '0');
                                              if (retryCount < 3) {
                                                this.dataset.retryCount = retryCount + 1;
                                                setTimeout(() => {
                                                  this.src = this.src.includes('?') ? this.src + '&retry=' + retryCount : this.src + '?retry=' + retryCount;
                                                }, 1000 * Math.pow(2, retryCount));
                                              } else {
                                                this.parentElement.querySelector('.animate-spin').style.display = 'none';
                                                this.style.display = 'none';
                                                this.parentElement.innerHTML = '<div class=\\'text-center p-8\\'><div class=\\'w-24 h-24 mx-auto mb-4 bg-gray-300 rounded-lg flex items-center justify-center\\'><svg class=\\'w-12 h-12 text-gray-500\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z\\'></path></svg></div><p class=\\'text-gray-600\\'>Payment proof temporarily unavailable</p><p class=\\'text-sm text-gray-500 mt-2\\'>Failed to load after 3 attempts</p></div>';
                                              }
                                            "
                                          />
                                        <div class="absolute top-4 right-4 flex space-x-2">
                                          <button class="download-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg flex items-center space-x-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                                            </svg>
                                            <span>Download</span>
                                          </button>
                                          <button class="verify-btn bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg flex items-center space-x-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                            <span>Verify</span>
                                          </button>
                                          <button class="close-btn bg-black/50 hover:bg-black/70 text-white p-3 rounded-lg transition-colors shadow-lg">
                                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
<div class="p-6 bg-gray-50 border-t">
                                        <div class="text-center">
                                          <h3 class="text-lg font-semibold text-gray-900 mb-4">Payment Proof - Order #${order.id}</h3>
                                          <div class="grid grid-cols-2 gap-6 text-sm text-gray-600">
                                            <div>
                                              <span class="font-medium text-gray-800">Transaction ID:</span>
                                              <p class="font-mono text-gray-900 mt-1">${order.transactionId || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <span class="font-medium text-gray-800">Payment Method:</span>
                                              <p class="capitalize text-gray-900 mt-1">${order.paymentMethod || 'Unknown'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  `;
                                  
// Event handlers
                                  const closeBtn = modal.querySelector('.close-btn');
                                  const verifyBtn = modal.querySelector('.verify-btn');
                                  const downloadBtn = modal.querySelector('.download-btn');
                                  
                                  const closeModal = () => {
                                    document.body.removeChild(modal);
                                    document.body.style.overflow = '';
                                  };
                                  
                                  closeBtn.onclick = closeModal;
                                  verifyBtn.onclick = () => {
                                    // Admin verification action
                                    alert('Verification feature - Admin access required');
                                  };
                                  
                                  downloadBtn.onclick = async () => {
                                    try {
                                      const downloadUrl = orderService.getPaymentProofUrl(order);
                                      if (!downloadUrl.startsWith('data:image/svg+xml')) {
                                        // Create download link
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = `payment_proof_order_${order.id}.jpg`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        toast.success('Payment proof download started');
                                      } else {
                                        toast.error('Payment proof not available for download');
                                      }
                                    } catch (error) {
                                      console.error('Download failed:', error);
                                      toast.error('Failed to download payment proof');
                                    }
                                  };
                                  modal.onclick = (e) => {
                                    if (e.target === modal) {
                                      closeModal();
                                    }
                                  };
                                  
                                  document.body.style.overflow = 'hidden';
                                  document.body.appendChild(modal);
                                }}
                                onError={(e) => {
                                  console.warn('Failed to load payment proof thumbnail:', e.target.src);
                                  let retryCount = parseInt(e.target.dataset.retryCount || '0');
                                  if (retryCount < 2 && !e.target.src.startsWith('data:image/svg+xml')) {
                                    e.target.dataset.retryCount = retryCount + 1;
                                    setTimeout(() => {
                                      const newUrl = orderService.getPaymentProofThumbnailUrl(order);
                                      e.target.src = newUrl.includes('?') ? newUrl + '&retry=' + retryCount : newUrl + '?retry=' + retryCount;
                                    }, 1000 * Math.pow(2, retryCount));
                                  } else if (!e.target.src.startsWith('data:image/svg+xml')) {
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA1MEg3MFY3MEg1MFY1MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA="';
                                    e.target.alt = 'Payment proof thumbnail unavailable';
                                  }
                                }}
                              />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full flex items-center space-x-1">
                                <ApperIcon name="Eye" size={14} className="text-gray-700" />
                                <span className="text-xs font-medium text-gray-700">View Full</span>
                              </div>
                            </div>
                          </div>
                        )}
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