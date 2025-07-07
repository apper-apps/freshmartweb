import React from 'react';
import ApperIcon from '@/components/ApperIcon';

const Error = ({ message = "Something went wrong", onRetry, type = 'general' }) => {
  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return 'WifiOff';
      case 'not-found':
        return 'SearchX';
      case 'payment':
        return 'CreditCard';
      case 'financial':
        return 'TrendingDown';
      case 'proof-upload':
        return 'FileImage';
      case 'file-validation':
        return 'FileX';
      default:
        return 'AlertCircle';
    }
  };

const getErrorTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Problem';
      case 'not-found':
        return 'Not Found';
      case 'payment':
        return 'Payment Issue';
      case 'financial':
        return 'Financial Data Error';
      case 'proof-upload':
        return 'Upload Failed';
      case 'file-validation':
        return 'Invalid File';
      default:
        return 'Oops! Something went wrong';
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-full p-6 mb-6">
        <ApperIcon 
          name={getErrorIcon()} 
          size={48} 
          className="text-red-500" 
        />
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {getErrorTitle()}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md leading-relaxed">
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <ApperIcon name="RefreshCw" size={20} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default Error;