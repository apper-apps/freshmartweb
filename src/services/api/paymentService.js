class PaymentService {
  constructor() {
    this.transactions = [];
    this.walletBalance = 25000; // Initial wallet balance
    this.walletTransactions = [];
    this.vendors = [];
    this.vendorBills = [];
    this.vendorPayments = [];
    this.paymentProofs = [];
    this.recurringPayments = [];
    this.scheduledPayments = [];
    this.paymentAutomationRules = [];
    this.currentUserRole = 'admin';
    this.financeManagerRole = 'finance_manager';
    this.recurringPaymentIdCounter = 1;
    this.scheduledPaymentIdCounter = 1;
    this.automationRuleIdCounter = 1;
    this.cardBrands = {
      '4': 'visa',
      '5': 'mastercard',
      '3': 'amex',
      '6': 'discover'
    };
    this.paymentGateways = [
      {
        Id: 1,
        id: 'cash',
        name: 'Cash on Delivery',
        enabled: true,
        fee: 0,
        description: 'Pay when you receive your order',
        accountName: '',
        accountNumber: '',
        instructions: ''
      },
      {
        Id: 2,
        id: 'jazzcash',
        name: 'JazzCash',
        enabled: true,
        fee: 0.01,
        minimumFee: 5,
        description: 'Mobile wallet payment',
        accountName: 'FreshMart Store',
        accountNumber: '03001234567',
        instructions: 'Send money to the above JazzCash number and upload payment screenshot.'
      },
      {
        Id: 3,
        id: 'easypaisa',
        name: 'EasyPaisa',
        enabled: true,
        fee: 0.01,
        minimumFee: 5,
        description: 'Mobile wallet payment',
        accountName: 'FreshMart Store',
        accountNumber: '03009876543',
        instructions: 'Send money to the above EasyPaisa number and upload payment screenshot.'
      }
    ];
  }

  // Pakistani mobile networks with their prefixes
// Pakistani mobile networks with their prefixes
  static PAKISTANI_NETWORKS = {
    JAZZ: ['030', '031', '032', '033', '034', '035', '036', '037', '038', '039'],
    TELENOR: ['340', '341', '342', '343', '344', '345', '346', '347', '348', '349'],
    ZONG: ['310', '311', '312', '313', '314', '315', '316', '317', '318', '319'],
    UFONE: ['333', '334', '335', '336', '337'],
    WARID: ['321', '322', '323', '324', '325'],
    SCOM: ['355', '356', '357', '358', '359']
  };

  // Get all valid Pakistani mobile prefixes
  static getAllValidPrefixes() {
    return Object.values(PaymentService.PAKISTANI_NETWORKS).flat();
  }

  // Pakistani mobile number validation with comprehensive network support
  validatePakistaniPhone(phone) {
    if (!phone) return false;
    
    // Remove any spaces, dashes, parentheses, or other formatting
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Normalize different formats to standard 11-digit format
    let normalized = cleaned;
    if (cleaned.startsWith('923') && cleaned.length === 12) {
      normalized = '0' + cleaned.substring(2); // Convert 923xxxxxxxxx to 03xxxxxxxxx
    } else if (cleaned.startsWith('92') && cleaned.length === 11) {
      normalized = '0' + cleaned.substring(2); // Convert 92xxxxxxxxx to 03xxxxxxxxx
    }
    
    // Check if it's a valid 11-digit Pakistani mobile number
    if (!/^03[0-9]{9}$/.test(normalized)) {
      return false;
    }
    
    // Extract the prefix (first 3 digits)
    const prefix = normalized.substring(0, 3);
    
    // Check if prefix is valid for any Pakistani network
    const allPrefixes = PaymentService.getAllValidPrefixes();
    return allPrefixes.includes(prefix);
  }

  // Get network name from phone number
  getNetworkFromPhone(phone) {
    if (!this.validatePakistaniPhone(phone)) {
      return null;
    }
    
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    let normalized = cleaned;
    if (cleaned.startsWith('923') && cleaned.length === 12) {
      normalized = '0' + cleaned.substring(2);
    } else if (cleaned.startsWith('92') && cleaned.length === 11) {
      normalized = '0' + cleaned.substring(2);
    }
    
    const prefix = normalized.substring(0, 3);
    
    for (const [network, prefixes] of Object.entries(PaymentService.PAKISTANI_NETWORKS)) {
      if (prefixes.includes(prefix)) {
        return network;
      }
    }
    
    return null;
  }

  // Generate unique transaction ID
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
async getPaymentMethods() {
    await this.delay(200);
    return this.paymentGateways.filter(gateway => gateway.enabled);
  }

  // Card Payment Processing
  async processCardPayment(cardData, amount, orderId) {
    await this.delay(2000); // Simulate processing time

    // Validate card data
    const validation = this.validateCardData(cardData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Simulate payment gateway response
    const success = Math.random() > 0.1; // 90% success rate
    
    if (!success) {
      throw new Error('Payment declined. Please try again or use a different card.');
    }

    const transaction = {
      Id: this.getNextId(),
      orderId,
      amount,
      paymentMethod: 'card',
      cardLast4: cardData.cardNumber.slice(-4),
      cardBrand: this.getCardBrand(cardData.cardNumber),
      status: 'completed',
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      processingFee: 0,
      gatewayResponse: {
        authCode: this.generateAuthCode(),
        reference: this.generateReference()
      }
    };

    this.transactions.push(transaction);
    return { ...transaction };
  }

// Digital Wallet Payment Processing
  async processDigitalWalletPayment(walletType, amount, orderId, phone, retryCount = 0) {
    const maxRetries = 3;
    const transactionId = this.generateTransactionId();
    
    try {
      // Log payment attempt
      console.log(`[PaymentService] Processing ${walletType} payment - Amount: ${amount}, Order: ${orderId}, Retry: ${retryCount}`);
      
      await this.delay(1500);

      // Validate phone number for Pakistani wallets
      if (!phone || !this.validatePakistaniPhone(phone)) {
        const error = new Error('Please provide a valid Pakistani phone number');
        error.code = 'INVALID_PHONE';
        error.category = 'validation';
        throw error;
      }

      // Validate amount
      if (!amount || amount <= 0) {
        const error = new Error('Invalid payment amount');
        error.code = 'INVALID_AMOUNT';
        error.category = 'validation';
        throw error;
      }

      // Simulate realistic payment processing with gateway-specific behavior
      const paymentResult = await this.simulateGatewayPayment(walletType, amount, phone);
      
      if (!paymentResult.success) {
        const error = new Error(paymentResult.message || `${walletType} payment failed. Please try again.`);
        error.code = paymentResult.code || 'PAYMENT_FAILED';
        error.category = paymentResult.category || 'gateway';
        error.retryable = paymentResult.retryable || false;
        error.gatewayResponse = paymentResult.gatewayResponse;
        throw error;
      }

      const fee = this.calculateDigitalWalletFee(amount);
      
      const transaction = {
        Id: this.getNextId(),
        orderId,
        amount,
        paymentMethod: walletType,
phone,
        status: 'completed',
        transactionId,
        timestamp: new Date().toISOString(),
        processingFee: 0,
        gatewayResponse: paymentResult.gatewayResponse || {
          walletTransactionId: paymentResult.walletTransactionId,
          reference: paymentResult.reference,
          authCode: this.generateAuthCode()
        }
      };

      this.transactions.push(transaction);
      return { ...transaction };
      
    } catch (error) {
      console.error(`[PaymentService] ${walletType} payment failed:`, error);
      
      const failedTransaction = {
        Id: this.getNextId(),
        orderId,
        amount,
        paymentMethod: walletType,
        phone,
        status: 'failed',
        transactionId,
        timestamp: new Date().toISOString(),
        retryCount,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          category: error.category || 'system'
        },
        gatewayResponse: error.gatewayResponse || null
      };
      
      this.transactions.push(failedTransaction);
      
      // Retry logic for retryable errors
      if (error.retryable && retryCount < maxRetries) {
        console.log(`[PaymentService] Retrying ${walletType} payment (${retryCount + 1}/${maxRetries})`);
        await this.delay(1000 * Math.pow(2, retryCount)); // Exponential backoff
        return this.processDigitalWalletPayment(walletType, amount, orderId, phone, retryCount + 1);
      }
      
      throw error;
    }
  }
  // Simulate gateway-specific payment processing
  async simulateGatewayPayment(walletType, amount, phone) {
    // Simulate network delay
    await this.delay(Math.random() * 1000 + 500);
    
    // Gateway-specific logic
    switch (walletType.toLowerCase()) {
      case 'jazzcash':
        return this.processJazzCashPayment(amount, phone);
      case 'easypaisa':
        return this.processEasyPaisaPayment(amount, phone);
      case 'upaisa':
        return this.processUPaisaPayment(amount, phone);
      case 'sadapay':
        return this.processSadaPayPayment(amount, phone);
      default:
        return this.processGenericWalletPayment(walletType, amount, phone);
    }
  }

// JazzCash-specific processing
  async processJazzCashPayment(amount, phone) {
    // Validate phone number format
    if (!this.validatePakistaniPhone(phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid Pakistani mobile number (03xxxxxxxxx or +923xxxxxxxxx)',
        code: 'INVALID_PHONE_FORMAT',
        category: 'validation',
        retryable: false
      };
    }

    // Check if phone number is from supported networks for JazzCash
    const network = this.getNetworkFromPhone(phone);
    const jazzCashSupportedNetworks = ['JAZZ', 'TELENOR', 'ZONG', 'UFONE', 'WARID'];
    
    if (!jazzCashSupportedNetworks.includes(network)) {
      return {
        success: false,
        message: `JazzCash is not supported for ${network} numbers. Please use a Jazz, Telenor, Zong, Ufone, or Warid number.`,
        code: 'UNSUPPORTED_NETWORK_JAZZCASH',
        category: 'validation',
        retryable: false
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate realistic success/failure rates
    const random = Math.random();
    
    if (random > 0.95) { // 5% network/temporary failures
      return {
        success: false,
        message: 'Network timeout. Please try again.',
        code: 'NETWORK_TIMEOUT',
        category: 'network',
        retryable: true
      };
    }
    
    if (random > 0.98) { // 2% insufficient balance
      return {
        success: false,
        message: 'Insufficient balance in your JazzCash account.',
        code: 'INSUFFICIENT_BALANCE',
        category: 'gateway',
        retryable: false
      };
    }

    // Success case
    return {
      success: true,
      walletTransactionId: `JC${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      reference: `JAZZ_${this.generateReference()}`,
      gatewayStatus: 'success',
      gatewayMessage: 'JazzCash payment processed successfully'
    };
  }

  // EasyPaisa-specific processing
async processEasyPaisaPayment(amount, phone) {
    // Validate phone number format
    if (!this.validatePakistaniPhone(phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid Pakistani mobile number (03xxxxxxxxx or +923xxxxxxxxx)',
        code: 'INVALID_PHONE_FORMAT',
        category: 'validation',
        retryable: false
      };
    }

    // EasyPaisa supports multiple networks, not just Telenor
    const network = this.getNetworkFromPhone(phone);
    const easyPaisaSupportedNetworks = ['JAZZ', 'TELENOR', 'ZONG', 'UFONE', 'WARID'];
    
    if (!easyPaisaSupportedNetworks.includes(network)) {
      return {
        success: false,
        message: `EasyPaisa is not supported for ${network} numbers. Please use a Jazz, Telenor, Zong, Ufone, or Warid number.`,
        code: 'UNSUPPORTED_NETWORK_EASYPAISA',
        category: 'validation',
retryable: false
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1800));

    const random = Math.random();
    
    if (random > 0.97) { // 3% failures
      return {
        success: false,
        message: 'EasyPaisa service temporarily unavailable.',
        code: 'SERVICE_UNAVAILABLE',
        category: 'gateway',
        retryable: true
      };
    }

    return {
      success: true,
      walletTransactionId: `EP${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      reference: `EASY_${this.generateReference()}`,
      gatewayStatus: 'success',
      gatewayMessage: 'EasyPaisa payment processed successfully'
    };
  }

// UPaisa payment processing with enhanced validation
  async processUPaisaPayment(amount, phone) {
    // Validate phone number format
    if (!this.validatePakistaniPhone(phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid Pakistani mobile number (03xxxxxxxxx or +923xxxxxxxxx)',
        code: 'INVALID_PHONE_FORMAT',
        category: 'validation',
        retryable: false
      };
    }

    // UPaisa primarily supports Ufone network
    const network = this.getNetworkFromPhone(phone);
    const uPaisaSupportedNetworks = ['UFONE', 'JAZZ', 'TELENOR']; // UPaisa has expanded support
    
    if (!uPaisaSupportedNetworks.includes(network)) {
      return {
        success: false,
        message: `UPaisa is not supported for ${network} numbers. Please use a Ufone, Jazz, or Telenor number.`,
        code: 'UNSUPPORTED_NETWORK_UPAISA',
        category: 'validation',
        retryable: false
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate 80% success rate
    const success = Math.random() > 0.2;
    
    return {
      success,
      message: success ? 'UPaisa payment processed successfully' : 'UPaisa payment failed. Please try again.',
      code: success ? 'UPAISA_SUCCESS' : 'UPAISA_FAILED',
      category: 'gateway',
      retryable: !success,
      walletTransactionId: success ? `UP${Date.now()}${Math.random().toString(36).substr(2, 9)}` : null,
      reference: success ? `UPAISA_${this.generateReference()}` : null,
      gatewayStatus: success ? 'success' : 'failed',
      gatewayMessage: success ? 'UPaisa payment processed successfully' : 'UPaisa payment failed'
    };
  }

// SadaPay payment processing with improved validation
  async processSadaPayPayment(amount, phone) {
    // Validate phone number format
    if (!this.validatePakistaniPhone(phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid Pakistani mobile number (03xxxxxxxxx or +923xxxxxxxxx)',
        code: 'INVALID_PHONE_FORMAT',
        category: 'validation',
        retryable: false
      };
    }

    // SadaPay supports multiple networks
    const network = this.getNetworkFromPhone(phone);
    const sadaPaySupportedNetworks = ['JAZZ', 'TELENOR', 'ZONG', 'UFONE'];
    
    if (!sadaPaySupportedNetworks.includes(network)) {
      return {
        success: false,
        message: `SadaPay is not supported for ${network} numbers. Please use a Jazz, Telenor, Zong, or Ufone number.`,
        code: 'UNSUPPORTED_NETWORK_SADAPAY',
        category: 'validation',
        retryable: false
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1800));

    // Simulate 75% success rate
    const success = Math.random() > 0.25;
    
    return {
      success,
      message: success ? 'SadaPay payment processed successfully' : 'SadaPay payment failed. Please try again.',
      code: success ? 'SADAPAY_SUCCESS' : 'SADAPAY_FAILED',
      category: 'gateway',
      retryable: !success,
      walletTransactionId: success ? `SP${Date.now()}${Math.random().toString(36).substr(2, 9)}` : null,
      reference: success ? `SADAPAY_${this.generateReference()}` : null,
      gatewayStatus: success ? 'success' : 'failed',
      gatewayMessage: success ? 'SadaPay payment processed successfully' : 'SadaPay payment failed'
    };
  }

  // Generic digital wallet payment processing with enhanced validation
  async processGenericWalletPayment(walletType, amount, phone) {
    // Validate phone number format
    if (!this.validatePakistaniPhone(phone)) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use a valid Pakistani mobile number (03xxxxxxxxx or +923xxxxxxxxx)',
        code: 'INVALID_PHONE_FORMAT',
        category: 'validation',
        retryable: false
      };
    }

    // Check network compatibility for the wallet type
    const network = this.getNetworkFromPhone(phone);
    const networkInfo = network ? ` (${network} network)` : '';
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Simulate 70% success rate for generic wallets
    const success = Math.random() > 0.3;
    
    return {
      success,
      message: success ? `${walletType} payment processed successfully${networkInfo}` : `${walletType} payment failed. Please try again.`,
      code: success ? 'GENERIC_SUCCESS' : 'GENERIC_FAILED',
      category: 'gateway',
      retryable: !success,
      walletTransactionId: success ? `${walletType.toUpperCase()}${Date.now()}${Math.random().toString(36).substr(2, 9)}` : null,
      reference: success ? `${walletType.toUpperCase()}_${this.generateReference()}` : null,
      gatewayStatus: success ? 'success' : 'failed',
      gatewayMessage: success ? `${walletType} payment processed successfully` : `${walletType} payment failed`
};
  }

  // Payment Verification
  async verifyPayment(transactionId, verificationData) {
    await this.delay(500);

    const transaction = this.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'completed') {
      return { verified: true, transaction };
    }

    // Simulate verification process
    const verified = Math.random() > 0.2; // 80% verification success rate

    if (verified) {
      transaction.status = 'completed';
      transaction.verifiedAt = new Date().toISOString();
transaction.verificationData = verificationData;
    } else {
      transaction.status = 'verification_failed';
    }

    // Return verification result
    return { verified, transaction: { ...transaction } };
  }

  // Enhanced Payment Retry Logic
  async retryPayment(originalTransactionId, retryData) {
    await this.delay(1000);
    
    const originalTransaction = this.transactions.find(t => t.transactionId === originalTransactionId);
    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }
    
    // Create retry transaction
    const retryTransaction = {
      Id: this.getNextId(),
      orderId: originalTransaction.orderId,
      amount: originalTransaction.amount,
      paymentMethod: originalTransaction.paymentMethod,
      status: 'processing',
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      isRetry: true,
      originalTransactionId: originalTransactionId,
      retryAttempt: (originalTransaction.retryAttempt || 0) + 1,
      ...retryData
    };
    
    // Simulate retry processing
    const success = Math.random() > 0.3; // 70% success rate for retries
    
    if (success) {
      retryTransaction.status = 'completed';
      retryTransaction.gatewayResponse = {
        authCode: this.generateAuthCode(),
        reference: this.generateReference()
      };
    } else {
      retryTransaction.status = 'failed';
      retryTransaction.failureReason = 'Retry payment failed';
    }
    
    this.transactions.push(retryTransaction);
    return { ...retryTransaction };
  }

  // Enhanced Error Handling
  async handlePaymentError(transactionId, errorDetails) {
    await this.delay(300);
    
    const transaction = this.transactions.find(t => t.transactionId === transactionId);
    if (transaction) {
      transaction.status = 'failed';
      transaction.errorDetails = errorDetails;
      transaction.failedAt = new Date().toISOString();
    }
    
    return transaction;
  }
async getAvailablePaymentMethods() {
    await this.delay(200);
    return [...this.paymentGateways].filter(gateway => gateway.enabled);
  }

  // Transaction History
  async getTransactionHistory(orderId) {
    await this.delay(300);
    return this.transactions.filter(t => t.orderId === orderId);
  }

  async getAllTransactions() {
    await this.delay(300);
    return [...this.transactions];
  }

  async getTransactionById(id) {
    await this.delay(300);
    const transaction = this.transactions.find(t => t.Id === id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return { ...transaction };
  }

  // Utility Methods
  validateCardData(cardData) {
    const { cardNumber, expiryDate, cvv, cardholderName } = cardData;

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      return { valid: false, error: 'Invalid card number' };
    }

    if (!expiryDate || !expiryDate.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      return { valid: false, error: 'Invalid expiry date' };
    }

    if (!cvv || cvv.length < 3) {
      return { valid: false, error: 'Invalid CVV' };
    }

    if (!cardholderName || cardholderName.trim().length < 2) {
      return { valid: false, error: 'Invalid cardholder name' };
    }

    // Check if card is expired
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (expiry < new Date()) {
      return { valid: false, error: 'Card has expired' };
    }

    return { valid: true };
}

  getCardBrand(cardNumber) {
    const firstDigit = cardNumber.charAt(0);
    return this.cardBrands[firstDigit] || 'unknown';
  }
  calculateDigitalWalletFee(amount) {
    const feePercent = 0.01; // 1%
    const minimumFee = 5;
    return Math.max(amount * feePercent, minimumFee);
  }

  generateAuthCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  generateReference() {
    return 'REF' + Date.now().toString().slice(-8);
  }

  generateWalletTransactionId(walletType) {
    const prefix = walletType.toUpperCase().substr(0, 3);
    return prefix + Date.now().toString().slice(-8);
  }

  getNextId() {
    const maxId = this.transactions.reduce((max, transaction) => 
      transaction.Id > max ? transaction.Id : max, 0);
    return maxId + 1;
}

  // Wallet Management Methods
  async getWalletBalance() {
    await this.delay(200);
    return this.walletBalance;
  }

  async updateWalletBalance(amount) {
    await this.delay(200);
    this.walletBalance += amount;
    return this.walletBalance;
  }

  async depositToWallet(amount) {
    await this.delay(500);
    
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    this.walletBalance += amount;
    
    const transaction = {
      Id: this.getWalletTransactionId(),
      type: 'deposit',
      amount,
      balance: this.walletBalance,
      timestamp: new Date().toISOString(),
      description: 'Wallet deposit',
      reference: this.generateReference()
    };

    this.walletTransactions.push(transaction);
    return { ...transaction };
  }

  async withdrawFromWallet(amount) {
    await this.delay(500);
    
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    if (amount > this.walletBalance) {
      throw new Error('Insufficient wallet balance');
    }

    this.walletBalance -= amount;
    
    const transaction = {
      Id: this.getWalletTransactionId(),
      type: 'withdraw',
      amount,
      balance: this.walletBalance,
      timestamp: new Date().toISOString(),
      description: 'Wallet withdrawal',
      reference: this.generateReference()
    };

    this.walletTransactions.push(transaction);
    return { ...transaction };
  }

  async transferFromWallet(amount, recipientId = null) {
    await this.delay(500);
    
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    if (amount > this.walletBalance) {
      throw new Error('Insufficient wallet balance');
    }

    this.walletBalance -= amount;
    
    const transaction = {
      Id: this.getWalletTransactionId(),
      type: 'transfer',
      amount,
      balance: this.walletBalance,
      timestamp: new Date().toISOString(),
      description: `Wallet transfer${recipientId ? ` to ${recipientId}` : ''}`,
      reference: this.generateReference(),
      recipientId
    };

    this.walletTransactions.push(transaction);
    return { ...transaction };
  }

  async processWalletPayment(amount, orderId) {
    await this.delay(500);
    
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (amount > this.walletBalance) {
      throw new Error('Insufficient wallet balance for payment');
    }

    this.walletBalance -= amount;
    
    const transaction = {
      Id: this.getWalletTransactionId(),
      type: 'payment',
      amount,
      balance: this.walletBalance,
      timestamp: new Date().toISOString(),
      description: `Payment for order #${orderId}`,
      reference: this.generateReference(),
      orderId
    };

    this.walletTransactions.push(transaction);
    return { ...transaction };
  }

  async getWalletTransactions(limit = 50) {
    await this.delay(300);
    return [...this.walletTransactions]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getWalletTransactionById(id) {
    await this.delay(300);
    const transaction = this.walletTransactions.find(t => t.Id === id);
    if (!transaction) {
      throw new Error('Wallet transaction not found');
    }
    return { ...transaction };
  }

  getWalletTransactionId() {
    const maxId = this.walletTransactions.reduce((max, transaction) => 
      transaction.Id > max ? transaction.Id : max, 0);
    return maxId + 1;
  }
// Gateway Configuration Management
  async getGatewayConfig() {
    await this.delay(200);
    return {
      cardGateway: {
        provider: 'stripe',
        enabled: true,
        apiKey: 'pk_test_xxxxx'
      },
      walletGateways: {
        jazzcash: { enabled: true, merchantId: 'JC123' },
        easypaisa: { enabled: true, merchantId: 'EP456' },
        sadapay: { enabled: true, merchantId: 'SP789' }
      },
      bankGateway: {
        enabled: true,
        accounts: [
          { bank: 'HBL', account: '1234567890' },
          { bank: 'UBL', account: '0987654321' }
        ]
      }
    };
  }

  async updateGatewayConfig(gatewayId, config) {
    await this.delay(300);
    // In a real implementation, this would update the gateway configuration
    return { success: true, gatewayId, config };
  }
async getGatewayStatus(gatewayId) {
    await this.delay(200);
    const gateway = this.paymentGateways.find(g => g.Id === gatewayId);
    return gateway ? { enabled: gateway.enabled, status: 'active' } : { enabled: false, status: 'inactive' };
  }

  async enableGateway(gatewayId) {
    await this.delay(300);
    const gateway = this.paymentGateways.find(g => g.Id === gatewayId);
    if (!gateway) {
      throw new Error('Payment gateway not found');
    }
    gateway.enabled = true;
    return { success: true, gatewayId, enabled: true };
  }

  async disableGateway(gatewayId) {
    await this.delay(300);
    const gateway = this.paymentGateways.find(g => g.Id === gatewayId);
    if (!gateway) {
      throw new Error('Payment gateway not found');
    }
    gateway.enabled = false;
    return { success: true, gatewayId, enabled: false };
  }

  // Gateway CRUD Operations
  async createGateway(gatewayData) {
    await this.delay(500);
    
    if (!gatewayData.name || !gatewayData.accountName || !gatewayData.accountNumber) {
      throw new Error('Name, account name, and account number are required');
    }

    const gateway = {
      Id: this.getNextGatewayId(),
      id: gatewayData.name.toLowerCase().replace(/\s+/g, '_'),
      name: gatewayData.name,
      accountName: gatewayData.accountName,
      accountNumber: gatewayData.accountNumber,
      instructions: gatewayData.instructions || '',
      fee: parseFloat(gatewayData.fee) / 100 || 0, // Convert percentage to decimal
      enabled: gatewayData.enabled !== false,
      description: `${gatewayData.name} payment gateway`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.paymentGateways.push(gateway);
    return { ...gateway };
  }

  async updateGateway(gatewayId, gatewayData) {
    await this.delay(400);
    
    const gateway = this.paymentGateways.find(g => g.Id === gatewayId);
    if (!gateway) {
      throw new Error('Payment gateway not found');
    }

    Object.assign(gateway, {
      name: gatewayData.name || gateway.name,
      accountName: gatewayData.accountName || gateway.accountName,
      accountNumber: gatewayData.accountNumber || gateway.accountNumber,
      instructions: gatewayData.instructions || gateway.instructions,
      fee: gatewayData.fee !== undefined ? parseFloat(gatewayData.fee) / 100 : gateway.fee,
      enabled: gatewayData.enabled !== undefined ? gatewayData.enabled : gateway.enabled,
      updatedAt: new Date().toISOString()
    });

    return { ...gateway };
  }

  async deleteGateway(gatewayId) {
    await this.delay(300);
    
    const index = this.paymentGateways.findIndex(g => g.Id === gatewayId);
    if (index === -1) {
      throw new Error('Payment gateway not found');
    }

    // Prevent deletion of cash on delivery
    if (this.paymentGateways[index].id === 'cash') {
      throw new Error('Cannot delete cash on delivery gateway');
    }

    this.paymentGateways.splice(index, 1);
    return { success: true };
  }

  getNextGatewayId() {
    const maxId = this.paymentGateways.reduce((max, gateway) => 
      gateway.Id > max ? gateway.Id : max, 0);
    return maxId + 1;
  }
delay(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Vendor CRUD Operations
  async createVendor(vendorData) {
    await this.delay(500);
    
    if (!vendorData.name || !vendorData.email || !vendorData.phone) {
      throw new Error('Vendor name, email, and phone are required');
    }

    const vendor = {
      Id: this.getNextVendorId(),
      name: vendorData.name,
      email: vendorData.email,
      phone: vendorData.phone,
      address: vendorData.address || '',
      taxId: vendorData.taxId || '',
      bankAccount: vendorData.bankAccount || '',
      paymentTerms: vendorData.paymentTerms || 'Net 30',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPaid: 0,
      totalOwed: 0,
      lastPaymentDate: null
    };

    this.vendors.push(vendor);
    return { ...vendor };
  }

  async updateVendor(vendorId, vendorData) {
    await this.delay(400);
    
    const vendor = this.vendors.find(v => v.Id === vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    Object.assign(vendor, {
      ...vendorData,
      updatedAt: new Date().toISOString()
    });

    return { ...vendor };
  }

  async deleteVendor(vendorId) {
    await this.delay(300);
    
    const index = this.vendors.findIndex(v => v.Id === vendorId);
    if (index === -1) {
      throw new Error('Vendor not found');
    }

    // Check for pending payments
    const pendingPayments = this.vendorPayments.filter(p => 
      p.vendorId === vendorId && p.status === 'pending'
    );
    
    if (pendingPayments.length > 0) {
      throw new Error('Cannot delete vendor with pending payments');
    }

    this.vendors.splice(index, 1);
    return { success: true };
  }

  async getAllVendors() {
    await this.delay(300);
    return [...this.vendors];
  }

  async getVendorById(vendorId) {
    await this.delay(200);
    const vendor = this.vendors.find(v => v.Id === vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }
    return { ...vendor };
  }

  // Vendor Bill Management
  async createVendorBill(billData) {
    await this.delay(500);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    if (!billData.vendorId || !billData.amount || !billData.description) {
      throw new Error('Vendor ID, amount, and description are required');
    }

    const vendor = this.vendors.find(v => v.Id === billData.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const bill = {
      Id: this.getNextBillId(),
      vendorId: billData.vendorId,
      vendorName: vendor.name,
      amount: billData.amount,
      description: billData.description,
      billNumber: billData.billNumber || this.generateBillNumber(),
      dueDate: billData.dueDate || this.calculateDueDate(vendor.paymentTerms),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentUserRole,
      category: billData.category || 'general',
      taxAmount: billData.taxAmount || 0,
      totalAmount: billData.amount + (billData.taxAmount || 0)
    };

    this.vendorBills.push(bill);
    
    // Update vendor total owed
    vendor.totalOwed += bill.totalAmount;
    vendor.updatedAt = new Date().toISOString();

    return { ...bill };
  }

  async processVendorBillPayment(billId, paymentData) {
    await this.delay(800);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const bill = this.vendorBills.find(b => b.Id === billId);
    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === 'paid') {
      throw new Error('Bill is already paid');
    }

    const vendor = this.vendors.find(v => v.Id === bill.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate payment amount
    if (paymentData.amount > bill.totalAmount) {
      throw new Error('Payment amount cannot exceed bill amount');
    }

    const payment = {
      Id: this.getNextPaymentId(),
      billId: billId,
      vendorId: bill.vendorId,
      vendorName: vendor.name,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod || 'bank_transfer',
      status: 'pending_proof',
      transactionId: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      paidBy: this.currentUserRole,
      reference: paymentData.reference || '',
      notes: paymentData.notes || '',
      requiresProof: true,
      proofStatus: 'pending'
    };

    this.vendorPayments.push(payment);

    // Update bill status
    if (paymentData.amount >= bill.totalAmount) {
      bill.status = 'paid';
      bill.paidAt = new Date().toISOString();
      bill.paymentId = payment.Id;
    } else {
      bill.status = 'partially_paid';
      bill.partialPayments = (bill.partialPayments || []).concat(payment.Id);
    }

    bill.updatedAt = new Date().toISOString();

    return { ...payment };
  }

  // Payment Proof Management
  async uploadPaymentProof(paymentId, proofData) {
    await this.delay(600);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const payment = this.vendorPayments.find(p => p.Id === paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Simulate file upload validation
    if (!proofData.fileName || !proofData.fileType || !proofData.fileSize) {
      throw new Error('Invalid proof file data');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(proofData.fileType)) {
      throw new Error('Only JPEG, PNG, and PDF files are allowed');
    }

    if (proofData.fileSize > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size must be less than 5MB');
    }

    const proof = {
      Id: this.getNextProofId(),
      paymentId: paymentId,
      fileName: proofData.fileName,
      fileType: proofData.fileType,
      fileSize: proofData.fileSize,
      fileUrl: this.generateFileUrl(proofData.fileName), // Simulated URL
      uploadedAt: new Date().toISOString(),
      uploadedBy: this.currentUserRole,
      status: 'pending_verification',
      verificationNotes: ''
    };

    this.paymentProofs.push(proof);

    // Update payment status
    payment.proofStatus = 'uploaded';
    payment.proofId = proof.Id;
    payment.updatedAt = new Date().toISOString();

    return { ...proof };
  }

  async verifyPaymentProof(proofId, verificationData) {
    await this.delay(400);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const proof = this.paymentProofs.find(p => p.Id === proofId);
    if (!proof) {
      throw new Error('Payment proof not found');
    }

    const payment = this.vendorPayments.find(p => p.Id === proof.paymentId);
    if (!payment) {
      throw new Error('Associated payment not found');
    }

    // Simulate verification process
    const verified = verificationData.approved !== false; // Default to approved unless explicitly false

    proof.status = verified ? 'verified' : 'rejected';
    proof.verifiedAt = new Date().toISOString();
    proof.verifiedBy = this.currentUserRole;
    proof.verificationNotes = verificationData.notes || '';

    if (verified) {
      payment.status = 'completed';
      payment.proofStatus = 'verified';
      payment.completedAt = new Date().toISOString();

      // Update vendor totals
      const vendor = this.vendors.find(v => v.Id === payment.vendorId);
      if (vendor) {
        vendor.totalPaid += payment.amount;
        vendor.totalOwed -= payment.amount;
        vendor.lastPaymentDate = new Date().toISOString();
        vendor.updatedAt = new Date().toISOString();
      }
    } else {
      payment.status = 'proof_rejected';
      payment.proofStatus = 'rejected';
      payment.rejectedAt = new Date().toISOString();
    }

    payment.updatedAt = new Date().toISOString();

    return { 
      verified, 
      proof: { ...proof }, 
      payment: { ...payment } 
    };
  }

  // Finance Manager Role Validation
  validateFinanceManagerRole() {
    return this.currentUserRole === 'admin' || this.currentUserRole === this.financeManagerRole;
  }

  async setUserRole(role) {
    await this.delay(100);
    this.currentUserRole = role;
    return { role };
  }

  async getCurrentUserRole() {
    await this.delay(100);
    return { role: this.currentUserRole };
  }

  // Reporting and Analytics
  async getVendorPaymentSummary(vendorId) {
    await this.delay(400);
    
    const vendor = this.vendors.find(v => v.Id === vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const bills = this.vendorBills.filter(b => b.vendorId === vendorId);
    const payments = this.vendorPayments.filter(p => p.vendorId === vendorId);

    const summary = {
      vendor: { ...vendor },
      totalBills: bills.length,
      totalBillAmount: bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      paidBills: bills.filter(b => b.status === 'paid').length,
      pendingBills: bills.filter(b => b.status === 'pending').length,
      overdueBills: bills.filter(b => 
        b.status === 'pending' && new Date(b.dueDate) < new Date()
      ).length,
      totalPayments: payments.length,
      completedPayments: payments.filter(p => p.status === 'completed').length,
      pendingPayments: payments.filter(p => p.status === 'pending_proof').length,
      rejectedPayments: payments.filter(p => p.status === 'proof_rejected').length
    };

    return summary;
  }

  async getVendorPaymentHistory(vendorId, limit = 50) {
    await this.delay(300);
    
    const payments = this.vendorPayments
      .filter(p => p.vendorId === vendorId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return payments.map(payment => ({ ...payment }));
  }

  async getPendingVendorBills() {
    await this.delay(300);
    
    const pendingBills = this.vendorBills
      .filter(bill => bill.status === 'pending')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return pendingBills.map(bill => ({ ...bill }));
  }

  async getOverdueBills() {
    await this.delay(300);
    
    const today = new Date();
    const overdueBills = this.vendorBills
      .filter(bill => bill.status === 'pending' && new Date(bill.dueDate) < today)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return overdueBills.map(bill => ({ ...bill }));
  }

  async getPaymentProofQueue() {
    await this.delay(300);
    
    const pendingProofs = this.paymentProofs
      .filter(proof => proof.status === 'pending_verification')
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));

    return pendingProofs.map(proof => ({ ...proof }));
  }

  // Utility Methods for Vendor System
  getNextVendorId() {
    const maxId = this.vendors.reduce((max, vendor) => 
      vendor.Id > max ? vendor.Id : max, 0);
    return maxId + 1;
  }

  getNextBillId() {
    const maxId = this.vendorBills.reduce((max, bill) => 
      bill.Id > max ? bill.Id : max, 0);
    return maxId + 1;
  }

  getNextPaymentId() {
    const maxId = this.vendorPayments.reduce((max, payment) => 
      payment.Id > max ? payment.Id : max, 0);
    return maxId + 1;
  }

  getNextProofId() {
    const maxId = this.paymentProofs.reduce((max, proof) => 
      proof.Id > max ? proof.Id : max, 0);
    return maxId + 1;
  }

  generateBillNumber() {
    return 'BILL-' + Date.now().toString().slice(-8);
  }

  calculateDueDate(paymentTerms) {
    const days = parseInt(paymentTerms.replace(/\D/g, '')) || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString();
  }
generateFileUrl(fileName) {
    // Simulate file URL generation
    return `https://storage.example.com/proofs/${Date.now()}-${fileName}`;
  }

  // File Storage Service Methods
// Enhanced File Storage Service Methods with comprehensive security
async uploadPaymentProof(file, orderId, transactionId, userId = null) {
    await this.delay(500);
    
    if (!file || !file.name) {
      throw new Error('Invalid file provided');
    }

    // Enhanced image-only validation for payment proofs
    const validationResult = await this.validateImageUpload(file);
    if (!validationResult.isValid) {
throw new Error(validationResult.error);
    }

    // Enhanced ClamAV malware scanning with quarantine
    const scanResult = await this.performMalwareScan(file);
    if (!scanResult.isClean) {
      // File has been quarantined, provide detailed error
      const quarantineInfo = scanResult.quarantineId ? 
        ` File has been quarantined for security review (ID: ${scanResult.quarantineId}).` : '';
      throw new Error(`File failed security scan due to detected threats: ${scanResult.threats.join(', ')}.${quarantineInfo} Please ensure the file is safe and try again.`);
    }
    // Generate unique filename with OrderID_UserID_Timestamp pattern
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const currentUserId = userId || 'user_' + Math.random().toString(36).substring(2, 8);
    const uniqueFileName = `payment_proof_${orderId}_${currentUserId}_${timestamp}_${randomString}.${fileExtension}`;

    // Simulate S3 upload with pre-signed URLs for admin access
    const s3Bucket = 'freshmart-payment-proofs';
    const s3Region = 'us-east-1';
    const s3BaseUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com`;
    const fileUrl = `${s3BaseUrl}/payment-proofs/${uniqueFileName}`;

    // Generate optimized 120x120 thumbnail using Sharp.js simulation
    const thumbnailData = await this.generateOptimizedThumbnail(file, uniqueFileName);

    const uploadedFile = {
      Id: this.getNextProofId(),
      originalName: file.name,
      fileName: uniqueFileName,
      filePath: `payment-proofs/${uniqueFileName}`,
      fileUrl: fileUrl,
      fileType: file.type,
      fileSize: file.size,
      orderId: orderId,
      transactionId: transactionId,
      userId: currentUserId,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'customer',
      status: 'uploaded',
      thumbnailUrl: thumbnailData.thumbnailUrl,
      thumbnailPath: thumbnailData.thumbnailPath,
      mimeType: file.type,
      isValid: true,
      isSecure: true,
      scanResult: scanResult,
      checksumMD5: this.generateChecksum(file),
      accessLevel: 'restricted',
      expiresAt: this.calculateExpirationDate(),
      s3Bucket: s3Bucket,
      s3Key: `payment-proofs/${uniqueFileName}`,
      preSignedUrlExpiry: this.calculatePreSignedExpiry(),
      metadata: {
        originalSize: file.size,
        compressedSize: Math.floor(file.size * 0.8),
        format: fileExtension,
        dimensions: file.type.startsWith('image/') ? await this.extractImageDimensions(file) : null,
        colorSpace: file.type.startsWith('image/') ? 'sRGB' : null,
        thumbnailDimensions: '120x120',
        optimized: true
      }
    };

    this.paymentProofs.push(uploadedFile);
    
    // Log the upload for audit trail
    await this.logFileUpload(uploadedFile);
    
    return { ...uploadedFile };
  }

  // Enhanced file validation with comprehensive checks
// Enhanced image-only validation for payment proofs
  async validateImageUpload(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const minSize = 1024; // 1KB minimum

    // MIME type validation - Images only
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file type: ${file.type}. Only image files (JPEG, PNG, WebP) are allowed for payment proofs.`
      };
    }

    // File extension validation
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Invalid file extension: .${fileExtension}. Only ${allowedExtensions.join(', ')} extensions are allowed.`
      };
    }

    // File size validation
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `Image size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed size is 5MB.`
      };
    }

    if (file.size < minSize) {
      return {
        isValid: false,
        error: `Image file too small: ${file.size} bytes. Minimum file size is 1KB.`
      };
    }

    // Filename validation
    if (file.name.length > 255) {
      return {
        isValid: false,
        error: 'Filename too long. Maximum 255 characters allowed.'
      };
    }

    // Check for suspicious filename patterns
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (suspiciousPatterns.some(pattern => file.name.toLowerCase().includes(pattern))) {
      return {
        isValid: false,
        error: 'Suspicious file detected. Please upload a valid image.'
      };
    }

    // Additional image validation
    try {
      const dimensions = await this.extractImageDimensions(file);
      if (dimensions.width < 100 || dimensions.height < 100) {
        return {
          isValid: false,
          error: 'Image dimensions too small. Minimum size is 100x100 pixels.'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid image file or corrupted image data.'
      };
    }

    return { isValid: true };
  }
// Enhanced ClamAV malware scanning with quarantine capabilities
  async performMalwareScan(file) {
    await this.delay(300); // Simulate comprehensive scan time
    
    // Initialize quarantine system if not exists
    if (!this.quarantineStorage) {
      this.quarantineStorage = [];
      this.quarantineIdCounter = 1;
    }
    
    // Simulate comprehensive scanning process
    const scanResults = {
      scannedAt: new Date().toISOString(),
      scanEngine: 'ClamAV-Enhanced',
      scanVersion: '1.2.0',
      isClean: Math.random() > 0.002, // 99.8% clean files (slightly higher detection rate)
      threats: [],
      scanTime: Math.floor(Math.random() * 800) + 200, // 200-1000ms scan time
      quarantineRequired: false,
      quarantineId: null,
      scanDepth: 'deep',
      heuristicAnalysis: true,
      signatureMatches: 0,
      riskLevel: 'low'
    };

    // Simulate threat detection with quarantine workflow
    if (!scanResults.isClean) {
      // Generate threat details
      const threatTypes = [
        'Trojan.Generic.Suspicious',
        'Malware.Win32.Agent',
        'Adware.Bundle.Detected',
        'PUA.Potentially.Unwanted',
        'Phishing.Email.Attachment'
      ];
      
      scanResults.threats = [threatTypes[Math.floor(Math.random() * threatTypes.length)]];
      scanResults.quarantineRequired = true;
      scanResults.riskLevel = 'high';
      scanResults.signatureMatches = Math.floor(Math.random() * 3) + 1;
      
      // Quarantine the suspicious file
      const quarantineEntry = await this.quarantineFile(file, scanResults);
      scanResults.quarantineId = quarantineEntry.Id;
    }

    return scanResults;
  }

  // Quarantine system for suspicious files
  async quarantineFile(file, scanResults) {
    const quarantineEntry = {
      Id: this.quarantineIdCounter++,
      originalFileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      quarantinedAt: new Date().toISOString(),
      threats: scanResults.threats,
      riskLevel: scanResults.riskLevel,
      scanEngine: scanResults.scanEngine,
      status: 'quarantined',
      isolationLevel: 'strict',
      quarantineLocation: `quarantine/isolation/${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      reviewRequired: true,
      autoDeleteAfter: this.calculateQuarantineExpiry(),
      metadata: {
        originalUploadAttempt: new Date().toISOString(),
        detectionDetails: scanResults.threats,
        scanTime: scanResults.scanTime,
        heuristics: scanResults.heuristicAnalysis
      }
    };

    this.quarantineStorage.push(quarantineEntry);
    
    // Log quarantine action for audit trail
    await this.logQuarantineAction(quarantineEntry, 'file_quarantined');
    
    return quarantineEntry;
  }

  // Calculate quarantine expiry (30 days default)
  calculateQuarantineExpiry() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate.toISOString();
  }

  // Log quarantine actions for comprehensive audit trail
  async logQuarantineAction(quarantineEntry, action) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: action,
      quarantineId: quarantineEntry.Id,
      fileName: quarantineEntry.originalFileName,
      threats: quarantineEntry.threats,
      riskLevel: quarantineEntry.riskLevel,
      performedBy: 'clamav_scanner',
      ipAddress: '127.0.0.1',
      userAgent: 'ClamAV-Scanner'
    };
    
    // In real implementation, this would be sent to audit logging service
    console.log('Quarantine audit log:', auditEntry);
  }

  // Get quarantined files for admin review
  async getQuarantinedFiles() {
    await this.delay(200);
    if (!this.quarantineStorage) return [];
    
    return [...this.quarantineStorage]
      .sort((a, b) => new Date(b.quarantinedAt) - new Date(a.quarantinedAt));
  }

  // Admin quarantine management
  async reviewQuarantinedFile(quarantineId, action, adminRole = 'admin') {
    await this.delay(300);
    
    if (!this.validateAdminAccess(adminRole)) {
      throw new Error('Admin authentication required for quarantine management');
    }

    const quarantineEntry = this.quarantineStorage?.find(q => q.Id === quarantineId);
    if (!quarantineEntry) {
      throw new Error('Quarantined file not found');
    }

    const validActions = ['release', 'delete', 'extend_quarantine'];
    if (!validActions.includes(action)) {
      throw new Error('Invalid quarantine action');
    }

    quarantineEntry.reviewedAt = new Date().toISOString();
    quarantineEntry.reviewedBy = adminRole;
    quarantineEntry.action = action;

    switch (action) {
      case 'release':
        quarantineEntry.status = 'released';
        break;
      case 'delete':
        quarantineEntry.status = 'deleted';
        quarantineEntry.deletedAt = new Date().toISOString();
        break;
      case 'extend_quarantine':
        quarantineEntry.autoDeleteAfter = this.calculateQuarantineExpiry();
        quarantineEntry.status = 'extended';
        break;
    }

    await this.logQuarantineAction(quarantineEntry, `quarantine_${action}`);
    return { ...quarantineEntry };
  }

  // Generate secure thumbnail with 200x200 WebP format
// Generate optimized 120x120 thumbnail using Sharp.js simulation
  async generateOptimizedThumbnail(file, originalFileName) {
    if (!file.type.startsWith('image/')) {
      return {
        thumbnailUrl: '/assets/icons/image-placeholder.png',
        thumbnailPath: null
      };
    }

    await this.delay(300); // Simulate Sharp.js processing time

    // Generate thumbnail filename with WebP format for optimal compression
    const thumbnailFileName = originalFileName.replace(/\.[^/.]+$/, '_thumb_120x120.webp');
    const s3Bucket = 'freshmart-payment-proofs';
    const s3Region = 'us-east-1';
    const s3BaseUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com`;
    const thumbnailPath = `payment-proofs/thumbnails/${thumbnailFileName}`;
    const thumbnailUrl = `${s3BaseUrl}/${thumbnailPath}`;

    // Simulate Sharp.js processing with optimized settings
    return {
      thumbnailUrl: thumbnailUrl,
      thumbnailPath: thumbnailPath,
      dimensions: '120x120',
      format: 'webp',
      quality: 80, // Optimized for fast loading
      fileSize: Math.floor(file.size * 0.05), // Thumbnails are ~5% of original size
      generatedAt: new Date().toISOString(),
      optimizedForSpeed: true,
      targetLoadTime: '<2s'
    };
  }

  // Extract image dimensions for validation
  async extractImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function() {
        resolve({
          width: this.width,
          height: this.height
        });
      };
      img.onerror = function() {
        reject(new Error('Failed to load image for dimension extraction'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // Calculate pre-signed URL expiry (5 minutes for admin access)
  calculatePreSignedExpiry() {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 5);
    return expiryDate.toISOString();
  }

  // Generate file checksum for integrity verification
  generateChecksum(file) {
    // Simulate MD5 checksum generation
    const randomBytes = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return randomBytes.slice(0, 32);
  }

  // Calculate expiration date (30 days from upload)
  calculateExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    return expirationDate.toISOString();
  }

  // Log file upload for audit trail
  async logFileUpload(fileData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'file_upload',
      fileId: fileData.Id,
      fileName: fileData.fileName,
      orderId: fileData.orderId,
      userId: fileData.userId,
      fileSize: fileData.fileSize,
      mimeType: fileData.mimeType,
      ipAddress: '127.0.0.1', // In real implementation, get from request
      userAgent: 'Customer-App'
    };
    
    // In real implementation, this would be sent to logging service
    console.log('File upload audit log:', logEntry);
  }

// Enhanced admin access with pre-signed S3 URLs and 5-minute expiry
async servePaymentProofForAdmin(fileName, userRole = 'admin', sessionToken = null, clientIP = null) {
    await this.delay(200);
    
    // Enhanced authentication and authorization for admin access
    if (!this.validateAdminAccess(userRole, sessionToken)) {
      throw new Error('Admin authentication required to access payment proof');
    }
    
    // Validate admin has permission to access file with detailed RBAC
    if (!this.hasAdminFileAccess(userRole)) {
      throw new Error('Insufficient admin permissions to access payment proof');
    }

    const proof = this.paymentProofs.find(p => p.fileName === fileName);
    if (!proof) {
      throw new Error('Payment proof not found or access denied');
    }

    // Check if file has been marked as deleted or expired
    if (proof.status === 'deleted' || proof.isDeleted) {
      throw new Error('Payment proof has been removed');
    }

    // Enhanced quarantine status check
    if (proof.quarantineStatus === 'quarantined') {
      throw new Error('File access denied - file is currently quarantined due to security concerns');
    }

    // Check file expiration (30+ days)
    if (this.isProofExpired(proof.uploadedAt)) {
      throw new Error('Payment proof has expired and been archived');
    }

    // Verify file integrity
    const integrityCheck = await this.verifyFileIntegrity(proof);
    if (!integrityCheck.isValid) {
      throw new Error('File integrity check failed');
    }

    // Check S3 file existence with enhanced validation
    const fileExists = await this.verifyS3FileExists(proof);
    if (!fileExists.exists) {
      throw new Error(`File not found on S3 storage: ${fileExists.reason}`);
    }

    // Perform real-time security scan
    const securityScan = await this.performRealTimeSecurityScan(proof);
    if (!securityScan.isSafe) {
      throw new Error('File access denied due to security concerns');
    }

    // Generate pre-signed URLs with 5-minute expiry
    const preSignedUrls = await this.generatePreSignedUrls(proof);

    // Enhanced audit trail logging for comprehensive file access tracking
    await this.logAdminFileAccess(proof, userRole, clientIP, sessionToken);

    // Return enhanced file data with pre-signed URLs and security headers
    return {
      fileName: proof.fileName,
      originalName: proof.originalName,
      filePath: proof.filePath,
      mimeType: proof.mimeType,
      fileSize: proof.fileSize,
      lastModified: proof.uploadedAt,
      isValid: proof.isValid,
      isSecure: proof.isSecure,
      checksumMD5: proof.checksumMD5,
      s3Bucket: proof.s3Bucket,
      s3Key: proof.s3Key,
      quarantineStatus: proof.quarantineStatus || 'clean',
      
      // Pre-signed URLs with 5-minute expiry
      preSignedUrls: {
        fullImage: preSignedUrls.fullImage,
        thumbnail: preSignedUrls.thumbnail,
        expiresAt: preSignedUrls.expiresAt,
        expiresIn: '5 minutes'
      },
      
      contentDisposition: `inline; filename="${proof.originalName}"`,
      cacheControl: 'private, no-cache, no-store, must-revalidate',
      securityHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data: https://*.amazonaws.com; style-src 'unsafe-inline';",
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Download-Options': 'noopen',
        'X-Permitted-Cross-Domain-Policies': 'none'
      },
      accessMetadata: {
        accessedBy: userRole,
        accessedAt: new Date().toISOString(),
        accessMethod: 'admin_api_with_presigned_urls',
        sessionId: sessionToken?.substring(0, 8) + '...' || 'admin_session',
        ipAddress: clientIP || 'unknown',
        auditTrailId: this.generateAuditTrailId()
      }
    };
  }

  // Generate pre-signed URLs for S3 access with 5-minute expiry
  async generatePreSignedUrls(proof) {
    await this.delay(100);
    
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 5);
    
    const baseParams = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&X-Amz-Date=${new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')}`;
    
    return {
      fullImage: `${proof.fileUrl}?${baseParams}&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_full`,
      thumbnail: `${proof.thumbnailUrl}?${baseParams}&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_thumb`,
      expiresAt: expiryTime.toISOString(),
      generatedAt: new Date().toISOString()
    };
  }

  // Enhanced admin access validation
  validateAdminAccess(userRole, sessionToken) {
    const adminRoles = ['admin', 'finance_manager', 'support_admin'];
    return adminRoles.includes(userRole) && (sessionToken || userRole === 'admin'); // Admin can bypass token for mock
  }

  // Enhanced admin RBAC for file access
  hasAdminFileAccess(userRole) {
    const adminFileAccessMatrix = {
      'admin': true,
      'finance_manager': true,
      'support_admin': true,
      'support_manager': false,
      'customer': false
    };
    
    return adminFileAccessMatrix[userRole] || false;
  }

  // Verify S3 file existence
  async verifyS3FileExists(proof) {
    await this.delay(150);
    
    // Simulate S3 HeadObject operation
    const scenarios = [
      { exists: true, reason: 's3_file_accessible' },
      { exists: false, reason: 's3_file_not_found' },
      { exists: false, reason: 's3_access_denied' },
      { exists: false, reason: 's3_service_unavailable' }
    ];
    
    // 97% success rate for S3 operations
    const randomIndex = Math.random();
    if (randomIndex > 0.03) {
      return scenarios[0]; // Success
    } else {
      return scenarios[Math.floor(Math.random() * 3) + 1]; // Random failure
    }
  }

  // Log admin file access for comprehensive audit trail
// Enhanced comprehensive audit trail logging for all file access
  async logAdminFileAccess(proof, userRole, clientIP, sessionToken = null) {
    // Initialize audit trail storage if not exists
    if (!this.auditTrail) {
      this.auditTrail = [];
      this.auditTrailIdCounter = 1;
    }

    const auditEntry = {
      Id: this.auditTrailIdCounter++,
      timestamp: new Date().toISOString(),
      action: 'admin_file_access',
      fileId: proof.Id,
      fileName: proof.fileName,
      originalName: proof.originalName,
      orderId: proof.orderId,
      transactionId: proof.transactionId,
      userId: proof.userId,
      accessedBy: userRole,
      clientIP: clientIP || '127.0.0.1',
      userAgent: 'Admin-Dashboard',
      sessionToken: sessionToken?.substring(0, 8) + '...' || 'admin_session',
      accessType: 'view_payment_proof',
      accessMethod: 'presigned_url_generation',
      s3Bucket: proof.s3Bucket,
      s3Key: proof.s3Key,
      fileSize: proof.fileSize,
      mimeType: proof.mimeType,
      quarantineStatus: proof.quarantineStatus || 'clean',
      successful: true,
      securityLevel: 'high',
      accessDuration: null, // To be updated when session ends
      downloadAttempted: false,
      complianceFlags: {
        gdprCompliant: true,
        dataRetention: '7_years',
        auditRequired: true,
        sensitiveData: true
      },
      metadata: {
        browserFingerprint: this.generateBrowserFingerprint(),
        geolocation: this.estimateGeolocation(clientIP),
        accessReason: 'admin_review',
        dataClassification: 'financial_document'
      }
    };

    this.auditTrail.push(auditEntry);
    
    // Also log to console for immediate monitoring
    console.log('Comprehensive file access audit log:', {
      auditId: auditEntry.Id,
      timestamp: auditEntry.timestamp,
      action: auditEntry.action,
      fileName: auditEntry.fileName,
      accessedBy: auditEntry.accessedBy,
      clientIP: auditEntry.clientIP,
      orderId: auditEntry.orderId,
      successful: auditEntry.successful
    });

    return auditEntry;
  }

  // Generate unique audit trail ID
  generateAuditTrailId() {
    return `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // Generate browser fingerprint for audit trail
  generateBrowserFingerprint() {
    return `FP_${Math.random().toString(36).substring(2, 12)}`;
  }

  // Estimate geolocation from IP (mock implementation)
  estimateGeolocation(clientIP) {
    const mockLocations = [
      { country: 'Pakistan', city: 'Lahore', region: 'Punjab' },
      { country: 'Pakistan', city: 'Karachi', region: 'Sindh' },
      { country: 'Pakistan', city: 'Islamabad', region: 'ICT' }
    ];
    return mockLocations[Math.floor(Math.random() * mockLocations.length)];
  }

  // Get comprehensive audit trail for compliance
  async getAuditTrail(filters = {}) {
    await this.delay(200);
    
    if (!this.auditTrail) return [];

    let filteredTrail = [...this.auditTrail];

    // Apply filters
    if (filters.startDate) {
      filteredTrail = filteredTrail.filter(entry => 
        new Date(entry.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredTrail = filteredTrail.filter(entry => 
        new Date(entry.timestamp) <= new Date(filters.endDate)
      );
    }

    if (filters.userRole) {
      filteredTrail = filteredTrail.filter(entry => 
        entry.accessedBy === filters.userRole
      );
    }

    if (filters.fileName) {
      filteredTrail = filteredTrail.filter(entry => 
        entry.fileName.includes(filters.fileName)
      );
    }

    if (filters.orderId) {
      filteredTrail = filteredTrail.filter(entry => 
        entry.orderId === filters.orderId
      );
    }

    return filteredTrail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Export audit trail for compliance reporting
  async exportAuditTrail(format = 'json', filters = {}) {
    await this.delay(300);
    
    const auditData = await this.getAuditTrail(filters);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: this.currentUserRole,
      format: format,
      totalRecords: auditData.length,
      filters: filters,
      data: auditData,
      compliance: {
        dataRetentionPolicy: '7_years',
        gdprCompliant: true,
        auditStandard: 'ISO_27001',
        encryptionLevel: 'AES_256'
      }
    };

    return exportData;
  }

  // Enhanced secure access validation
  validateSecureAccess(userRole, sessionToken) {
    const authorizedRoles = ['admin', 'finance_manager', 'support_manager'];
    return authorizedRoles.includes(userRole) && (sessionToken || userRole === 'admin'); // Admin can bypass token for mock
  }

  // Enhanced RBAC for file access
  hasSecureFileAccess(userRole) {
    const fileAccessMatrix = {
      'admin': true,
      'finance_manager': true,
      'support_manager': false, // Can see files but not download
      'customer': false // Customers can only see their own files (additional validation needed)
    };
    
    return fileAccessMatrix[userRole] || false;
  }

  // Check if proof has expired
  isProofExpired(uploadDate) {
    const uploadTime = new Date(uploadDate).getTime();
    const currentTime = new Date().getTime();
    const expirationPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    return (currentTime - uploadTime) > expirationPeriod;
  }

  // Verify file integrity using checksum
  async verifyFileIntegrity(proof) {
    await this.delay(100);
    
    // Simulate integrity verification
    const isValid = Math.random() > 0.001; // 99.9% integrity success rate
    
    return {
      isValid: isValid,
      originalChecksum: proof.checksumMD5,
      currentChecksum: isValid ? proof.checksumMD5 : 'corrupted',
      verifiedAt: new Date().toISOString()
    };
  }

  // Enhanced file existence verification
  async verifyFileExists(proof) {
    await this.delay(150);
    
    // Simulate various failure scenarios
    const scenarios = [
      { exists: true, reason: 'file_accessible' },
      { exists: false, reason: 'file_not_found' },
      { exists: false, reason: 'storage_unavailable' },
      { exists: false, reason: 'permission_denied' }
    ];
    
    // 95% success rate with specific error reasons
    const randomIndex = Math.random();
    if (randomIndex > 0.05) {
      return scenarios[0]; // Success
    } else {
      return scenarios[Math.floor(Math.random() * 3) + 1]; // Random failure
    }
  }

  // Real-time security scanning
  async performRealTimeSecurityScan(proof) {
    await this.delay(200);
    
    const scanResult = {
      isSafe: Math.random() > 0.0001, // 99.99% safe files
      scanEngine: 'ClamAV-Realtime',
      scanVersion: '1.1.0',
      scannedAt: new Date().toISOString(),
      threats: [],
      riskLevel: 'low'
    };
    
    if (!scanResult.isSafe) {
      scanResult.threats = ['Suspicious.Activity.Detected'];
      scanResult.riskLevel = 'high';
    }
    
    return scanResult;
  }

  // Log file access for comprehensive audit trail
  async logFileAccess(proof, userRole, clientIP) {
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'file_access',
      fileId: proof.Id,
      fileName: proof.fileName,
      orderId: proof.orderId,
      accessedBy: userRole,
      clientIP: clientIP || '127.0.0.1',
      userAgent: 'Admin-Dashboard',
      accessType: 'download',
      successful: true
    };
    
    // In real implementation, send to audit logging service
    console.log('File access audit log:', accessLog);
  }

  generateThumbnailUrl(fileName, mimeType) {
    // Generate thumbnail URL based on file type
    if (mimeType.startsWith('image/')) {
      return `/api/payment-proofs/thumbnails/${fileName}`;
    }
    // Return default PDF icon for PDF files
    return '/assets/icons/pdf-thumbnail.png';
  }

  async getPaymentProofsByOrder(orderId) {
    await this.delay(200);
    return this.paymentProofs
      .filter(proof => proof.orderId === orderId)
      .map(proof => ({ ...proof }));
  }

  async validatePaymentProofAccess(fileName, userRole, userId = null) {
    await this.delay(100);
    
    const proof = this.paymentProofs.find(p => p.fileName === fileName);
    if (!proof) {
      return { valid: false, error: 'Payment proof not found' };
    }

    // Admin and finance managers have full access
    if (userRole === 'admin' || userRole === 'finance_manager') {
      return { valid: true, proof: { ...proof } };
    }

    // Customers can only access their own files (additional validation would be needed)
    if (userRole === 'customer') {
      return { valid: false, error: 'Insufficient permissions' };
    }

    return { valid: false, error: 'Invalid user role' };
  }

  async deletePaymentProof(fileName) {
    await this.delay(300);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const index = this.paymentProofs.findIndex(p => p.fileName === fileName);
    if (index === -1) {
      throw new Error('Payment proof not found');
    }

    // Mark as deleted instead of removing (for audit trail)
    this.paymentProofs[index].status = 'deleted';
this.paymentProofs[index].deletedAt = new Date().toISOString();
    this.paymentProofs[index].deletedBy = this.currentUserRole;

    return { success: true };
  }

  // Recurring Payment Automation Methods
  async createRecurringPayment(recurringData) {
    await this.delay(500);
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    // Validate required fields
    if (!recurringData.name || !recurringData.vendorId || !recurringData.amount || !recurringData.frequency) {
      throw new Error('Name, vendor ID, amount, and frequency are required');
    }

    // Validate vendor exists
    const vendor = this.vendors.find(v => v.Id === recurringData.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(recurringData.frequency)) {
      throw new Error('Invalid frequency. Must be daily, weekly, monthly, quarterly, or yearly');
    }

    const recurringPayment = {
      Id: this.recurringPaymentIdCounter++,
      name: recurringData.name,
      vendorId: recurringData.vendorId,
      vendorName: vendor.name,
      amount: parseFloat(recurringData.amount),
      frequency: recurringData.frequency,
      startDate: recurringData.startDate || new Date().toISOString(),
      endDate: recurringData.endDate || null,
      nextPaymentDate: this.calculateNextPaymentDate(recurringData.startDate || new Date().toISOString(), recurringData.frequency),
      status: 'active',
      description: recurringData.description || `Recurring payment to ${vendor.name}`,
      paymentMethod: recurringData.paymentMethod || 'bank_transfer',
      autoRetry: recurringData.autoRetry !== false,
      maxRetries: recurringData.maxRetries || 3,
      retryInterval: recurringData.retryInterval || 24, // hours
      emailNotifications: recurringData.emailNotifications !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentUserRole,
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      lastPaymentDate: null,
      lastPaymentStatus: null,
      lastPaymentAmount: null,
      metadata: recurringData.metadata || {}
    };

    // Validate the recurring payment data
    const validation = this.validateRecurringPayment(recurringPayment);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this.recurringPayments.push(recurringPayment);

    // Schedule the first payment
    await this.scheduleNextPayment(recurringPayment);

    return { ...recurringPayment };
  }

  async updateRecurringPayment(recurringId, updateData) {
    await this.delay(400);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const recurring = this.recurringPayments.find(r => r.Id === recurringId);
    if (!recurring) {
      throw new Error('Recurring payment not found');
    }

    // If changing vendor, validate new vendor exists
    if (updateData.vendorId && updateData.vendorId !== recurring.vendorId) {
      const vendor = this.vendors.find(v => v.Id === updateData.vendorId);
      if (!vendor) {
        throw new Error('New vendor not found');
      }
      updateData.vendorName = vendor.name;
    }

    // If changing frequency or start date, recalculate next payment date
    if (updateData.frequency && updateData.frequency !== recurring.frequency) {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validFrequencies.includes(updateData.frequency)) {
        throw new Error('Invalid frequency');
      }
      updateData.nextPaymentDate = this.calculateNextPaymentDate(
        recurring.nextPaymentDate, 
        updateData.frequency
      );
    }

    // Update the recurring payment
    Object.assign(recurring, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    // If status changed to active, ensure next payment is scheduled
    if (updateData.status === 'active' && recurring.status === 'active') {
      await this.scheduleNextPayment(recurring);
    }

    // If status changed to paused or cancelled, remove scheduled payments
    if (updateData.status && ['paused', 'cancelled'].includes(updateData.status)) {
      this.scheduledPayments = this.scheduledPayments.filter(
        sp => sp.recurringPaymentId !== recurringId
      );
    }

    return { ...recurring };
  }

  async pauseRecurringPayment(recurringId) {
    await this.delay(300);
    
    return await this.updateRecurringPayment(recurringId, { 
      status: 'paused',
      pausedAt: new Date().toISOString(),
      pausedBy: this.currentUserRole
    });
  }

  async resumeRecurringPayment(recurringId) {
    await this.delay(300);
    
    const recurring = this.recurringPayments.find(r => r.Id === recurringId);
    if (!recurring) {
      throw new Error('Recurring payment not found');
    }

    // Recalculate next payment date from now
    const nextPaymentDate = this.calculateNextPaymentDate(new Date().toISOString(), recurring.frequency);
    
    return await this.updateRecurringPayment(recurringId, { 
      status: 'active',
      nextPaymentDate,
      resumedAt: new Date().toISOString(),
      resumedBy: this.currentUserRole
    });
  }

  async deleteRecurringPayment(recurringId) {
    await this.delay(300);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const index = this.recurringPayments.findIndex(r => r.Id === recurringId);
    if (index === -1) {
      throw new Error('Recurring payment not found');
    }

    // Remove all scheduled payments for this recurring payment
    this.scheduledPayments = this.scheduledPayments.filter(
      sp => sp.recurringPaymentId !== recurringId
    );

    // Mark as cancelled instead of deleting (for audit trail)
    this.recurringPayments[index].status = 'cancelled';
    this.recurringPayments[index].cancelledAt = new Date().toISOString();
    this.recurringPayments[index].cancelledBy = this.currentUserRole;

    return { success: true };
  }

  async getRecurringPayments(status = 'all') {
    await this.delay(300);
    
    let payments = [...this.recurringPayments];
    
    if (status !== 'all') {
      payments = payments.filter(r => r.status === status);
    }
    
    return payments.sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate));
  }

  async getRecurringPaymentById(recurringId) {
    await this.delay(200);
    
    const recurring = this.recurringPayments.find(r => r.Id === recurringId);
    if (!recurring) {
      throw new Error('Recurring payment not found');
    }
    
    return { ...recurring };
  }

  async getScheduledPayments(days = 30) {
    await this.delay(300);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    return this.scheduledPayments
      .filter(sp => new Date(sp.scheduledDate) <= endDate)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .map(sp => ({
        ...sp,
        recurringPayment: this.recurringPayments.find(r => r.Id === sp.recurringPaymentId)
      }));
  }

  async processRecurringPayments() {
    await this.delay(1000);
    
    const now = new Date();
    const duePayments = this.scheduledPayments.filter(sp => 
      new Date(sp.scheduledDate) <= now && sp.status === 'pending'
    );

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const scheduledPayment of duePayments) {
      try {
        const result = await this.processScheduledPayment(scheduledPayment);
        results.processed++;
        
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            recurringPaymentId: scheduledPayment.recurringPaymentId,
            error: result.error
          });
        }
      } catch (error) {
        results.processed++;
        results.failed++;
        results.errors.push({
          recurringPaymentId: scheduledPayment.recurringPaymentId,
          error: error.message
        });
      }
    }

    return results;
  }

  async processScheduledPayment(scheduledPayment) {
    try {
      const recurring = this.recurringPayments.find(r => r.Id === scheduledPayment.recurringPaymentId);
      if (!recurring || recurring.status !== 'active') {
        throw new Error('Recurring payment is not active');
      }

      // Check end date
      if (recurring.endDate && new Date() > new Date(recurring.endDate)) {
        recurring.status = 'completed';
        recurring.completedAt = new Date().toISOString();
        throw new Error('Recurring payment has reached end date');
      }

      // Attempt to process the payment
      const payment = {
        Id: this.getNextPaymentId(),
        recurringPaymentId: recurring.Id,
        vendorId: recurring.vendorId,
        vendorName: recurring.vendorName,
        amount: recurring.amount,
        paymentMethod: recurring.paymentMethod,
        status: 'processing',
        transactionId: this.generateTransactionId(),
        timestamp: new Date().toISOString(),
        paidBy: 'automated_system',
        reference: `Recurring payment: ${recurring.name}`,
        notes: `Automated payment - ${recurring.description}`,
        isRecurring: true,
        scheduledPaymentId: scheduledPayment.Id
      };

      // Simulate payment processing (in real implementation, this would call actual payment gateway)
      const success = Math.random() > 0.1; // 90% success rate for automated payments
      
      if (success) {
        payment.status = 'completed';
        payment.completedAt = new Date().toISOString();
        
        // Update recurring payment stats
        recurring.totalPayments++;
        recurring.successfulPayments++;
        recurring.lastPaymentDate = new Date().toISOString();
        recurring.lastPaymentStatus = 'success';
        recurring.lastPaymentAmount = recurring.amount;
        
        // Update vendor totals
        const vendor = this.vendors.find(v => v.Id === recurring.vendorId);
        if (vendor) {
          vendor.totalPaid += recurring.amount;
          vendor.lastPaymentDate = new Date().toISOString();
          vendor.updatedAt = new Date().toISOString();
        }
        
        // Schedule next payment
        await this.scheduleNextPayment(recurring);
        
      } else {
        throw new Error('Payment processing failed');
      }

      this.vendorPayments.push(payment);
      
      // Mark scheduled payment as completed
      scheduledPayment.status = 'completed';
      scheduledPayment.processedAt = new Date().toISOString();
      scheduledPayment.paymentId = payment.Id;

      return { success: true, payment };
} catch (error) {
      // Handle payment failure
      recurring.totalPayments++;
      recurring.failedPayments++;
      recurring.lastPaymentDate = new Date().toISOString();
      recurring.lastPaymentStatus = 'failed';
      
      // Mark scheduled payment as failed
      scheduledPayment.status = 'failed';
      scheduledPayment.failedAt = new Date().toISOString();
      scheduledPayment.failureReason = error.message;
      scheduledPayment.retryCount = (scheduledPayment.retryCount || 0) + 1;

      // Handle retry logic
      if (recurring.autoRetry && scheduledPayment.retryCount < recurring.maxRetries) {
        // Schedule retry
        const retryDate = new Date();
        retryDate.setHours(retryDate.getHours() + recurring.retryInterval);
        
        const retryPayment = {
          Id: this.scheduledPaymentIdCounter++,
          recurringPaymentId: recurring.Id,
          scheduledDate: retryDate.toISOString(),
          amount: recurring.amount,
          status: 'pending',
          isRetry: true,
          originalScheduledPaymentId: scheduledPayment.Id,
          retryCount: scheduledPayment.retryCount,
          createdAt: new Date().toISOString()
        };
        
        this.scheduledPayments.push(retryPayment);
      } else {
        // Max retries reached or auto-retry disabled
        if (scheduledPayment.retryCount >= recurring.maxRetries) {
          recurring.status = 'failed';
          recurring.failedAt = new Date().toISOString();
          recurring.failureReason = `Max retries (${recurring.maxRetries}) exceeded`;
        }
      }

      return { success: false, error: error.message };
    }
  }

  async scheduleNextPayment(recurringPayment) {
    if (recurringPayment.status !== 'active') {
      return;
    }

    // Calculate next payment date
    const nextDate = this.calculateNextPaymentDate(recurringPayment.nextPaymentDate, recurringPayment.frequency);
    
    // Check if we've reached the end date
    if (recurringPayment.endDate && new Date(nextDate) > new Date(recurringPayment.endDate)) {
      recurringPayment.status = 'completed';
      recurringPayment.completedAt = new Date().toISOString();
      return;
    }

    // Update next payment date
    recurringPayment.nextPaymentDate = nextDate;
    recurringPayment.updatedAt = new Date().toISOString();

    // Create scheduled payment
    const scheduledPayment = {
      Id: this.scheduledPaymentIdCounter++,
      recurringPaymentId: recurringPayment.Id,
      scheduledDate: nextDate,
      amount: recurringPayment.amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isRetry: false,
      retryCount: 0
    };

    this.scheduledPayments.push(scheduledPayment);
    return scheduledPayment;
  }

  calculateNextPaymentDate(currentDate, frequency) {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        throw new Error('Invalid frequency');
    }
    
    return date.toISOString();
  }

  validateRecurringPayment(recurringPayment) {
    // Validate amount
    if (!recurringPayment.amount || recurringPayment.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    // Validate dates
    if (recurringPayment.endDate && new Date(recurringPayment.endDate) <= new Date(recurringPayment.startDate)) {
      return { valid: false, error: 'End date must be after start date' };
    }

    // Validate retry settings
    if (recurringPayment.maxRetries < 0 || recurringPayment.maxRetries > 10) {
      return { valid: false, error: 'Max retries must be between 0 and 10' };
    }

    if (recurringPayment.retryInterval < 1 || recurringPayment.retryInterval > 168) {
      return { valid: false, error: 'Retry interval must be between 1 and 168 hours' };
    }

    return { valid: true };
  }

  // Payment Automation Rules
  async createAutomationRule(ruleData) {
    await this.delay(400);
    
    if (!this.validateFinanceManagerRole()) {
      throw new Error('Insufficient permissions. Finance manager role required.');
    }

    const rule = {
      Id: this.automationRuleIdCounter++,
      name: ruleData.name,
      description: ruleData.description || '',
      enabled: ruleData.enabled !== false,
      conditions: ruleData.conditions || {},
      actions: ruleData.actions || {},
      priority: ruleData.priority || 1,
      createdAt: new Date().toISOString(),
      createdBy: this.currentUserRole,
      lastTriggered: null,
      triggerCount: 0
    };

    this.paymentAutomationRules.push(rule);
    return { ...rule };
  }

  async getAutomationRules() {
    await this.delay(200);
    return [...this.paymentAutomationRules].sort((a, b) => b.priority - a.priority);
  }

  async updateAutomationRule(ruleId, updateData) {
    await this.delay(300);
    
    const rule = this.paymentAutomationRules.find(r => r.Id === ruleId);
    if (!rule) {
      throw new Error('Automation rule not found');
    }

    Object.assign(rule, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return { ...rule };
  }

  async deleteAutomationRule(ruleId) {
    await this.delay(200);
    
    const index = this.paymentAutomationRules.findIndex(r => r.Id === ruleId);
    if (index === -1) {
      throw new Error('Automation rule not found');
    }

    this.paymentAutomationRules.splice(index, 1);
    return { success: true };
  }

  // Recurring Payment Analytics
  async getRecurringPaymentAnalytics(days = 30) {
    await this.delay(400);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const activeRecurring = this.recurringPayments.filter(r => r.status === 'active');
    const completedPayments = this.vendorPayments.filter(p => 
      p.isRecurring && 
      p.status === 'completed' &&
      new Date(p.timestamp) >= startDate
    );

    const totalAutomatedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgPaymentAmount = completedPayments.length > 0 ? totalAutomatedAmount / completedPayments.length : 0;

    // Success rate calculation
    const attemptedPayments = this.scheduledPayments.filter(sp => 
      sp.status !== 'pending' && 
      new Date(sp.createdAt) >= startDate
    );
    const successfulAttempts = attemptedPayments.filter(sp => sp.status === 'completed');
    const successRate = attemptedPayments.length > 0 ? (successfulAttempts.length / attemptedPayments.length) * 100 : 0;

    // Upcoming payments
    const upcomingPayments = this.scheduledPayments.filter(sp => 
      sp.status === 'pending' && 
      new Date(sp.scheduledDate) <= new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    );

    return {
      activeRecurringPayments: activeRecurring.length,
      totalAutomatedAmount,
      avgPaymentAmount,
      successRate,
      completedPayments: completedPayments.length,
      upcomingPayments: upcomingPayments.length,
      failedPayments: attemptedPayments.filter(sp => sp.status === 'failed').length,
      totalSavingsInTime: completedPayments.length * 15, // Estimated 15 minutes saved per automated payment
      recurringByFrequency: this.getRecurringByFrequency(),
      monthlyProjection: this.calculateMonthlyProjection()
    };
  }

  getRecurringByFrequency() {
    const frequencies = {};
    this.recurringPayments
      .filter(r => r.status === 'active')
      .forEach(r => {
        frequencies[r.frequency] = (frequencies[r.frequency] || 0) + 1;
      });
    return frequencies;
  }

  calculateMonthlyProjection() {
    const activeRecurring = this.recurringPayments.filter(r => r.status === 'active');
    let monthlyTotal = 0;

    activeRecurring.forEach(r => {
      const multiplier = {
        'daily': 30,
        'weekly': 4.33,
        'monthly': 1,
        'quarterly': 0.33,
        'yearly': 0.083
      }[r.frequency] || 1;

      monthlyTotal += r.amount * multiplier;
    });

    return monthlyTotal;
  }

  // Utility methods for recurring payments
  getNextRecurringId() {
    return this.recurringPaymentIdCounter++;
  }

  getNextScheduledId() {
    return this.scheduledPaymentIdCounter++;
  }

  getNextAutomationRuleId() {
return this.automationRuleIdCounter++;
  }

  // Quarantine management methods for admin oversight
  async getQuarantineStatistics() {
    await this.delay(200);
    
    if (!this.quarantineStorage) return { totalQuarantined: 0, activeQuarantine: 0, releasedFiles: 0, deletedFiles: 0 };

    const stats = {
      totalQuarantined: this.quarantineStorage.length,
      activeQuarantine: this.quarantineStorage.filter(q => q.status === 'quarantined').length,
      releasedFiles: this.quarantineStorage.filter(q => q.status === 'released').length,
      deletedFiles: this.quarantineStorage.filter(q => q.status === 'deleted').length,
      pendingReview: this.quarantineStorage.filter(q => q.reviewRequired && q.status === 'quarantined').length,
      threatBreakdown: this.getQuarantineThreatBreakdown()
    };

    return stats;
  }

  getQuarantineThreatBreakdown() {
    if (!this.quarantineStorage) return {};
    
    const breakdown = {};
    this.quarantineStorage.forEach(q => {
      q.threats.forEach(threat => {
        breakdown[threat] = (breakdown[threat] || 0) + 1;
      });
    });
    
    return breakdown;
  }

  // Bulk quarantine operations for admin efficiency
  async bulkQuarantineAction(quarantineIds, action, adminRole = 'admin') {
    await this.delay(500);
    
    if (!this.validateAdminAccess(adminRole)) {
      throw new Error('Admin authentication required for bulk quarantine operations');
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const quarantineId of quarantineIds) {
      try {
        await this.reviewQuarantinedFile(quarantineId, action, adminRole);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          quarantineId,
          error: error.message
        });
      }
    }

    return results;
  }
}

export const paymentService = new PaymentService();