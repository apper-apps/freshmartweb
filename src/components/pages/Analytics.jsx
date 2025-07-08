import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import Chart from "react-apexcharts";
import ApperIcon from "@/components/ApperIcon";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Orders from "@/components/pages/Orders";
import { orderService } from "@/services/api/orderService";
import productService from "@/services/api/productService";

const Analytics = () => {
  const [data, setData] = useState({
    orders: [],
    products: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedMetric, setSelectedMetric] = useState('revenue');
const metrics = [
    { key: 'revenue', label: 'Revenue', icon: 'DollarSign', color: 'green' },
    { key: 'orders', label: 'Orders', icon: 'ShoppingCart', color: 'blue' },
    { key: 'products', label: 'Products Sold', icon: 'Package', color: 'purple' },
    { key: 'customers', label: 'Customers', icon: 'Users', color: 'orange' },
    { key: 'profit', label: 'Profit Margin', icon: 'TrendingUp', color: 'emerald' },
    { key: 'roi', label: 'ROI', icon: 'Target', color: 'indigo' }
  ];

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [orders, products] = await Promise.all([
        orderService.getAll(),
        productService.getAll()
      ]);
      
      setData({ orders, products });
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeData = () => {
    const days = parseInt(dateRange);
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));
    
    return data.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

const calculateMetrics = () => {
    const filteredOrders = getDateRangeData();
    
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const totalProducts = filteredOrders.reduce((sum, order) => 
      sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    );
    const uniqueCustomers = new Set(filteredOrders.map(order => order.customerId || order.customerName)).size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate profit metrics
    const totalProfit = filteredOrders.reduce((sum, order) => {
      const orderProfit = order.items?.reduce((itemSum, item) => {
        const product = data.products.find(p => p.id === item.productId);
        if (product && product.purchasePrice) {
          const profit = (product.price - product.purchasePrice) * item.quantity;
          return itemSum + profit;
        }
        return itemSum;
      }, 0) || 0;
      return sum + orderProfit;
    }, 0);
    
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roi = totalRevenue > 0 ? ((totalProfit / (totalRevenue - totalProfit)) * 100) : 0;
    
    return {
      revenue: totalRevenue,
      orders: totalOrders,
      products: totalProducts,
      customers: uniqueCustomers,
      averageOrderValue,
      profit: profitMargin,
      roi: roi
    };
  };

  const getChartData = () => {
    const filteredOrders = getDateRangeData();
    const days = parseInt(dateRange);
    
    // Group orders by date
    const dateGroups = {};
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dateGroups[date] = [];
    }
    
    filteredOrders.forEach(order => {
      const date = format(new Date(order.createdAt), 'yyyy-MM-dd');
      if (dateGroups[date]) {
        dateGroups[date].push(order);
      }
    });
    
    const categories = Object.keys(dateGroups).sort();
    const revenueData = categories.map(date => 
      dateGroups[date].reduce((sum, order) => sum + (order.total || 0), 0)
    );
    const orderData = categories.map(date => dateGroups[date].length);
    
    return {
      categories: categories.map(date => format(new Date(date), 'MMM dd')),
      series: [
        {
          name: 'Revenue',
          data: revenueData,
          type: 'area'
        },
        {
          name: 'Orders',
          data: orderData,
          type: 'line'
        }
      ]
    };
  };

  const getTopProducts = () => {
    const filteredOrders = getDateRangeData();
    const productSales = {};
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        if (productSales[item.productId]) {
          productSales[item.productId] += item.quantity || 0;
        } else {
          productSales[item.productId] = item.quantity || 0;
        }
      });
    });
    
    return Object.entries(productSales)
      .map(([productId, quantity]) => {
        const product = data.products.find(p => p.id === parseInt(productId));
        return {
          id: productId,
          name: product?.name || 'Unknown Product',
          quantity,
          revenue: quantity * (product?.price || 0)
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const getOrderStatusData = () => {
    const filteredOrders = getDateRangeData();
    const statusCounts = {};
    
    filteredOrders.forEach(order => {
      const status = order.status || 'pending';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return {
      labels: Object.keys(statusCounts),
      series: Object.values(statusCounts)
    };
  };

  const exportData = () => {
    const metrics = calculateMetrics();
    const topProducts = getTopProducts();
    
    const exportData = {
      period: `${dateRange} days`,
      generatedAt: new Date().toISOString(),
      metrics,
      topProducts
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Analytics data exported successfully');
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
        <Error message={error} onRetry={loadAnalyticsData} />
      </div>
    );
  }

  const calculatedMetrics = calculateMetrics();
  const chartData = getChartData();
  const topProducts = getTopProducts();
  const orderStatusData = getOrderStatusData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button onClick={exportData} variant="outline">
            <ApperIcon name="Download" size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
{metrics.map((metric) => {
          const value = calculatedMetrics[metric.key];
          const formatValue = (key, val) => {
            if (key === 'revenue' || key === 'averageOrderValue') {
              return `Rs. ${val.toLocaleString()}`;
            }
            if (key === 'profit' || key === 'roi') {
              return `${val.toFixed(1)}%`;
            }
            return val.toLocaleString();
          };
          
          return (
            <div key={metric.key} className="card p-6 bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatValue(metric.key, value)}
                  </p>
                </div>
                <div className={`bg-${metric.color}-100 p-3 rounded-lg`}>
                  <ApperIcon 
                    name={metric.icon} 
                    size={24} 
                    className={`text-${metric.color}-600`} 
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue & Orders Chart */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue & Orders Trend</h2>
          <Chart
            options={{
              chart: {
                type: 'line',
                toolbar: { show: false }
              },
              stroke: {
                curve: 'smooth',
                width: [0, 3]
              },
              fill: {
                type: ['gradient', 'solid'],
                gradient: {
                  shade: 'light',
                  type: 'vertical',
                  shadeIntensity: 0.25,
                  gradientToColors: ['#4CAF50'],
                  inverseColors: true,
                  opacityFrom: 0.85,
                  opacityTo: 0.25
                }
              },
              colors: ['#2E7D32', '#FF6F00'],
              xaxis: {
                categories: chartData.categories
              },
              yaxis: [
                {
                  title: { text: 'Revenue (Rs.)' },
                  labels: {
                    formatter: (val) => `Rs. ${val.toLocaleString()}`
                  }
                },
                {
                  opposite: true,
                  title: { text: 'Orders' }
                }
              ],
              tooltip: {
                y: [
                  {
                    formatter: (val) => `Rs. ${val.toLocaleString()}`
                  },
                  {
                    formatter: (val) => `${val} orders`
                  }
                ]
              },
              legend: {
                position: 'top',
                horizontalAlign: 'center'
              }
            }}
            series={chartData.series}
            type="line"
            height={350}
          />
        </div>

        {/* Order Status Distribution */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          <Chart
            options={{
              chart: {
                type: 'donut'
              },
              labels: orderStatusData.labels.map(label => 
                label.charAt(0).toUpperCase() + label.slice(1).replace('_', ' ')
              ),
              colors: ['#4CAF50', '#FF9800', '#2196F3', '#F44336', '#9C27B0'],
              legend: {
                position: 'bottom'
              },
              responsive: [{
                breakpoint: 480,
                options: {
                  chart: {
                    width: 200
                  },
                  legend: {
                    position: 'bottom'
                  }
                }
              }]
            }}
            series={orderStatusData.series}
            type="donut"
            height={350}
          />
        </div>
      </div>

      {/* Top Products & Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Selling Products</h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary p-2 rounded-lg">
                    <span className="text-white font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.quantity} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">Rs. {product.revenue.toLocaleString()}</p>
                  <Badge variant="green" className="text-xs">
                    {product.quantity} sold
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {topProducts.length === 0 && (
            <div className="text-center py-8">
              <ApperIcon name="Package" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No product sales data available</p>
            </div>
          )}
        </div>

        {/* Key Performance Indicators */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-green-200 p-2 rounded-lg">
                  <ApperIcon name="TrendingUp" size={20} className="text-green-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Average Order Value</p>
                  <p className="text-sm text-gray-600">Per transaction</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-700">
                Rs. {calculatedMetrics.averageOrderValue.toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-200 p-2 rounded-lg">
                  <ApperIcon name="Users" size={20} className="text-blue-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Customer Retention</p>
                  <p className="text-sm text-gray-600">Repeat customers</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {calculatedMetrics.customers > 0 ? 
                  Math.round((calculatedMetrics.orders / calculatedMetrics.customers) * 100) : 0}%
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-200 p-2 rounded-lg">
                  <ApperIcon name="Package" size={20} className="text-purple-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Products per Order</p>
                  <p className="text-sm text-gray-600">Average items</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {calculatedMetrics.orders > 0 ? 
                  Math.round(calculatedMetrics.products / calculatedMetrics.orders * 10) / 10 : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;