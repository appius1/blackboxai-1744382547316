import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [reportData, setReportData] = useState({
    salesOverTime: [],
    categoryDistribution: {},
    topProducts: [],
    lowStockItems: []
  });
  const [dateRange, setDateRange] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReportData();

    // Add event listener for dashboard reload
    const handleReload = () => {
      loadReportData();
    };

    document.addEventListener('reload-dashboard', handleReload);

    // Cleanup
    return () => {
      document.removeEventListener('reload-dashboard', handleReload);
    };
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      
      // Get all products and sales
      const [products, sales] = await Promise.all([
        window.electron.invoke('get-products'),
        window.electron.invoke('get-sales')
      ]);

      // Filter sales by date range
      const now = new Date();
      const filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        switch (dateRange) {
          case 'week':
            return now - saleDate <= 7 * 24 * 60 * 60 * 1000;
          case 'month':
            return now.getMonth() === saleDate.getMonth() && 
                   now.getFullYear() === saleDate.getFullYear();
          case 'year':
            return now.getFullYear() === saleDate.getFullYear();
          default:
            return true;
        }
      });

      // Process sales over time
      const salesByDate = new Map();
      filteredSales.forEach(sale => {
        const date = new Date(sale.date).toLocaleDateString();
        salesByDate.set(date, (salesByDate.get(date) || 0) + sale.total);
      });

      // Process category distribution
      const categoryCount = new Map();
      products.forEach(product => {
        categoryCount.set(product.category, (categoryCount.get(product.category) || 0) + 1);
      });

      // Process top products
      const productSales = new Map();
      filteredSales.forEach(sale => {
        sale.items?.forEach(item => {
          productSales.set(item.productId, (productSales.get(item.productId) || 0) + item.quantity);
        });
      });

      const topProducts = products
        .map(product => ({
          id: product.id,
          name: product.name,
          salesCount: productSales.get(product.id) || 0
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5);

      // Process low stock items
      const lowStockItems = products
        .filter(product => product.stock <= product.reorder_point)
        .map(item => ({
          id: item.id,
          name: item.name,
          stock: item.stock,
          reorderPoint: item.reorder_point
        }));

      setReportData({
        salesOverTime: Array.from(salesByDate.entries())
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        categoryDistribution: Object.fromEntries(categoryCount.entries()),
        topProducts,
        lowStockItems
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart configurations
  const salesChartData = {
    labels: reportData.salesOverTime.map(item => item.date),
    datasets: [{
      label: 'Sales',
      data: reportData.salesOverTime.map(item => item.total),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const categoryChartData = {
    labels: Object.keys(reportData.categoryDistribution),
    datasets: [{
      data: Object.values(reportData.categoryDistribution),
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
      ]
    }]
  };

  const topProductsChartData = {
    labels: reportData.topProducts.map(item => item.name),
    datasets: [{
      label: 'Sales Count',
      data: reportData.topProducts.map(item => item.salesCount),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1
    }]
  };

  return (
    <div className="space-y-6" data-component="Reports">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Over Time</h2>
            <div className="h-64">
              <Line
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h2>
            <div className="h-64">
              <Pie
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
            <div className="h-64">
              <Bar
                data={topProductsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Items</h2>
            <div className="overflow-y-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reorder Point
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.reorderPoint}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
