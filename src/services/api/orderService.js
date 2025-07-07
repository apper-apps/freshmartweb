import ordersData from "../mockData/orders.json";
import React from "react";
import Error from "@/components/ui/Error";
import { paymentService } from "@/services/api/paymentService";
class OrderService {
  constructor() {
    this.orders = [...ordersData];
  }

  async getAll() {
    await this.delay();
    return [...this.orders];
  }

async getById(id) {
    await this.delay();
    const order = this.orders.find(o => o.id === id);
    if (!order) {
      throw new Error('Order not found');
    }
    return { ...order };
  }

  async create(orderData) {
    await this.delay();
    // Validate payment data
    if (orderData.paymentMethod && orderData.paymentMethod !== 'cash') {
      if (!orderData.paymentResult && orderData.paymentMethod !== 'wallet') {
        throw new Error('Payment result is required for non-cash payments');
      }
    }
    
const newOrder = {
      id: this.getNextId(),
      ...orderData,
      // Preserve user-provided transaction ID over payment result transaction ID
      transactionId: orderData.transactionId || orderData.paymentResult?.transactionId || null,
      paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'cash' ? 'pending' : 'completed'),
      // Ensure both total and totalAmount fields are set for compatibility
      total: orderData.total || orderData.totalAmount || 0,
      totalAmount: orderData.totalAmount || orderData.total || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Handle wallet payments
if (orderData.paymentMethod === 'wallet') {
      try {
        const walletTransaction = await paymentService.processWalletPayment(orderData.total, newOrder.id);
        newOrder.paymentResult = walletTransaction;
        newOrder.paymentStatus = 'completed';
      } catch (walletError) {
        throw new Error('Wallet payment failed: ' + walletError.message);
      }
    }
    
// Handle bank transfer verification
    if (orderData.paymentMethod === 'bank' && orderData.paymentResult?.requiresVerification) {
      newOrder.paymentStatus = 'pending_verification';
      newOrder.status = 'payment_pending';
    }
    
// Handle payment proof submissions with secure file storage
    if (orderData.paymentProof && orderData.paymentMethod !== 'cash') {
      newOrder.verificationStatus = 'pending';
      newOrder.paymentProofSubmittedAt = new Date().toISOString();
      newOrder.paymentProofFileName = orderData.paymentProof.fileName;
      newOrder.paymentProofUrl = orderData.paymentProof.fileUrl;
      newOrder.paymentProofThumbnailUrl = orderData.paymentProof.thumbnailUrl;
    }
    
    this.orders.push(newOrder);
    return { ...newOrder };
  }

  async update(id, orderData) {
    await this.delay();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Order not found');
    }
    this.orders[index] = { ...this.orders[index], ...orderData };
    return { ...this.orders[index] };
  }

  async delete(id) {
    await this.delay();
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) {
      throw new Error('Order not found');
    }
this.orders.splice(index, 1);
    return true;
  }

  getNextId() {
    const maxId = this.orders.reduce((max, order) => 
      order.id > max ? order.id : max, 0);
    return maxId + 1;
  }
  async assignDeliveryPersonnel(orderId, deliveryPersonId) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      deliveryPersonId: deliveryPersonId,
      deliveryStatus: 'assigned'
    };
    return await this.update(orderId, updatedOrder);
  }
  async updateDeliveryStatus(orderId, deliveryStatus, actualDelivery = null) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      deliveryStatus,
      ...(actualDelivery && { actualDelivery })
    };
    return await this.update(orderId, updatedOrder);
  }

  async getOrdersByDeliveryPerson(deliveryPersonId) {
    await this.delay();
    return this.orders.filter(order => order.deliveryPersonId === deliveryPersonId);
  }

  async getOrdersByDeliveryStatus(deliveryStatus) {
return this.orders.filter(order => order.deliveryStatus === deliveryStatus);
  }

// Payment Integration Methods
  async updatePaymentStatus(orderId, paymentStatus, paymentResult = null) {
    await this.delay();
    const order = await this.getById(orderId);
    const updatedOrder = {
      ...order,
      paymentStatus,
      paymentResult,
      updatedAt: new Date().toISOString(),
      ...(paymentStatus === 'completed' && { paidAt: new Date().toISOString() }),
      ...(paymentStatus === 'completed' && order.status === 'payment_pending' && { status: 'confirmed' })
    };
    return await this.update(orderId, updatedOrder);
  }

  async getOrdersByPaymentStatus(paymentStatus) {
    await this.delay();
    return this.orders.filter(order => order.paymentStatus === paymentStatus);
  }

  async getOrdersByPaymentMethod(paymentMethod) {
    await this.delay();
    return this.orders.filter(order => order.paymentMethod === paymentMethod);
  }

  async verifyOrderPayment(orderId, verificationData) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (order.paymentStatus !== 'pending_verification') {
      throw new Error('Order payment does not require verification');
    }
    
    try {
      const verificationResult = await paymentService.verifyPayment(
        order.paymentResult.transactionId, 
        verificationData
      );
      
      if (verificationResult.verified) {
        const updatedOrder = await this.updatePaymentStatus(orderId, 'completed', verificationResult.transaction);
        return updatedOrder;
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      throw new Error('Payment verification error: ' + error.message);
    }
  }

  async retryPayment(orderId, newPaymentData) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (order.paymentStatus === 'completed') {
      throw new Error('Payment already completed for this order');
    }
    
    const updatedOrder = {
      ...order,
      paymentResult: newPaymentData,
      paymentStatus: 'completed',
      updatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };
    
    return await this.update(orderId, updatedOrder);
  }
  async processRefund(orderId, refundAmount, reason) {
    await this.delay();
const order = await this.getById(orderId);
    const refund = {
      id: Date.now(), // Use timestamp for refund ID
      orderId,
      amount: refundAmount,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    
    const updatedOrder = {
      ...order,
      refundRequested: true,
      refund,
      status: 'refund_requested'
    };
return await this.update(orderId, updatedOrder);
  }

async getMonthlyRevenue() {
    await this.delay();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyOrders = this.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
});
return monthlyOrders.reduce((sum, order) => sum + (order?.total || order?.totalAmount || 0), 0);
  }
  async getRevenueByPaymentMethod() {
    await this.delay();
    const revenueByMethod = {};
    
this.orders.forEach(order => {
      const method = order?.paymentMethod || 'unknown';
      revenueByMethod[method] = (revenueByMethod[method] || 0) + (order?.total || order?.totalAmount || 0);
    });
    
    return revenueByMethod;
  }
  // Payment Verification Methods
async getPendingVerifications() {
    await this.delay();
    return this.orders
      .filter(order => {
        // Include orders with payment proof requiring verification
        const hasPaymentProof = order.paymentProof || order.paymentProofFileName;
        const isPendingVerification = order.verificationStatus === 'pending' || 
                                    (!order.verificationStatus && hasPaymentProof &&
                                     (order.paymentMethod === 'jazzcash' || order.paymentMethod === 'easypaisa' || order.paymentMethod === 'bank'));
        return hasPaymentProof && isPendingVerification;
      })
      .map(order => ({
        Id: order?.id,
        orderId: order?.id,
        transactionId: order?.transactionId || `TXN${order?.id}${Date.now().toString().slice(-4)}`,
        amount: order?.total || order?.totalAmount || 0,
paymentMethod: order?.paymentMethod || 'unknown',
        customerName: order?.deliveryAddress?.name || 'Unknown',
        paymentProof: this.getPaymentProofUrl(order),
        paymentProofThumbnail: this.getPaymentProofThumbnailUrl(order),
        paymentProofFileName: order?.paymentProofFileName || order?.paymentProof?.fileName || 'unknown',
        submittedAt: order?.paymentProofSubmittedAt || order?.createdAt,
        verificationStatus: order?.verificationStatus || 'pending'
      }));
  }

async updateVerificationStatus(orderId, status, notes = '') {
    await this.delay();
    const orderIndex = this.orders.findIndex(o => o.id === parseInt(orderId));
    
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = this.orders[orderIndex];
    
    if (order.verificationStatus && order.verificationStatus !== 'pending') {
      throw new Error('Order verification is not pending');
    }

    const updatedOrder = {
      ...order,
      verificationStatus: status,
      verificationNotes: notes,
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'admin',
      paymentStatus: status === 'verified' ? 'completed' : 'verification_failed',
      status: status === 'verified' ? 'confirmed' : 'payment_verification_failed',
      updatedAt: new Date().toISOString()
    };

    // If verified, move order to confirmed status for processing
    if (status === 'verified') {
      updatedOrder.status = 'confirmed';
      updatedOrder.paymentVerifiedAt = new Date().toISOString();
    } else {
      updatedOrder.status = 'payment_rejected';
      updatedOrder.paymentRejectedAt = new Date().toISOString();
    }

    this.orders[orderIndex] = updatedOrder;
    return { ...updatedOrder };
  }

// Enhanced secure image serving methods with RBAC and malware scanning
  async servePaymentProof(fileName, userRole = 'admin', sessionToken = null) {
    await this.delay(200);
    
    // Enhanced authentication and authorization
    if (!this.validateUserAccess(userRole, sessionToken)) {
      throw new Error('Authentication required to access payment proof');
    }
    
    // Validate user has permission to access file with detailed role checking
    if (!this.hasFileAccessPermission(userRole)) {
      throw new Error('Insufficient permissions to access payment proof');
    }

    // Find order with this payment proof with enhanced search
    const order = this.findOrderByPaymentProof(fileName);
    if (!order) {
      throw new Error('Payment proof not found or has been removed');
    }

    // Validate file exists and is not marked as deleted
    if (order.paymentProof?.status === 'deleted' || order.paymentProof?.isDeleted) {
      throw new Error('Payment proof has been removed');
    }

    // Check file age for automatic cleanup (30+ days)
    if (this.isFileExpired(order.paymentProofSubmittedAt || order.createdAt)) {
      throw new Error('Payment proof has expired and been archived');
    }

    // Simulate malware scan result check
    const scanResult = await this.checkFileSecurity(fileName, order);
    if (!scanResult.isSafe) {
      throw new Error('File access denied due to security concerns');
    }

    // Simulate file serving with enhanced security headers
    return {
      fileName: fileName,
      mimeType: order.paymentProof?.fileType || 'image/jpeg',
      fileSize: order.paymentProof?.fileSize || 0,
      lastModified: order.paymentProofSubmittedAt || order.createdAt,
      contentDisposition: `inline; filename="${order.paymentProof?.originalName || fileName}"`,
      cacheControl: 'private, no-cache, no-store, must-revalidate',
      securityHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline';",
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      },
      accessLog: {
        accessedBy: userRole,
        accessedAt: new Date().toISOString(),
        clientIP: '127.0.0.1', // In real implementation, get from request
        userAgent: 'Admin-Dashboard'
      }
    };
  }

  // Enhanced user access validation
  validateUserAccess(userRole, sessionToken) {
    // In real implementation, validate session token and user permissions
    const validRoles = ['admin', 'finance_manager', 'support_manager'];
    return validRoles.includes(userRole) && (sessionToken || true); // Simplified for mock
  }

  // Enhanced permission checking
  hasFileAccessPermission(userRole) {
    const fileAccessRoles = ['admin', 'finance_manager'];
    return fileAccessRoles.includes(userRole);
  }

  // Enhanced order search by payment proof
  findOrderByPaymentProof(fileName) {
    return this.orders.find(o => 
      o.paymentProofFileName === fileName || 
      o.paymentProof?.fileName === fileName ||
      (o.paymentProof && typeof o.paymentProof === 'object' && o.paymentProof.fileName === fileName)
    );
  }

  // Check if file has expired (30+ days old)
  isFileExpired(uploadDate) {
    if (!uploadDate) return false;
    
    const uploadTime = new Date(uploadDate).getTime();
    const currentTime = new Date().getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    return (currentTime - uploadTime) > thirtyDaysInMs;
  }

  // Simulate file security check
  async checkFileSecurity(fileName, order) {
    await this.delay(100);
    
    // Simulate various security checks
    const securityChecks = {
      malwareScan: Math.random() > 0.001, // 99.9% clean
      fileIntegrity: true, // File hasn't been tampered with
      virusSignature: Math.random() > 0.0001, // 99.99% no virus signatures
      suspiciousActivity: false // No suspicious access patterns
    };

    return {
      isSafe: Object.values(securityChecks).every(check => check === true),
      scanResults: securityChecks,
      scannedAt: new Date().toISOString(),
      scanVersion: '1.0.0'
    };
  }

  async validatePaymentProofAccess(fileName, userRole, userId = null) {
    await this.delay(100);
    
    const order = this.orders.find(o => o.paymentProofFileName === fileName);
    if (!order) {
      return { valid: false, error: 'Payment proof not found' };
    }

    // Admin and finance managers have full access
    if (userRole === 'admin' || userRole === 'finance_manager') {
      return { valid: true, order: { ...order } };
    }

    // Customers can only access their own files
    if (userRole === 'customer') {
      return { valid: false, error: 'Insufficient permissions' };
    }

    return { valid: false, error: 'Invalid user role' };
  }

  async getVerificationHistory(orderId) {
    await this.delay();
    const order = await this.getById(orderId);
    
    if (!order.paymentProof) {
      return null;
    }

return {
      orderId: order?.id,
      submittedAt: order?.paymentProofSubmittedAt,
      verifiedAt: order?.verifiedAt,
      status: order?.verificationStatus || 'pending',
      notes: order?.verificationNotes || '',
      paymentProof: order?.paymentProof || null,
      paymentProofFileName: order?.paymentProofFileName || 'unknown'
    };
  }

// Order Calculation Methods
  calculateOrderSubtotal(items) {
    if (!items || !Array.isArray(items)) {
      return 0;
    }
    
    return items.reduce((subtotal, item) => {
      const itemPrice = parseFloat(item.price) || 0;
      const itemQuantity = parseInt(item.quantity) || 0;
      return subtotal + (itemPrice * itemQuantity);
    }, 0);
  }

  calculateOrderTotal(items, deliveryCharge = 0) {
    const subtotal = this.calculateOrderSubtotal(items);
    const delivery = parseFloat(deliveryCharge) || 0;
    return subtotal + delivery;
  }

  validateOrderAmount(order) {
    const calculatedSubtotal = this.calculateOrderSubtotal(order.items);
    const calculatedTotal = this.calculateOrderTotal(order.items, order.deliveryCharge);
    
    // Return calculated values if order total is missing or zero
    if (!order.total || order.total === 0) {
      return {
        subtotal: calculatedSubtotal,
        total: calculatedTotal,
        isCalculated: true
      };
    }
    
    return {
      subtotal: calculatedSubtotal,
      total: order.total,
      isCalculated: false
    };
}

// Payment Proof URL Helper Methods
// Enhanced Payment Proof URL Helper Methods with robust fallback hierarchy
  getPaymentProofUrl(order) {
    try {
      // Priority 1: Check for direct URL field (highest priority)
      if (order?.paymentProofUrl && order.paymentProofUrl !== '' && !order.paymentProofUrl.includes('undefined')) {
        return order.paymentProofUrl;
      }
      
      // Priority 2: Check for base64 or data URLs in paymentProof field
      if (order?.paymentProof && typeof order.paymentProof === 'string') {
        if (order.paymentProof.startsWith('data:image/') || order.paymentProof.startsWith('blob:')) {
          return order.paymentProof;
        }
        // Check if it's a direct URL string
        if (order.paymentProof.startsWith('http') || order.paymentProof.startsWith('/api/')) {
          return order.paymentProof;
        }
      }
      
      // Priority 3: Construct URL from file metadata
      if (order?.paymentProof?.fileName || order?.paymentProofFileName) {
        const fileName = order.paymentProof?.fileName || order.paymentProofFileName;
        if (fileName && fileName !== 'undefined' && fileName !== 'null') {
          return `/api/payment-proofs/secure/${fileName}?auth=true`;
        }
      }
      
      // Priority 4: Try alternative field names for backwards compatibility
      if (order?.paymentProof?.fileUrl) {
        return order.paymentProof.fileUrl;
      }
      
      // Priority 5: Return enhanced placeholder with better error indication
      return this.getPlaceholderImage('payment_proof_unavailable');
    } catch (error) {
      console.warn('Error generating payment proof URL:', error);
      return this.getPlaceholderImage('payment_proof_error');
    }
  }

  getPaymentProofThumbnailUrl(order) {
    try {
      // Priority 1: Check for dedicated thumbnail URL (highest priority)
      if (order?.paymentProofThumbnailUrl && order.paymentProofThumbnailUrl !== '' && !order.paymentProofThumbnailUrl.includes('undefined')) {
        return order.paymentProofThumbnailUrl;
      }
      
      // Priority 2: Check for thumbnail in payment proof object
      if (order?.paymentProof?.thumbnailUrl && order.paymentProof.thumbnailUrl !== '') {
        return order.paymentProof.thumbnailUrl;
      }
      
      // Priority 3: Construct thumbnail URL from filename
      if (order?.paymentProof?.fileName || order?.paymentProofFileName) {
        const fileName = order.paymentProof?.fileName || order.paymentProofFileName;
        if (fileName && fileName !== 'undefined' && fileName !== 'null') {
          // Generate thumbnail filename with WebP format
          const thumbnailFileName = fileName.replace(/\.[^/.]+$/, '_thumb.webp');
          return `/api/payment-proofs/thumbnails/${thumbnailFileName}?size=200x200`;
        }
      }
      
      // Priority 4: Fall back to main URL if it's a real image (not placeholder)
      const mainUrl = this.getPaymentProofUrl(order);
      if (mainUrl && !mainUrl.startsWith('data:image/svg+xml') && !mainUrl.includes('placeholder')) {
        // Add thumbnail parameters to the main URL
        return `${mainUrl}?thumbnail=true&size=200x200`;
      }
      
      // Priority 5: Return placeholder for thumbnails
      return this.getPlaceholderImage('thumbnail_unavailable');
    } catch (error) {
      console.warn('Error generating payment proof thumbnail URL:', error);
      return this.getPlaceholderImage('thumbnail_error');
    }
  }
  
  // Enhanced placeholder generation with different types
  getPlaceholderImage(type = 'default') {
    const placeholders = {
      'payment_proof_unavailable': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUgxMTVWMTE1SDg1Vjg1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNzAgNzBIMTMwVjEzMEg3MFY3MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEyIj5QYXltZW50IFByb29mPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEwIj5VbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=',
      'payment_proof_error': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkVGMkYyIi8+CjxwYXRoIGQ9Ik04NSA4NUgxMTVWMTE1SDg1Vjg1WiIgZmlsbD0iI0VGNDQ0NCIvPgo8cGF0aCBkPSJNNzAgNzBIMTMwVjEzMEg3MFY3MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0VGNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRUY0NDQ0IiBmb250LXNpemU9IjEyIj5FcnJvcjwvdGV4dD48L3N2Zz4=',
      'thumbnail_unavailable': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik04NSA5NUwxMDAgMTEwTDExNSA5NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIxMDAiIHk9IjE2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1zaXplPSIxMiI+VGh1bWJuYWlsPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMTc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEwIj5VbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=',
      'thumbnail_error': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkVGMkYyIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0VGNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik04NSA4NUwxMTUgMTE1TTExNSA4NUw4NSAxMTUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0VGNDQ0NCIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMTAwIiB5PSIxNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNFRjQ0NDQiIGZvbnQtc2l6ZT0iMTIiPkVycm9yPC90ZXh0Pjwvc3ZnPg==',
      'default': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUgxMTVWMTE1SDg1Vjg1WiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNzAgNzBIMTMwVjEzMEg3MFY3MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUNBM0FGIiBmb250LXNpemU9IjEyIj5JbWFnZTwvdGV4dD48dGV4dCB4PSIxMDAiIHk9IjE3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzlDQTNBRiIgZm9udC1zaXplPSIxMCI+Tm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg=='
    };
    
    return placeholders[type] || placeholders['default'];
  }

  delay() {
    return new Promise(resolve => setTimeout(resolve, 400));
  }
}

export const orderService = new OrderService();