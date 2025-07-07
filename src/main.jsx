import '@/index.css'
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import Error from "@/components/ui/Error";

// Performance Monitor
const performanceMonitor = {
  start: performance.now(),
  marks: {}
};

// Background SDK Loader
class BackgroundSDKLoader {
  static sdkLoaded = false;
  static sdkPromise = null;

  static async loadInBackground() {
    if (this.sdkLoaded) return true;
    if (this.sdkPromise) return this.sdkPromise;

    this.sdkPromise = this.loadSDK();
    return this.sdkPromise;
  }

  static async loadSDK() {
    try {
      // Simulate SDK loading (replace with actual SDK imports)
      await new Promise(resolve => setTimeout(resolve, 100));
      this.sdkLoaded = true;
      return true;
    } catch (error) {
      console.error('SDK loading failed:', error);
      return false;
    }
  }

  static async initializeWhenReady() {
    if (this.sdkLoaded) {
      // Initialize SDK features
      if (import.meta.env.DEV) {
        console.log('SDK initialized successfully');
      }
}
  }
}
// Global error boundary component with proper hook usage
function FastErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [errorInfo, setErrorInfo] = React.useState(null);

  React.useEffect(() => {
    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      setHasError(true);
      setError(event.error);
      setErrorInfo({ componentStack: event.error?.stack || 'Unknown' });
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setHasError(true);
      setError(event.reason);
      setErrorInfo(event.reason?.stack || 'No stack trace available');
    };

    const handleReactError = (error, errorInfo) => {
      console.error('React error caught:', error, errorInfo);
      setHasError(true);
      setError(error);
      setErrorInfo(errorInfo?.componentStack || 'No component stack available');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Handle React errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('React') || args[0]?.includes?.('Warning')) {
        handleReactError(args[0], { componentStack: args[1] });
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">
            We're sorry, but there was an error loading the application.
          </p>
          {import.meta.env.DEV && (
            <details className="text-left mb-4 p-3 bg-gray-50 rounded text-sm">
              <summary className="cursor-pointer text-gray-700 font-medium">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-red-600 overflow-auto">
                {error?.message || 'Unknown error'}
                {errorInfo && `\n\n${errorInfo}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Initialize app
async function initializeApp() {
  try {
    // Mark initialization start
    performanceMonitor.marks.initStart = performance.now();
    
    // Load SDK in background (non-blocking)
    BackgroundSDKLoader.loadInBackground().then(loaded => {
      if (loaded) {
        BackgroundSDKLoader.initializeWhenReady();
      }
    });

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Mark render start
    performanceMonitor.marks.renderStart = performance.now();

    // Render app with error boundary
    root.render(
      <React.StrictMode>
        <FastErrorBoundary>
          <App />
        </FastErrorBoundary>
      </React.StrictMode>
    );

    // Mark initialization complete
    performanceMonitor.marks.initComplete = performance.now();
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const initTime = performanceMonitor.marks.initComplete - performanceMonitor.marks.initStart;
      console.log(`App initialized in ${initTime.toFixed(2)}ms`);
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback render
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #f5f5f5;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h2>
            <p style="color: #6b7280; margin-bottom: 1rem;">Unable to load the application. Please refresh the page.</p>
            <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }
}
// Start the application
initializeApp();