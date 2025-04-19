/**
 * Low Stock Notification Module
 * Uses Electron Notification API to alert when stock is low
 */

const { ipcRenderer } = require('electron');

async function checkLowStock() {
    try {
        const response = await fetch('/api/products/low-stock', {
            headers: {
                'Content-Type': 'application/json',
                // Add auth token header if needed
            }
        });
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            result.data.forEach(product => {
                new Notification('Low Stock Alert', {
                    body: \`\${product.name} stock is low: \${product.stockLevel} units left\`,
                    icon: 'path/to/icon.png' // Optional icon path
                });
            });
        }
    } catch (error) {
        console.error('Error checking low stock:', error);
    }
}

// Check low stock every 10 minutes
setInterval(checkLowStock, 10 * 60 * 1000);

// Initial check on load
checkLowStock();

module.exports = { checkLowStock };
