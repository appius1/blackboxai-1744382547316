import React, { useState } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
  Legend,
  Filler
} from 'chart.js';

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
  Legend,
  Filler
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 150,
    totalSales: 1234,
    lowStockItems: 8,
    monthlyRevenue: 45678
  });

  // Get current time for greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Mock data for charts
  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Sales',
      data: [65, 59, 80, 81, 56, 55],
      fill: true,
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4
    }]
  };

  const categoryData = {
    labels: ['Electronics', 'Clothing', 'Food', 'Books'],
    datasets: [{
      data: [30, 25, 20, 25],
      backgroundColor: [
        'rgba(99, 102, 241, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)'
      ],
      borderColor: [
        'rgb(99, 102, 241)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  const stockData = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [{
      data: [65, 20, 15],
      backgroundColor: [
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)'
      ],
      borderColor: [
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getCurrentGreeting()}, Admin</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your inventory today.</p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <button className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200">
              <i className="fas fa-download"></i>
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-100 rounded-full p-3">
              <i className="fas fa-box text-indigo-600 text-xl"></i>
            </div>
            <span className="text-sm font-medium text-indigo-600">Products</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalProducts}</h3>
          <p className="text-gray-600 text-sm">Total Products</p>
          <div className="mt-4 flex items-center text-green-600">
            <i className="fas fa-arrow-up text-xs mr-1"></i>
            <span className="text-xs">12% more than last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <i className="fas fa-dollar-sign text-green-600 text-xl"></i>
            </div>
            <span className="text-sm font-medium text-green-600">Revenue</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            ${stats.monthlyRevenue.toLocaleString()}
          </h3>
          <p className="text-gray-600 text-sm">Monthly Revenue</p>
          <div className="mt-4 flex items-center text-green-600">
            <i className="fas fa-arrow-up text-xs mr-1"></i>
            <span className="text-xs">8% more than last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 rounded-full p-3">
              <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
            </div>
            <span className="text-sm font-medium text-yellow-600">Low Stock</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</h3>
          <p className="text-gray-600 text-sm">Items Low on Stock</p>
          <div className="mt-4 flex items-center text-yellow-600">
            <i className="fas fa-exclamation-circle text-xs mr-1"></i>
            <span className="text-xs">Requires attention</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 rounded-full p-3">
              <i className="fas fa-shopping-cart text-purple-600 text-xl"></i>
            </div>
            <span className="text-sm font-medium text-purple-600">Sales</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalSales}</h3>
          <p className="text-gray-600 text-sm">Total Sales</p>
          <div className="mt-4 flex items-center text-purple-600">
            <i className="fas fa-arrow-up text-xs mr-1"></i>
            <span className="text-xs">15% more than last month</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <div className="flex items-center space-x-2">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-sync-alt"></i>
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            <Line data={salesData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }} />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Distribution</h3>
            <div className="flex items-center space-x-2">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-sync-alt"></i>
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            <Pie data={categoryData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }} />
          </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stock Status</h3>
            <div className="flex items-center space-x-2">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-sync-alt"></i>
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            <Bar data={stockData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
