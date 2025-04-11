const Customer = require('../models/customer.model');
const { APIError } = require('../middleware/error.middleware');
const { customerSchemas } = require('../utils/validation.utils');
const { removeSensitiveData } = require('../utils/helper.utils');

/**
 * Create a new customer
 * @route POST /api/customers
 * @access Private
 */
exports.createCustomer = async (req, res) => {
    const { error } = customerSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const customerData = req.body;

    // Create customer
    const customer = await Customer.create(customerData);

    res.status(201).json({
        success: true,
        data: removeSensitiveData(customer.toObject())
    });
};

/**
 * Get all customers
 * @route GET /api/customers
 * @access Private
 */
exports.getAllCustomers = async (req, res) => {
    const customers = await Customer.find();

    res.status(200).json({
        success: true,
        data: customers.map(customer => removeSensitiveData(customer.toObject()))
    });
};

/**
 * Get a single customer by ID
 * @route GET /api/customers/:id
 * @access Private
 */
exports.getCustomerById = async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
        throw new APIError('Customer not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(customer.toObject())
    });
};

/**
 * Update a customer by ID
 * @route PUT /api/customers/:id
 * @access Private
 */
exports.updateCustomer = async (req, res) => {
    const { error } = customerSchemas.update.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!customer) {
        throw new APIError('Customer not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(customer.toObject())
    });
};

/**
 * Delete a customer by ID
 * @route DELETE /api/customers/:id
 * @access Private
 */
exports.deleteCustomer = async (req, res) => {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
        throw new APIError('Customer not found', 404);
    }

    res.status(204).json({
        success: true,
        data: null
    });
};

/**
 * Get customer purchase history
 * @route GET /api/customers/:id/history
 * @access Private
 */
exports.getCustomerHistory = async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
        throw new APIError('Customer not found', 404);
    }

    // Assuming we have a method to get purchase history
    const purchaseHistory = await getPurchaseHistoryForCustomer(customer._id);

    res.status(200).json({
        success: true,
        data: purchaseHistory
    });
};

module.exports = exports;
