const PurchaseOrder = require('../models/purchaseOrder.model');
const Product = require('../models/product.model');
const { APIError } = require('../middleware/error.middleware');
const { purchaseOrderSchemas } = require('../utils/validation.utils');
const { removeSensitiveData } = require('../utils/helper.utils');

/**
 * Create a new purchase order
 * @route POST /api/purchase-orders
 * @access Private
 */
exports.createPurchaseOrder = async (req, res) => {
    const { error } = purchaseOrderSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const purchaseOrderData = req.body;

    // Create purchase order
    const purchaseOrder = await PurchaseOrder.create(purchaseOrderData);

    res.status(201).json({
        success: true,
        data: removeSensitiveData(purchaseOrder.toObject())
    });
};

/**
 * Get all purchase orders
 * @route GET /api/purchase-orders
 * @access Private
 */
exports.getAllPurchaseOrders = async (req, res) => {
    const purchaseOrders = await PurchaseOrder.find().populate('supplier');

    res.status(200).json({
        success: true,
        data: purchaseOrders.map(order => removeSensitiveData(order.toObject()))
    });
};

/**
 * Get a single purchase order by ID
 * @route GET /api/purchase-orders/:id
 * @access Private
 */
exports.getPurchaseOrderById = async (req, res) => {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id).populate('supplier');
    if (!purchaseOrder) {
        throw new APIError('Purchase order not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(purchaseOrder.toObject())
    });
};

/**
 * Update a purchase order by ID
 * @route PUT /api/purchase-orders/:id
 * @access Private
 */
exports.updatePurchaseOrder = async (req, res) => {
    const { error } = purchaseOrderSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!purchaseOrder) {
        throw new APIError('Purchase order not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(purchaseOrder.toObject())
    });
};

/**
 * Delete a purchase order by ID
 * @route DELETE /api/purchase-orders/:id
 * @access Private
 */
exports.deletePurchaseOrder = async (req, res) => {
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!purchaseOrder) {
        throw new APIError('Purchase order not found', 404);
    }

    res.status(204).json({
        success: true,
        data: null
    });
};

/**
 * Receive items for a purchase order
 * @route POST /api/purchase-orders/:id/receive
 * @access Private
 */
exports.receivePurchaseOrder = async (req, res) => {
    const { error } = purchaseOrderSchemas.receive.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
        throw new APIError('Purchase order not found', 404);
    }

    // Update received quantities
    await purchaseOrder.receiveItems(req.body.items);

    res.status(200).json({
        success: true,
        data: removeSensitiveData(purchaseOrder.toObject())
    });
};

module.exports = exports;
