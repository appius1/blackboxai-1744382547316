import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
    totalProducts: 0,
    totalSales: 0,
    lowStockItems: 0,
    monthlyRevenue: 0
  });

  const [salesData, setSalesData] = useState({
    labels: [],
    datasets: [{
      label: 'Sales',
      data: [],
      fill: true,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4
    }]
  });

  const [categoryData, setCategoryData] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)'
      ]
    }]
  });

  const [stockData, setStockData] = useState({
    labels: [],
    datasets: [{
      label: 'Current Stock',
      data: [],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }]
  });

  useEffect(() => {
    loadDashboardData();

    // Add event listener for dashboard reload
    const handleReload = () => {
      loadDashboardData();
    };

    document.addEventListener('reload-dashboard', handleReload);

    // Cleanup
    return () => {
      document.removeEventListener('reload-dashboard', handleReload);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get products
      const products = await window.electron.invoke('get-products');
      const lowStockItems = products.filter(p => p.stock <= p.reorder_point).length;

      // Get sales
      const sales = await window.electron.invoke('get-sales');
      
      // Calculate monthly revenue
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = sales
        .filter(sale => {
          const saleDate = new Date(sale.date);
          return saleDate.getMonth() === currentMonth && 
                 saleDate.getFullYear() === currentYear;
        })
        .reduce((sum, sale) => sum + sale.total, 0);

      // Update stats
      setStats({
        totalProducts: products.length,
        totalSales: sales.length,
        lowStockItems,
        monthlyRevenue
      });

      // Update sales trend data
      const salesByDate = new Map();
      sales.forEach(sale => {
        const date = new Date(sale.date).toLocaleDateString();
        salesByDate.set(date, (salesByDate.get(date) || 0) + sale.total);
      });

      setSalesData({
        labels: Array.from(salesByDate.keys()),
        datasets: [{
          label: 'Sales',
          data: Array.from(salesByDate.values()),
          fill: true,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4
        }]
      });

      // Update category distribution data
      const categoryCount = new Map();
      products.forEach(product => {
        categoryCount.set(product.category, (categoryCount.get(product.category) || 0) + 1);
      });

      setCategoryData({
        labels: Array.from(categoryCount.keys()),
        datasets: [{
          data: Array.from(categoryCount.values()),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ]
        }]
      });

      // Update stock status data
      setStockData({
        labels: products.map(p => p.name),
        datasets: [{
          label: 'Current Stock',
          data: products.map(p => p.stock),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1
        }]
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const exportToPDF = async () => {
    try {
      const dashboardElement = document.querySelector('.space-y-8');
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      // Add title
      pdf.setFontSize(18);
      pdf.text('Inventory Dashboard Report', pdfWidth / 2, 20, { align: 'center' });
      
      // Add date
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pdfWidth / 2, 27, { align: 'center' });

      // Add image
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Add footer
      pdf.setFontSize(10);
      const pageHeight = pdf.internal.pageSize.height;
      pdf.text('© InventoryApp - Generated by System', pdfWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  // Get current time for greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8" data-component="Dashboard">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-300 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{getCurrentGreeting()}, Kushal</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your inventory today.</p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <button 
              onClick={exportToPDF}
              className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300 shadow-md hover:shadow-lg"
            >
              <i className="fas fa-download"></i>
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 transform hover:scale-[1.03]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-100 rounded-full p-3">
              <i className="fas fa-box text-indigo-600 text-xl"></i>
            </div>
            <span className="text-sm font-semibold text-indigo-600">Products</span>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900">{stats.totalProducts}</h3>
          <p className="text-gray-600 text-sm">Total Products</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 transform hover:scale-[1.03]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <i className="fas fa-rupee-sign text-green-600 text-xl"></i>
            </div>
            <span className="text-sm font-semibold text-green-600">Revenue</span>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900">
            Rs {stats.monthlyRevenue.toFixed(2)}
          </h3>
          <p className="text-gray-600 text-sm">Monthly Revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 transform hover:scale-[1.03]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 rounded-full p-3">
              <i className="fas fa-exclamation-triangle text-yellow-600 text-xl"></i>
            </div>
            <span className="text-sm font-semibold text-yellow-600">Low Stock</span>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900">{stats.lowStockItems}</h3>
          <p className="text-gray-600 text-sm">Items Low on Stock</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300 transform hover:scale-[1.03]">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 rounded-full p-3">
              <i className="fas fa-shopping-cart text-purple-600 text-xl"></i>
            </div>
            <span className="text-sm font-semibold text-purple-600">Sales</span>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900">{stats.totalSales}</h3>
          <p className="text-gray-600 text-sm">Total Sales</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-300 hover:shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <div className="h-[300px]">
            <Line data={salesData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-300 hover:shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
          <div className="h-[300px]">
            <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white rounded-xl shadow-md p-6 transition-shadow duration-300 hover:shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status</h3>
          <div className="h-[300px]">
            <Bar data={stockData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
