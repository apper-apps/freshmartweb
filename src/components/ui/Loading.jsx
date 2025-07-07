import React from 'react';

const Loading = ({ type = 'products' }) => {
  const ProductSkeleton = () => (
    <div className="card p-4 animate-pulse">
      <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-1/2 mb-2"></div>
      <div className="bg-gray-200 h-6 rounded w-1/3"></div>
    </div>
  );

  const OrderSkeleton = () => (
    <div className="card p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-gray-200 h-5 rounded w-32"></div>
        <div className="bg-gray-200 h-6 rounded-full w-20"></div>
      </div>
      <div className="bg-gray-200 h-4 rounded w-full mb-2"></div>
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-4 rounded w-1/2"></div>
    </div>
  );

  const TableSkeleton = () => (
    <div className="card p-6 animate-pulse">
      <div className="bg-gray-200 h-6 rounded w-1/4 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="bg-gray-200 h-4 rounded w-16"></div>
            <div className="bg-gray-200 h-4 rounded w-32"></div>
            <div className="bg-gray-200 h-4 rounded w-24"></div>
            <div className="bg-gray-200 h-4 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );

  const DashboardSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-8 rounded w-16 mb-2"></div>
            <div className="bg-gray-200 h-6 rounded w-24"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
          <div className="bg-gray-200 h-64 rounded"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-4 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
);

  const FinancialSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-4 rounded w-24 mb-2"></div>
            <div className="bg-gray-200 h-8 rounded w-32 mb-2"></div>
            <div className="bg-gray-200 h-3 rounded w-16"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-40 mb-4"></div>
          <div className="bg-gray-200 h-80 rounded"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="bg-gray-200 h-6 rounded w-36 mb-4"></div>
          <div className="bg-gray-200 h-80 rounded"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="bg-gray-200 h-6 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="bg-gray-200 h-4 rounded w-full"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
);

  const ProofSkeleton = () => (
    <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="bg-gray-200 h-24 w-24 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="bg-gray-200 h-4 rounded w-32"></div>
          <div className="bg-gray-200 h-3 rounded w-24"></div>
          <div className="bg-gray-200 h-2 rounded-full w-full"></div>
          <div className="bg-gray-200 h-6 rounded w-20"></div>
        </div>
      </div>
    </div>
  );

  const UploadProgressSkeleton = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="bg-gray-200 h-4 rounded w-40"></div>
          <div className="bg-gray-200 h-4 rounded w-16"></div>
        </div>
        <div className="bg-gray-200 h-2 rounded-full w-full"></div>
        <div className="flex items-center space-x-2">
          <div className="bg-gray-200 h-4 w-4 rounded"></div>
          <div className="bg-gray-200 h-3 rounded w-28"></div>
        </div>
      </div>
    </div>
  );

  const ThumbnailGridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="relative group animate-pulse">
          <div className="bg-gray-200 h-32 w-32 rounded-lg"></div>
          <div className="absolute inset-0 bg-gray-300 bg-opacity-20 rounded-lg"></div>
          <div className="mt-2 space-y-1">
            <div className="bg-gray-200 h-3 rounded w-24"></div>
            <div className="bg-gray-200 h-2 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSkeletons = () => {
    switch (type) {
      case 'products':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        );
      case 'orders':
        return (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        );
      case 'proof':
        return (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <ProofSkeleton key={i} />
            ))}
          </div>
        );
      case 'upload-progress':
        return <UploadProgressSkeleton />;
      case 'thumbnails':
        return <ThumbnailGridSkeleton />;
      case 'table':
        return <TableSkeleton />;
      case 'dashboard':
        return <DashboardSkeleton />;
      case 'financial':
        return <FinancialSkeleton />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderSkeletons()}
    </div>
  );
};

export default Loading;