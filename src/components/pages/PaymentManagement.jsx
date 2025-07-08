import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-toastify";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";

// Payment Gateway Management Component
const PaymentGatewayManagement = ({ paymentMethods, onGatewayUpdate }) => {
  const [isAddingGateway, setIsAddingGateway] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({
    name: '',
    accountName: '',
    accountNumber: '',
    instructions: '',
    fee: 0,
    enabled: true
  });
  const [processing, setProcessing] = useState(false);

  const resetForm = () => {
    setGatewayForm({
      name: '',
      accountName: '',
      accountNumber: '',
      instructions: '',
      fee: 0,
      enabled: true
    });
    setIsAddingGateway(false);
    setEditingGateway(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGatewayForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gatewayForm.name || !gatewayForm.accountName || !gatewayForm.accountNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      if (editingGateway) {
        await paymentService.updateGateway(editingGateway.Id, gatewayForm);
        toast.success('Payment gateway updated successfully');
      } else {
        await paymentService.createGateway(gatewayForm);
        toast.success('Payment gateway added successfully');
      }
      resetForm();
      onGatewayUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to save payment gateway');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (gateway) => {
    setGatewayForm({
      name: gateway.name,
      accountName: gateway.accountName || '',
      accountNumber: gateway.accountNumber || '',
      instructions: gateway.instructions || '',
      fee: gateway.fee || 0,
      enabled: gateway.enabled
    });
    setEditingGateway(gateway);
    setIsAddingGateway(true);
  };

  const handleDelete = async (gatewayId) => {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    setProcessing(true);
    try {
      await paymentService.deleteGateway(gatewayId);
      toast.success('Payment gateway deleted successfully');
      onGatewayUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment gateway');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleEnabled = async (gatewayId, currentEnabled) => {
    setProcessing(true);
    try {
      if (currentEnabled) {
        await paymentService.disableGateway(gatewayId);
        toast.success('Payment gateway disabled');
      } else {
        await paymentService.enableGateway(gatewayId);
        toast.success('Payment gateway enabled');
      }
      onGatewayUpdate();
    } catch (error) {
      toast.error(error.message || 'Failed to update gateway status');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment Gateway Management</h3>
        <Button
          onClick={() => setIsAddingGateway(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
        >
          <ApperIcon name="Plus" size={16} className="mr-2" />
          Add Gateway
        </Button>
      </div>

      {/* Add/Edit Gateway Form */}
      {isAddingGateway && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingGateway ? 'Edit Payment Gateway' : 'Add New Payment Gateway'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Gateway Name *"
                  name="name"
                  value={gatewayForm.name}
                  onChange={handleInputChange}
                  placeholder="e.g., JazzCash, EasyPaisa, Bank Transfer"
                  required
                />
              </div>
              <div>
                <Input
                  label="Account Name *"
                  name="accountName"
                  value={gatewayForm.accountName}
                  onChange={handleInputChange}
                  placeholder="Account holder name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Account Number *"
                  name="accountNumber"
                  value={gatewayForm.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Account number or wallet ID"
                  required
                />
              </div>
              <div>
                <Input
                  label="Transaction Fee (%)"
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={gatewayForm.fee}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Instructions
              </label>
              <textarea
                name="instructions"
                value={gatewayForm.instructions}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Instructions for customers on how to make payment..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={gatewayForm.enabled}
                onChange={handleInputChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                Enable this gateway for customers
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={processing}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {processing ? (
                  <>
                    <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                    {editingGateway ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <ApperIcon name="Save" size={16} className="mr-2" />
                    {editingGateway ? 'Update Gateway' : 'Add Gateway'}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Gateways List */}
      <div className="space-y-4">
        {paymentMethods.map((gateway) => (
          <div key={gateway.Id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-gray-900">{gateway.name}</h4>
                  <button
                    onClick={() => handleToggleEnabled(gateway.Id, gateway.enabled)}
                    disabled={processing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      gateway.enabled ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        gateway.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    gateway.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {gateway.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account Name:</span>
                    <p className="font-medium">{gateway.accountName || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Number:</span>
                    <p className="font-medium font-mono">{gateway.accountNumber || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fee:</span>
                    <p className="font-medium">
                      {gateway.fee > 0 ? `${(gateway.fee * 100).toFixed(1)}%` : 'Free'}
                    </p>
                  </div>
                </div>

                {gateway.instructions && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">Instructions:</span>
                    <p className="text-sm text-gray-700 mt-1">{gateway.instructions}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(gateway)}
                  disabled={processing}
                >
                  <ApperIcon name="Edit" size={14} />
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => handleDelete(gateway.Id)}
                  disabled={processing}
                >
                  <ApperIcon name="Trash2" size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {paymentMethods.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ApperIcon name="CreditCard" size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Payment Gateways</p>
            <p className="text-sm">Add your first payment gateway to start accepting payments</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Payment Proof Viewer Component for Admin
const PaymentProofViewer = ({ verification, userRole = 'admin' }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState(null);

  const getImageUrl = () => {
    // Try multiple sources for image URL
    if (verification.paymentProofUrl) return verification.paymentProofUrl;
    if (verification.paymentProof?.fileUrl) return verification.paymentProof.fileUrl;
    if (verification.paymentProofFileName) {
      return `/api/payment-proofs/secure/${verification.paymentProofFileName}?order=${verification.orderId}&auth=admin`;
    }
    return null;
  };

  const getThumbnailUrl = () => {
    if (verification.paymentProofThumbnail) return verification.paymentProofThumbnail;
    if (verification.paymentProof?.thumbnailUrl) return verification.paymentProof.thumbnailUrl;
    return getImageUrl(); // Fallback to full image
  };

  const handleDownload = async () => {
    if (!verification.paymentProofFileName) return;
    
    setDownloadLoading(true);
    try {
      // Get secure download URL for admin
      const response = await fetch(`/api/admin/payment-proofs/${verification.paymentProofFileName}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || 'mock-admin-token'}`,
          'User-Role': userRole
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = verification.paymentProof?.originalName || verification.paymentProofFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        toast.success('Payment proof downloaded successfully');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download payment proof');
      // Fallback to direct URL
      const imageUrl = getImageUrl();
      if (imageUrl) {
        window.open(imageUrl, '_blank');
      }
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleViewFullImage = () => {
    const imageUrl = getImageUrl();
    if (imageUrl) {
      setFullImageUrl(imageUrl);
    }
  };

  const imageUrl = getImageUrl();
  const thumbnailUrl = getThumbnailUrl();
  
  if (!imageUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-gray-500">
          <ApperIcon name="AlertCircle" size={16} />
          <span className="text-sm">Payment proof not available</span>
        </div>
      </div>
    );
  }

  // Check if it's a PDF
  const isPdf = verification.paymentProofFileName?.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <ApperIcon name="FileText" size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {verification.paymentProofFileName}
              </p>
              <p className="text-xs text-gray-500">PDF Document</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(imageUrl, '_blank')}
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
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="space-y-3">
        {/* Image Display */}
        <div className="relative">
          {imageLoading && (
            <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
              <ApperIcon name="Image" size={32} className="text-gray-400" />
            </div>
          )}
          {!imageError ? (
            <img
              src={thumbnailUrl}
              alt="Payment Proof"
              className={`w-full h-48 object-cover rounded-lg cursor-pointer transition-opacity hover:opacity-90 ${
                imageLoading ? 'opacity-0 absolute' : 'opacity-100'
              }`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onClick={handleViewFullImage}
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ApperIcon name="ImageOff" size={32} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Image failed to load</p>
                <button
                  onClick={() => window.open(imageUrl, '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  Try opening in new tab
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Image Info and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {verification.paymentProofFileName}
            </p>
            <p className="text-xs text-gray-500">
              Submitted for Order #{verification.orderId}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleViewFullImage}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ApperIcon name="Eye" size={14} />
              <span className="text-xs">View Full</span>
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

      {/* Full Image Modal */}
      {fullImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setFullImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              onClick={() => setFullImageUrl(null)}
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <ApperIcon name="X" size={16} />
            </button>
            <img
              src={fullImageUrl}
              alt="Payment Proof - Full Size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0,
    walletBalance: 0,
    pendingRefunds: 0,
    pendingVerifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMethod, setFilterMethod] = useState('all');
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [processingVerification, setProcessingVerification] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'BarChart3' },
    { id: 'transactions', label: 'Transactions', icon: 'CreditCard' },
    { id: 'wallet', label: 'Wallet Management', icon: 'Wallet' },
    { id: 'methods', label: 'Payment Methods', icon: 'Settings' },
    { id: 'verification', label: 'Payment Verification', icon: 'Shield' },
    { id: 'refunds', label: 'Refunds', icon: 'RefreshCw' }
  ];

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allTransactions, walletTxns, methods, orders, verifications] = await Promise.all([
        paymentService.getAllTransactions(),
        paymentService.getWalletTransactions(),
        paymentService.getAvailablePaymentMethods(),
        orderService.getAll(),
        orderService.getPendingVerifications()
      ]);

      const walletBalance = await paymentService.getWalletBalance();

      // Calculate stats
      const successfulTxns = allTransactions.filter(t => t.status === 'completed');
      const failedTxns = allTransactions.filter(t => t.status === 'failed');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + t.amount, 0);
      const pendingRefunds = orders.filter(o => o.refundRequested).length;
      const pendingVerificationsCount = verifications.length;

      setStats({
        totalTransactions: allTransactions.length,
        successfulTransactions: successfulTxns.length,
        failedTransactions: failedTxns.length,
        totalRevenue,
        walletBalance,
        pendingRefunds,
        pendingVerifications: pendingVerificationsCount
      });

      setTransactions(allTransactions);
      setWalletTransactions(walletTxns);
      setPaymentMethods(methods);
      setPendingVerifications(verifications);

    } catch (err) {
      setError(err.message);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  useEffect(() => {
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.find(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleRefundProcess = async (orderId) => {
    if (!refundAmount || !refundReason) {
      toast.error('Please provide refund amount and reason');
      return;
    }

    setProcessingRefund(true);
    try {
      await orderService.processRefund(parseInt(orderId), parseFloat(refundAmount), refundReason);
      toast.success('Refund processed successfully');
      setRefundAmount('');
      setRefundReason('');
      setSelectedTransactionId(null);
      loadPaymentData();
    } catch (error) {
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
};

  const handleVerificationAction = async (orderId, action, notes = '') => {
    setProcessingVerification(true);
    try {
      const status = action === 'approve' ? 'verified' : 'rejected';
      await orderService.updateVerificationStatus(orderId, status, notes);
      
      toast.success(`Payment ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadPaymentData();
    } catch (error) {
      toast.error(error.message || `Failed to ${action} payment`);
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleWalletAction = async (action, amount) => {
    try {
      let result;
      switch (action) {
        case 'deposit':
          result = await paymentService.depositToWallet(amount);
          toast.success(`Deposited Rs. ${amount.toLocaleString()} to wallet`);
          break;
        case 'withdraw':
          result = await paymentService.withdrawFromWallet(amount);
          toast.success(`Withdrew Rs. ${amount.toLocaleString()} from wallet`);
          break;
        case 'transfer':
          result = await paymentService.transferFromWallet(amount);
          toast.success(`Transferred Rs. ${amount.toLocaleString()} from wallet`);
          break;
        default:
          break;
      }
      loadPaymentData();
    } catch (error) {
      toast.error(error.message || 'Wallet operation failed');
    }
  };


const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.orderId.toString().includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
      const matchesMethod = filterMethod === 'all' || transaction.paymentMethod === filterMethod;
      
      return matchesSearch && matchesStatus && matchesMethod;
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading type="dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Error message={error} onRetry={loadPaymentData} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Management</h1>
        <p className="text-gray-600">Manage payments, transactions, and refunds</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold">Rs. {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="DollarSign" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Successful Transactions</p>
              <p className="text-3xl font-bold">{stats.successfulTransactions}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="CheckCircle" size={24} />
            </div>
          </div>
        </div>

<div className="card p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Wallet Balance</p>
              <p className="text-3xl font-bold">Rs. {stats.walletBalance.toLocaleString()}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Wallet" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pending Verifications</p>
              <p className="text-3xl font-bold">{stats.pendingVerifications}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <ApperIcon name="Shield" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ApperIcon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold">{stats.totalTransactions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold text-green-600">
                    {stats.totalTransactions > 0 ? 
                      ((stats.successfulTransactions / stats.totalTransactions) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Failed Transactions</span>
                  <span className="font-semibold text-red-600">{stats.failedTransactions}</span>
                </div>
<div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Refunds</span>
                  <span className="font-semibold text-orange-600">{stats.pendingRefunds}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Verifications</span>
                  <span className="font-semibold text-yellow-600">{stats.pendingVerifications}</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => handleWalletAction('deposit', 10000)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <ApperIcon name="Plus" size={16} className="mr-2" />
                  Add Rs. 10,000 to Wallet
                </Button>
                <Button
                  onClick={() => setActiveTab('refunds')}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                  Process Refunds
                </Button>
                <Button
                  onClick={() => setActiveTab('transactions')}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  <ApperIcon name="Search" size={16} className="mr-2" />
                  View All Transactions
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="wallet">Wallet</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactions().map((transaction) => (
                    <tr key={transaction.Id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{transaction.transactionId}</td>
                      <td className="py-3 px-4">#{transaction.orderId}</td>
                      <td className="py-3 px-4 font-medium">Rs. {transaction.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 capitalize">{transaction.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {format(new Date(transaction.timestamp), 'MMM dd, yyyy hh:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Management</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm">Current Balance</p>
                      <p className="text-2xl font-bold">Rs. {stats.walletBalance.toLocaleString()}</p>
                    </div>
                    <ApperIcon name="Wallet" size={32} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleWalletAction('deposit', 5000)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <ApperIcon name="Plus" size={16} className="mr-2" />
                    Deposit Rs. 5,000
                  </Button>
                  <Button
                    onClick={() => handleWalletAction('withdraw', 1000)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <ApperIcon name="Minus" size={16} className="mr-2" />
                    Withdraw Rs. 1,000
                  </Button>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Wallet Transactions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {walletTransactions.map((transaction) => (
                  <div key={transaction.Id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'deposit' ? 'bg-green-100' : 
                        transaction.type === 'withdraw' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <ApperIcon 
                          name={transaction.type === 'deposit' ? 'ArrowDown' : 
                                transaction.type === 'withdraw' ? 'ArrowUp' : 'ArrowRight'} 
                          size={16} 
                          className={
                            transaction.type === 'deposit' ? 'text-green-600' : 
                            transaction.type === 'withdraw' ? 'text-red-600' : 'text-blue-600'
                          } 
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(transaction.timestamp), 'MMM dd, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      transaction.type === 'deposit' ? 'text-green-600' : 
                      transaction.type === 'withdraw' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'deposit' ? '+' : '-'}Rs. {transaction.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

{activeTab === 'methods' && (
          <div className="space-y-6">
            <PaymentGatewayManagement 
              paymentMethods={paymentMethods}
              onGatewayUpdate={loadPaymentData}
            />
          </div>
        )}

        {activeTab === 'refunds' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Process Refunds</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Refund Request</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order ID
                    </label>
                    <Input
                      placeholder="Enter order ID"
                      value={selectedTransactionId || ''}
                      onChange={(e) => setSelectedTransactionId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter refund amount"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      rows="3"
                      placeholder="Enter refund reason"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleRefundProcess(selectedTransactionId)}
                    disabled={processingRefund || !selectedTransactionId || !refundAmount || !refundReason}
                    className="w-full"
                  >
                    {processingRefund ? (
                      <>
                        <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ApperIcon name="RefreshCw" size={16} className="mr-2" />
                        Process Refund
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Recent Refunds</h4>
                <div className="space-y-3">
                  {stats.pendingRefunds > 0 ? (
                    <div className="text-center py-8">
                      <ApperIcon name="RefreshCw" size={48} className="text-orange-400 mx-auto mb-4" />
                      <p className="text-gray-600">{stats.pendingRefunds} pending refunds</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ApperIcon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
                      <p className="text-gray-600">No pending refunds</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
</div>
        )}

        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment Verification Queue</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ApperIcon name="Clock" size={16} />
                <span>{stats.pendingVerifications} pending verifications</span>
              </div>
            </div>

            {pendingVerifications.length === 0 ? (
<div className="card p-8 text-center">
                <ApperIcon name="CheckCircle" size={48} className="text-green-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h4>
                <p className="text-gray-600">No payment verifications pending at the moment.</p>
                <p className="text-sm text-gray-500 mt-2">New payment proofs will appear here for admin review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
{pendingVerifications.map((verification) => (
                  <div key={verification.Id} className="card p-6 border-l-4 border-yellow-400">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Order #{verification.orderId}</h4>
                        <p className="text-sm text-gray-600">
                          Submitted {format(new Date(verification.submittedAt), 'MMM dd, yyyy hh:mm a')}
                        </p>
                        {verification.transactionId && (
                          <p className="text-xs text-gray-500 font-mono">
                            TXN: {verification.transactionId}
                          </p>
                        )}
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                        Pending
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="font-medium">Rs. {verification.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Payment Method:</span>
                        <span className="font-medium capitalize">{verification.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Customer:</span>
                        <span className="font-medium">{verification.customerName}</span>
                      </div>
                    </div>

{verification.paymentProof && (
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <ApperIcon name="FileImage" size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-600">Payment proof submitted</span>
                        </div>
                        <PaymentProofViewer verification={verification} userRole="admin" />
                      </div>
                    )}

<div className="flex space-x-3">
                      <Button
                        onClick={() => handleVerificationAction(verification.orderId, 'approve', 'Payment verified by admin')}
                        disabled={processingVerification}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {processingVerification ? (
                          <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                        ) : (
                          <ApperIcon name="Check" size={16} className="mr-2" />
                        )}
                        Verify Payment
                      </Button>
                      <Button
                        onClick={() => handleVerificationAction(verification.orderId, 'reject', 'Payment proof rejected - invalid or unclear')}
                        disabled={processingVerification}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                      >
                        {processingVerification ? (
                          <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                        ) : (
                          <ApperIcon name="X" size={16} className="mr-2" />
                        )}
                        Reject Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentManagement;