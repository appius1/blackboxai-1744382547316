/**
 * Helper utility functions for the application
 */

const crypto = require('crypto');

/**
 * Generate a random string of specified length
 * @param {Number} length Length of the string
 * @returns {String} Random string
 */
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Format currency amount
 * @param {Number} amount Amount to format
 * @param {String} currency Currency code (default: USD)
 * @returns {String} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

/**
 * Calculate pagination values
 * @param {Number} page Current page number
 * @param {Number} limit Items per page
 * @returns {Object} Pagination values
 */
const getPagination = (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return {
        skip,
        limit: parseInt(limit)
    };
};

/**
 * Format pagination response
 * @param {Array} data Data array
 * @param {Number} page Current page
 * @param {Number} limit Items per page
 * @param {Number} total Total number of items
 * @returns {Object} Formatted pagination response
 */
const paginationResponse = (data, page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = parseInt(page);

    return {
        data,
        pagination: {
            total,
            totalPages,
            currentPage,
            perPage: limit,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
};

/**
 * Generate a sequential reference number
 * @param {String} prefix Prefix for the reference number
 * @param {Number} sequence Current sequence number
 * @param {Number} padding Number of digits to pad
 * @returns {String} Generated reference number
 */
const generateReferenceNumber = (prefix, sequence, padding = 6) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequenceStr = sequence.toString().padStart(padding, '0');
    return `${prefix}${year}${month}${sequenceStr}`;
};

/**
 * Calculate date ranges for reports
 * @param {String} range Date range type (daily, weekly, monthly, yearly)
 * @returns {Object} Start and end dates
 */
const getDateRange = (range) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        default:
            throw new Error('Invalid date range');
    }

    return { start, end };
};

/**
 * Deep clone an object
 * @param {Object} obj Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove sensitive data from object
 * @param {Object} obj Object to clean
 * @param {Array} fields Fields to remove
 * @returns {Object} Cleaned object
 */
const removeSensitiveData = (obj, fields = ['password', '__v']) => {
    const cleaned = { ...obj };
    fields.forEach(field => delete cleaned[field]);
    return cleaned;
};

/**
 * Calculate stock value
 * @param {Number} quantity Quantity
 * @param {Number} price Price per unit
 * @returns {Number} Total value
 */
const calculateStockValue = (quantity, price) => {
    return Number((quantity * price).toFixed(2));
};

/**
 * Format phone number
 * @param {String} phone Phone number
 * @returns {String} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
};

/**
 * Validate email format
 * @param {String} email Email to validate
 * @returns {Boolean} Is valid email
 */
const isValidEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

/**
 * Calculate percentage change
 * @param {Number} oldValue Old value
 * @param {Number} newValue New value
 * @returns {Number} Percentage change
 */
const calculatePercentageChange = (oldValue, newValue) => {
    if (oldValue === 0) return newValue === 0 ? 0 : 100;
    return Number((((newValue - oldValue) / oldValue) * 100).toFixed(2));
};

module.exports = {
    generateRandomString,
    formatCurrency,
    getPagination,
    paginationResponse,
    generateReferenceNumber,
    getDateRange,
    deepClone,
    removeSensitiveData,
    calculateStockValue,
    formatPhoneNumber,
    isValidEmail,
    calculatePercentageChange
};
