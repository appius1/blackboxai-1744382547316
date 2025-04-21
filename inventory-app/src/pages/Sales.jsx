import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showNewSale, setShowNewSale] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadProducts();
    loadSales();
  }, []);

  const loadProducts = async () => {
    try {
      const products = await window.electron.invoke('get-products');
      setProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSales = async () => {
    try {
      const sales = await window.electron.invoke('get-sales');
      setSales(sales);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const addToCart = () => {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (!product) return;

    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + parseInt(quantity) }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: parseInt(quantity)
      }]);
    }

    setSelectedProduct('');
    setQuantity(1);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleSaleSubmit = async () => {
    try {
      const saleData = {
        customerName,
        items: cart,
        total: calculateTotal(),
        date: new Date().toISOString()
      };

      const result = await window.electron.invoke('create-sale', saleData);
      
      if (result.success) {
        // Generate and save invoice
        await generateInvoice(result.saleId);
        
        // Reset form
        setCart([]);
        setCustomerName('');
        setShowNewSale(false);
        
        // Reload sales and products
        loadSales();
        loadProducts();
      } else {
        alert('Error creating sale: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error creating sale');
    }
  };

  const generateInvoice = async (saleId) => {
    try {
      const invoiceContent = document.getElementById('invoice-preview');
      const canvas = await html2canvas(invoiceContent);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Save PDF to app data directory
      const pdfBuffer = pdf.output('arraybuffer');
      await window.electron.invoke('save-invoice', {
        saleId,
        data: pdfBuffer
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <button
          onClick={() => setShowNewSale(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <i className="fas fa-plus mr-2"></i>
          New Sale
        </button>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sale ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{sale.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(sale.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${sale.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {/* Implement view invoice */}}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <i className="fas fa-file-invoice mr-1"></i>
                    View Invoice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      {showNewSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Sale</h2>
              <button
                onClick={() => setShowNewSale(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Product Selection */}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="">Select a product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${product.price} (Stock: {product.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={addToCart}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Cart */}
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">Cart</h3>
                <div className="mt-2">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cart.map((item) => (
                        <tr key={item.productId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${(item.price * item.quantity).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end space-x-4 items-center">
                <span className="text-lg font-medium">Total: ${calculateTotal().toFixed(2)}</span>
                <button
                  onClick={handleSaleSubmit}
                  disabled={cart.length === 0 || !customerName}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Invoice Preview for PDF Generation */}
      <div id="invoice-preview" className="hidden">
        {/* Invoice template will be rendered here */}
      </div>
    </div>
  );
};

export default Sales;
