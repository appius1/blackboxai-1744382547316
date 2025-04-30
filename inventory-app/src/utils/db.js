// Mock database using localStorage
const DB = {
  products: [],
  sales: [],

  // Initialize with some sample data
  init() {
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('sales')) {
      localStorage.setItem('sales', JSON.stringify([]));
    }
    this.products = JSON.parse(localStorage.getItem('products'));
    this.sales = JSON.parse(localStorage.getItem('sales'));
  },

  // Products
  getProducts() {
    return Promise.resolve(this.products);
  },

  addProduct(product) {
    const newProduct = {
      ...product,
      id: this.products.length + 1
    };
    this.products.push(newProduct);
    localStorage.setItem('products', JSON.stringify(this.products));
    return Promise.resolve({ success: true, id: newProduct.id });
  },

  // Sales
  getSales() {
    return Promise.resolve(this.sales);
  },

  createSale(saleData) {
    const newSale = {
      ...saleData,
      id: this.sales.length + 1
    };

    // Update product stock
    saleData.items.forEach(item => {
      const product = this.products.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    });

    this.sales.push(newSale);
    localStorage.setItem('sales', JSON.stringify(this.sales));
    localStorage.setItem('products', JSON.stringify(this.products));
    return Promise.resolve({ success: true, saleId: newSale.id });
  }
};

// Initialize the mock database
DB.init();

// Export mock IPC functions
window.electron = {
  invoke: (channel, data) => {
    switch (channel) {
      case 'get-products':
        return DB.getProducts();
      case 'add-product':
        return DB.addProduct(data);
      case 'get-sales':
        return DB.getSales();
      case 'create-sale':
        return DB.createSale(data);
      case 'save-image':
      case 'save-invoice':
        return Promise.resolve(null);
      default:
        return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  }
};

export default DB;
