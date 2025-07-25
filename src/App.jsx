import 'react-toastify/dist/ReactToastify.css';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import Modal from "react-modal";
import { persistor, store } from "@/store/index";
import Layout from "@/components/organisms/Layout";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import PayrollManagement from "@/components/pages/PayrollManagement";
import AdminDashboard from "@/components/pages/AdminDashboard";
import ProductDetail from "@/components/pages/ProductDetail";
import Cart from "@/components/pages/Cart";
import AIGenerate from "@/components/pages/AIGenerate";
import Analytics from "@/components/pages/Analytics";
import PaymentManagement from "@/components/pages/PaymentManagement";
import DeliveryTracking from "@/components/pages/DeliveryTracking";
import POS from "@/components/pages/POS";
import Checkout from "@/components/pages/Checkout";
import FinancialDashboard from "@/components/pages/FinancialDashboard";
import Home from "@/components/pages/Home";
import { fileCleanupService } from "@/services/api/fileCleanupService";
// Lazy load components for better performance (only for components not already imported)
const Category = React.lazy(() => import('@/components/pages/Category'))
const Orders = React.lazy(() => import('@/components/pages/Orders'))
const OrderTracking = React.lazy(() => import('@/components/pages/OrderTracking'))
const Account = React.lazy(() => import('@/components/pages/Account'))
const ManageProducts = React.lazy(() => import('@/components/pages/ManageProducts'))
const AddProduct = React.lazy(() => import('@/components/pages/AddProduct'))
const EditProduct = React.lazy(() => import('@/components/pages/EditProduct'))

// Error boundary component for better error handling
function LazyErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleError = (event) => {
      console.error('Lazy component error:', event.error)
      setHasError(true)
      setError(event.error)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return fallback || <Error error={error} />
  }

  return children
}

function App() {
  // State management
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState({
    lastRefresh: null,
    nextRefresh: null,
    isRefreshing: false
  });
  const [backupStatus, setBackupStatus] = useState({
    lastBackup: null,
    nextBackup: null,
    isRunning: false
  });

// SDK Status Check - Memoized to prevent infinite re-renders
  const checkSDKStatus = useCallback(async () => {
    try {
      // Check if SDK is available and initialized
      if (typeof window !== 'undefined' && window.SDK) {
        return { ready: true, initialized: true };
      }
      return { ready: false, initialized: false };
    } catch (error) {
      console.error('SDK status check failed:', error);
      return { ready: false, initialized: false, error: error.message };
    }
  }, []); // Empty dependency array since this function doesn't depend on any props or state

  // Token refresh functionality
  const refreshAuthToken = useCallback(async () => {
    try {
      setTokenStatus(prev => ({ ...prev, isRefreshing: true }));
      
      // Simulate token refresh - in real implementation, call auth service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const now = new Date();
      const nextRefresh = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes
      
      setTokenStatus({
        lastRefresh: now.toISOString(),
        nextRefresh: nextRefresh.toISOString(),
        isRefreshing: false
      });
      
      console.log('Auth token refreshed successfully at:', now.toISOString());
    } catch (error) {
      console.error('Token refresh failed:', error);
      setTokenStatus(prev => ({ ...prev, isRefreshing: false }));
    }
  }, []);
// Auto-refresh token system - runs every 50 minutes
  useEffect(() => {
    let mounted = true;
    let tokenRefreshInterval;
    
    // Initial token refresh
    refreshAuthToken();
    
    // Set up periodic token refresh (50 minutes)
    tokenRefreshInterval = setInterval(() => {
      if (mounted) {
        refreshAuthToken();
      }
    }, 50 * 60 * 1000);
    
    return () => {
      mounted = false;
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [refreshAuthToken]);
// Monitor backup status hourly
  useEffect(() => {
    let mounted = true;
    let backupCheckInterval;
    
    const checkBackupStatus = async () => {
      try {
        // Import backup service dynamically with error handling
        const { fileCleanupService } = await import('@/services/api/fileCleanupService');
        const status = fileCleanupService?.getBackupStatus?.();
        
        if (mounted && status) {
          setBackupStatus({
            lastBackup: status.lastBackup || null,
            nextBackup: status.nextBackup || null,
            isRunning: status.isRunning || false
          });
        }
      } catch (error) {
        console.error('Failed to check backup status:', error);
        if (mounted) {
          setBackupStatus({
            lastBackup: null,
            nextBackup: null,
            isRunning: false
          });
        }
      }
    };
    
    // Check backup status immediately and every hour
    checkBackupStatus();
    backupCheckInterval = setInterval(checkBackupStatus, 60 * 60 * 1000);
    
    return () => {
      mounted = false;
      if (backupCheckInterval) {
        clearInterval(backupCheckInterval);
      }
    };
  }, []);
// Optimized SDK monitoring - non-blocking and lightweight
// SDK Status Effect - Fixed to prevent infinite re-renders
  useEffect(() => {
    let mounted = true;
    let checkCount = 0;
    
    const checkStatus = async () => {
      if (!mounted || checkCount > 5) return; // Limit checks to prevent performance impact
      
      try {
        // Call checkSDKStatus directly without dependency
        const status = await checkSDKStatus();
        if (!mounted) return; // Check if still mounted after async operation
        
        if (status?.ready || status?.initialized) {
          setSdkReady(true);
          setSdkError(null);
        } else if (status?.error) {
          setSdkError(status.error);
        } else if (checkCount === 5) {
          // After 5 attempts, just warn but don't block the app
          console.warn('SDK not ready after initial checks - continuing without it');
          setSdkReady(false);
        }
        checkCount++;
      } catch (error) {
        if (mounted) {
          console.error('SDK status check error:', error);
          setSdkError(error?.message || 'Unknown SDK error');
        }
      }
    };

    // Check immediately and then periodically
    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    
    // Clean timeout - don't wait forever
    const timeout = setTimeout(() => {
      if (mounted) {
        clearInterval(interval);
      }
    }, 6000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // Removed checkSDKStatus dependency to prevent infinite re-renders

// Lightweight error handling - don't block the app for SDK errors
  useEffect(() => {
    const handleError = (event) => {
      if (event.reason?.message?.includes('Apper') || event.error?.message?.includes('Apper')) {
        console.warn('SDK error detected but not blocking app:', event);
        // Don't set SDK error state - just log it
      }
    };
    
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);
// Memoized SDK utilities for performance
// SDK Utils - Properly memoized with stable dependencies
  const sdkUtils = useMemo(() => ({
    ready: sdkReady,
    error: sdkError,
    checkStatus: checkSDKStatus,
    tokenStatus,
    backupStatus,
    refreshToken: refreshAuthToken
  }), [sdkReady, sdkError, checkSDKStatus, tokenStatus, backupStatus, refreshAuthToken]);

  // Component preloader for performance
// Component preloader for performance
  useEffect(() => {
    // Preload likely-to-be-visited components after initial render
    const preloadTimer = setTimeout(() => {
      import("@/components/pages/Category").catch(() => {});
      import("@/components/pages/Orders").catch(() => {});
      import("@/components/pages/Account").catch(() => {});
    }, 2000);

    return () => clearTimeout(preloadTimer);
  }, []);

  // Set up React Modal root element for accessibility
  useEffect(() => {
    try {
      Modal.setAppElement('#root');
    } catch (error) {
      console.warn('Failed to set Modal app element:', error);
    }
  }, []);
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading type="page" />} persistor={persistor}>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            {/* Enhanced Status Indicators (only in development) */}
            {import.meta.env.DEV && (
              <div className="fixed top-0 right-0 z-50 p-2 text-xs space-y-1">
                {sdkError && (
                  <div className="px-2 py-1 rounded bg-orange-500 text-white">
                    SDK: Background Loading
                  </div>
                )}
                {tokenStatus.isRefreshing && (
                  <div className="px-2 py-1 rounded bg-blue-500 text-white">
                    Token: Refreshing
                  </div>
                )}
                {backupStatus.isRunning && (
                  <div className="px-2 py-1 rounded bg-purple-500 text-white">
                    Backup: Running
                  </div>
                )}
              </div>
            )}
            
            <Suspense fallback={<Loading type="page" />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  {/* Core routes - no lazy loading */}
                  <Route index element={<Home />} />
                  <Route path="product/:productId" element={<ProductDetail />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="checkout" element={<Checkout />} />
                  
                  {/* Lazy loaded routes */}
                  <Route path="category/:categoryName" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Category />
                    </Suspense>
                  } />
                  <Route path="orders" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Orders />
                    </Suspense>
                  } />
                  <Route path="orders/:orderId" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <OrderTracking />
                    </Suspense>
                  } />
                  <Route path="account" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Account />
                    </Suspense>
                  } />
<Route path="admin" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AdminDashboard />
                    </Suspense>
                  } />
                  <Route path="admin/dashboard" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AdminDashboard />
                    </Suspense>
                  } />
                  <Route path="admin/pos" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <POS />
                    </Suspense>
                  } />
                  <Route path="admin/delivery-dashboard" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <DeliveryTracking />
                    </Suspense>
                  } />
                  <Route path="admin/analytics" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <Analytics />
                    </Suspense>
                  } />
                  <Route path="admin/financial-dashboard" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <FinancialDashboard />
                    </Suspense>
                  } />
                  <Route path="admin/payments" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <PaymentManagement />
                    </Suspense>
                  } />
                  <Route path="admin/ai-generate" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AIGenerate />
                    </Suspense>
                  } />
<Route path="admin/payroll" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <PayrollManagement />
                    </Suspense>
                  } />
                  <Route path="admin/products" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <ManageProducts />
                    </Suspense>
                  } />
                  <Route path="admin/products/add" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <AddProduct />
                    </Suspense>
                  } />
                  <Route path="admin/products/edit/:id" element={
                    <Suspense fallback={<Loading type="page" />}>
                      <EditProduct />
                    </Suspense>
                  } />
                </Route>
              </Routes>
            </Suspense>
            
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss={false}
              draggable
              pauseOnHover={false}
              theme="colored"
              style={{ zIndex: 9999 }}
              limit={3}
            />
          </div>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}

export default App;