const Product = require('../models/product.model');
const { APIError } = require('../middleware/error.middleware');
const { productSchemas } = require('../utils/validation.utils');
const { removeSensitiveData } = require('../utils/helper.utils');

/**
 * Create a new product
 * @route POST /api/products
 * @access Private
 */
exports.createProduct = async (req, res) => {
    const { error } = productSchemas.create.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const productData = req.body;

    // Create product
    const product = await Product.create(productData);

    res.status(201).json({
        success: true,
        data: removeSensitiveData(product.toObject())
    });
};

/**
 * Upload product image
 * @route POST /api/products/:id/upload-image
 * @access Private
 */
exports.uploadProductImage = async (req, res) => {
    if (!req.file) {
        throw new APIError('No image file uploaded', 400);
    }

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            throw new APIError('Product not found', 404);
        }

        // Save image path relative to app data directory
        product.imagePath = req.file.filename;
        await product.save();

        res.status(200).json({
            success: true,
            data: {
                imagePath: product.imagePath
            }
        });
    } catch (error) {
        throw new APIError('Error uploading product image', 500);
    }
};

/**
 * Get all products
 * @route GET /api/products
 * @access Private
 */
exports.getAllProducts = async (req, res) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        data: products.map(product => removeSensitiveData(product.toObject()))
    });
};

/**
 * Get a single product by ID
 * @route GET /api/products/:id
 * @access Private
 */
exports.getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        throw new APIError('Product not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(product.toObject())
    });
};

/**
 * Update a product by ID
 * @route PUT /api/products/:id
 * @access Private
 */
exports.updateProduct = async (req, res) => {
    const { error } = productSchemas.update.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!product) {
        throw new APIError('Product not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(product.toObject())
    });
};

/**
 * Delete a product by ID
 * @route DELETE /api/products/:id
 * @access Private
 */
exports.deleteProduct = async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
        throw new APIError('Product not found', 404);
    }

    res.status(204).json({
        success: true,
        data: null
    });
};

/**
 * Scan a product by barcode
 * @route POST /api/products/scan
 * @access Private
 */
exports.scanProduct = async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
        throw new APIError('Barcode is required', 400);
    }

    const product = await Product.findOne({ barcode });
    if (!product) {
        throw new APIError('Product not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(product.toObject())
    });
};

module.exports = exports;
