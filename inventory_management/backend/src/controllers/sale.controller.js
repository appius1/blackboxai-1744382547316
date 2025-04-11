const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const { APIError } = require('../middleware/error.middleware');
const { saleSchemas } = require('../utils/validation.utils');
const { removeSensitiveData } = require('../utils/helper.utils');

/**
 * Create a new sale
 * @route POST /api/sales
 * @access Private
 */
exports.createSale = async (req, res) => {
    const { error } = saleSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const { customer, items, tax, discount, amountPaid, paymentMethod, notes, location } = req.body;

    // Create sale
    const sale = await Sale.create({
        customer,
        items,
        tax,
        discount,
        amountPaid,
        paymentMethod,
        notes,
        location
    });

    // Update product stock
    for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
            throw new APIError(`Product not found: ${item.product}`, 404);
        }
        await product.updateStock(item.quantity, 'remove');
    }

    res.status(201).json({
        success: true,
        data: removeSensitiveData(sale.toObject())
    });
};

/**
 * Get all sales
 * @route GET /api/sales
 * @access Private
 */
exports.getAllSales = async (req, res) => {
    const sales = await Sale.find().populate('customer').populate('items.product');

    res.status(200).json({
        success: true,
        data: sales.map(sale => removeSensitiveData(sale.toObject()))
    });
};

/**
 * Get a single sale by ID
 * @route GET /api/sales/:id
 * @access Private
 */
exports.getSaleById = async (req, res) => {
    const sale = await Sale.findById(req.params.id).populate('customer').populate('items.product');
    if (!sale) {
        throw new APIError('Sale not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(sale.toObject())
    });
};

/**
 * Update a sale by ID
 * @route PUT /api/sales/:id
 * @access Private
 */
exports.updateSale = async (req, res) => {
    const { error } = saleSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!sale) {
        throw new APIError('Sale not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(sale.toObject())
    });
};

/**
 * Delete a sale by ID
 * @route DELETE /api/sales/:id
 * @access Private
 */
exports.deleteSale = async (req, res) => {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) {
        throw new APIError('Sale not found', 404);
    }

    res.status(204).json({
        success: true,
        data: null
    });
};

module.exports = exports;
