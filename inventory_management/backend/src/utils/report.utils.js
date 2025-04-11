const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const { formatCurrency, formatPhoneNumber, getDateRange } = require('./helper.utils');

/**
 * Generate PDF report
 * @param {Object} data Report data
 * @param {String} type Report type
 * @returns {Buffer} PDF buffer
 */
const generatePDFReport = async (data, type) => {
    const doc = new PDFDocument();
    const chunks = [];

    // Collect PDF chunks
    doc.on('data', chunk => chunks.push(chunk));

    // Add header
    doc.fontSize(20).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    switch (type) {
        case 'inventory':
            generateInventoryPDFReport(doc, data);
            break;
        case 'sales':
            generateSalesPDFReport(doc, data);
            break;
        case 'customers':
            generateCustomersPDFReport(doc, data);
            break;
        case 'purchase-orders':
            generatePurchaseOrdersPDFReport(doc, data);
            break;
        default:
            throw new Error('Invalid report type');
    }

    // End the document
    doc.end();

    // Return promise that resolves with PDF buffer
    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
};

/**
 * Generate CSV report
 * @param {Object} data Report data
 * @param {String} type Report type
 * @returns {String} CSV string
 */
const generateCSVReport = (data, type) => {
    let fields = [];
    let opts = { fields };

    switch (type) {
        case 'inventory':
            fields = ['sku', 'name', 'category', 'stock', 'minStock', 'price'];
            break;
        case 'sales':
            fields = ['invoiceNumber', 'date', 'customer', 'total', 'paymentStatus'];
            break;
        case 'customers':
            fields = ['name', 'email', 'phone', 'totalPurchases', 'totalSpent'];
            break;
        case 'purchase-orders':
            fields = ['poNumber', 'supplier', 'orderDate', 'total', 'status'];
            break;
        default:
            throw new Error('Invalid report type');
    }

    try {
        const parser = new Parser(opts);
        return parser.parse(data);
    } catch (err) {
        throw new Error('Error generating CSV report');
    }
};

/**
 * Generate inventory PDF report
 * @param {PDFDocument} doc PDF document
 * @param {Object} data Report data
 */
const generateInventoryPDFReport = (doc, data) => {
    // Add inventory table headers
    doc.fontSize(14).text('Inventory Report', { underline: true });
    doc.moveDown();
    
    const tableHeaders = ['SKU', 'Name', 'Category', 'Stock', 'Min Stock', 'Price'];
    let yPos = doc.y;
    
    tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (i * 90), yPos);
    });
    
    doc.moveDown();
    yPos = doc.y;

    // Add inventory items
    data.forEach((item, index) => {
        const y = yPos + (index * 20);
        doc.fontSize(10)
            .text(item.sku, 50, y)
            .text(item.name, 140, y)
            .text(item.category, 230, y)
            .text(item.stock.toString(), 320, y)
            .text(item.minStock.toString(), 410, y)
            .text(formatCurrency(item.price), 500, y);
    });
};

/**
 * Generate sales PDF report
 * @param {PDFDocument} doc PDF document
 * @param {Object} data Report data
 */
const generateSalesPDFReport = (doc, data) => {
    // Add sales summary
    doc.fontSize(14).text('Sales Summary', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12)
        .text(`Total Sales: ${formatCurrency(data.totalSales)}`)
        .text(`Number of Transactions: ${data.totalTransactions}`)
        .text(`Average Transaction Value: ${formatCurrency(data.averageTransactionValue)}`);
    
    doc.moveDown();

    // Add sales table
    const tableHeaders = ['Invoice', 'Date', 'Customer', 'Total', 'Status'];
    let yPos = doc.y;
    
    tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (i * 100), yPos);
    });
    
    doc.moveDown();
    yPos = doc.y;

    // Add sales entries
    data.sales.forEach((sale, index) => {
        const y = yPos + (index * 20);
        doc.fontSize(10)
            .text(sale.invoiceNumber, 50, y)
            .text(new Date(sale.createdAt).toLocaleDateString(), 150, y)
            .text(sale.customer.name, 250, y)
            .text(formatCurrency(sale.total), 350, y)
            .text(sale.paymentStatus, 450, y);
    });
};

/**
 * Generate customers PDF report
 * @param {PDFDocument} doc PDF document
 * @param {Object} data Report data
 */
const generateCustomersPDFReport = (doc, data) => {
    // Add customer summary
    doc.fontSize(14).text('Customer Report', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12)
        .text(`Total Customers: ${data.totalCustomers}`)
        .text(`Active Customers: ${data.activeCustomers}`)
        .text(`Total Outstanding Balance: ${formatCurrency(data.totalOutstanding)}`);
    
    doc.moveDown();

    // Add customer table
    const tableHeaders = ['Name', 'Phone', 'Purchases', 'Total Spent', 'Balance'];
    let yPos = doc.y;
    
    tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (i * 100), yPos);
    });
    
    doc.moveDown();
    yPos = doc.y;

    // Add customer entries
    data.customers.forEach((customer, index) => {
        const y = yPos + (index * 20);
        doc.fontSize(10)
            .text(customer.name, 50, y)
            .text(formatPhoneNumber(customer.phone), 150, y)
            .text(customer.totalPurchases.toString(), 250, y)
            .text(formatCurrency(customer.totalSpent), 350, y)
            .text(formatCurrency(customer.amountDue), 450, y);
    });
};

/**
 * Generate purchase orders PDF report
 * @param {PDFDocument} doc PDF document
 * @param {Object} data Report data
 */
const generatePurchaseOrdersPDFReport = (doc, data) => {
    // Add PO summary
    doc.fontSize(14).text('Purchase Orders Report', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12)
        .text(`Total Orders: ${data.totalOrders}`)
        .text(`Pending Orders: ${data.pendingOrders}`)
        .text(`Total Value: ${formatCurrency(data.totalValue)}`);
    
    doc.moveDown();

    // Add PO table
    const tableHeaders = ['PO Number', 'Supplier', 'Date', 'Total', 'Status'];
    let yPos = doc.y;
    
    tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (i * 100), yPos);
    });
    
    doc.moveDown();
    yPos = doc.y;

    // Add PO entries
    data.orders.forEach((order, index) => {
        const y = yPos + (index * 20);
        doc.fontSize(10)
            .text(order.poNumber, 50, y)
            .text(order.supplier.name, 150, y)
            .text(new Date(order.orderDate).toLocaleDateString(), 250, y)
            .text(formatCurrency(order.total), 350, y)
            .text(order.status, 450, y);
    });
};

module.exports = {
    generatePDFReport,
    generateCSVReport
};
