import React, { useState, useEffect } from 'react';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountLeft, setAmountLeft] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    loadSales();
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const totalPrice = selectedProduct.price * quantity;
      const discountAmount = (totalPrice * discount) / 100;
      const totalAfterDiscount = totalPrice - discountAmount;
      const left = totalAfterDiscount - (parseFloat(amountPaid) || 0);
      setAmountLeft(left > 0 ? left : 0);
    }
  }, [selectedProduct, quantity, discount, amountPaid]);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchTerm]);

  const loadSales = async () => {
    try {
      const sales = await window.electron.invoke('get-sales');
      setSales(sales);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const products = await window.electron.invoke('get-products');
      setProducts(products);
      setFilteredProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await window.electron.invoke('get-categories');
      setCategories(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === parseInt(selectedCategory));
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleSaleSubmit = async () => {
    if (!customerName || !selectedProduct || quantity <= 0) {
      alert('Please fill all required fields');
      return;
    }

    if (quantity > selectedProduct.stock) {
      alert('Quantity exceeds available stock');
      return;
    }

    const totalPrice = selectedProduct.price * quantity;
    const discountAmount = (totalPrice * discount) / 100;
    const totalAfterDiscount = totalPrice - discountAmount;

    const saleData = {
      customerName,
      phoneNumber,
      subtotal: totalPrice,
      discount,
      totalDiscount: discountAmount,
      total: totalAfterDiscount,
      amountPaid: parseFloat(amountPaid) || 0,
      amountLeft: amountLeft > 0 ? amountLeft : 0,
      date: new Date().toISOString(),
      items: [{
        productId: selectedProduct.id,
        quantity,
        price: selectedProduct.price,
        discount,
        total: totalAfterDiscount
      }]
    };

    try {
      const result = await window.electron.invoke('create-sale', saleData);
      if (result.success) {
        alert('Sale completed successfully');
        setCustomerName('');
        setPhoneNumber('');
        setSelectedProduct(null);
        setQuantity(1);
        setDiscount(0);
        setAmountPaid('');
        setAmountLeft(0);
        setShowSaleForm(false);
        loadSales();
        loadProducts();
        
        // Reload dashboard
        const dashboardElement = document.querySelector('[data-component="Dashboard"]');
        if (dashboardElement) {
          const event = new CustomEvent('reload-dashboard');
          dashboardElement.dispatchEvent(event);
        }
      } else {
        alert('Error completing sale: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Error completing sale');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <button
          onClick={() => setShowSaleForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>
          New Sale
        </button>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(sale.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sale.customer_name}</div>
                  {sale.phone_number && <div className="text-sm text-gray-500">{sale.phone_number}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Rs {sale.total.toFixed(2)}</div>
                  {sale.discount > 0 && (
                    <div className="text-xs text-gray-500">
                      Discount: {sale.discount}% (Rs {sale.total_discount.toFixed(2)})
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    sale.amount_left > 0
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {sale.amount_left > 0 ? 'Partial' : 'Paid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">New Sale</h2>
              <button onClick={() => setShowSaleForm(false)} className="text-gray-400 hover:text-gray-500">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Search Products</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or SKU..."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select
                    value={selectedProduct ? selectedProduct.id : ''}
                    onChange={(e) => {
                      const product = products.find(p => p.id === parseInt(e.target.value));
                      setSelectedProduct(product);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select a product</option>
                    {filteredProducts.map(product => (
                      <option key={product.id} value={product.id} disabled={product.stock === 0}>
                        {product.name} - Rs {product.price.toFixed(2)} (Stock: {product.stock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity and Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount Left</label>
                  <input
                    type="number"
                    value={amountLeft.toFixed(2)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSaleForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaleSubmit}
                  disabled={!customerName || !selectedProduct || quantity <= 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
