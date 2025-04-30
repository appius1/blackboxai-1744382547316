import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    description: '',
    price: '',
    stock: '',
    reorder_point: '',
    image: null
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });

  // Load initial data
  const [formErrors, setFormErrors] = useState({});

  // Initial data load
  useEffect(() => {
    const initializeData = async () => {
      try {
        const existingCategories = await window.electron.invoke('get-categories');
        setCategories(existingCategories);
        
        if (existingCategories.length === 0) {
          await window.electron.invoke('add-category', {
            name: 'General',
            description: 'Default category for products'
          });
          const updatedCategories = await window.electron.invoke('get-categories');
          setCategories(updatedCategories);
        }
        
        const products = await window.electron.invoke('get-products');
        setProducts(products);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, []);

  const refreshData = async () => {
    try {
      const [newCategories, newProducts] = await Promise.all([
        window.electron.invoke('get-categories'),
        window.electron.invoke('get-products')
      ]);
      setCategories(newCategories);
      setProducts(newProducts);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const searchProducts = async () => {
    try {
      const searchResults = await window.electron.invoke('search-products', searchTerm);
      setProducts(searchResults);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  // Update search effect to use refreshData
  useEffect(() => {
    if (searchTerm) {
      searchProducts();
    } else {
      refreshData();
    }
  }, [searchTerm]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryFormData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      const result = await window.electron.invoke('add-category', {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim()
      });

      if (result.success) {
        setCategoryFormData({ name: '', description: '' });
        setShowCategoryModal(false);
        await refreshData(); // Use refreshData instead of loadCategories
        
        // Show success message
        alert('Category added successfully');
      } else {
        alert('Error adding category: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category: ' + (error.message || 'Unknown error'));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    if (!formData.price || formData.price <= 0) errors.price = 'Price must be greater than 0';
    if (!formData.stock || formData.stock < 0) errors.stock = 'Stock must be 0 or greater';
    if (!formData.reorder_point || formData.reorder_point < 0) errors.reorder_point = 'Reorder point must be 0 or greater';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      let imagePath = null;
      if (formData.image) {
        const fileName = `${Date.now()}-${formData.image.name}`;
        imagePath = await window.electron.invoke('save-image', {
          path: fileName,
          data: formData.image
        });
      }

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        reorder_point: parseInt(formData.reorder_point),
        image_path: imagePath
      };

      const result = await window.electron.invoke('add-product', productData);
      
      if (result.success) {
        setShowAddModal(false);
        loadProducts();
        setFormData({
          name: '',
          sku: '',
          category_id: '',
          description: '',
          price: '',
          stock: '',
          reorder_point: '',
          image: null
        });
        setFormErrors({});
      } else {
        alert('Error adding product: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <i className="fas fa-folder-plus mr-2"></i>
            Add Category
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Product
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center bg-white rounded-lg px-4 py-2 shadow-sm">
        <i className="fas fa-search text-gray-400"></i>
        <input
          type="text"
          placeholder="Search products by name, SKU, or category..."
          className="ml-2 flex-1 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.image_path ? (
                      <img
                        src={`file://${product.image_path}`}
                        alt={product.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <i className="fas fa-box text-gray-400"></i>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.category_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Rs {product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${product.stock <= product.reorder_point
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => {/* Implement edit */}}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => {/* Implement delete */}}
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

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-500">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formErrors.sku ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.sku && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.sku}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                    formErrors.category_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formErrors.category_id && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.category_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formErrors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formErrors.stock ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.stock && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.stock}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
                  <input
                    type="number"
                    name="reorder_point"
                    min="0"
                    value={formData.reorder_point}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                      formErrors.reorder_point ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.reorder_point && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.reorder_point}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1 block w-full"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
