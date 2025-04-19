const Category = require('../models/category.model');
const { APIError } = require('../middleware/error.middleware');

/**
 * Create a new category
 * @route POST /api/categories
 * @access Private
 */
exports.createCategory = async (req, res) => {
    const { name, parent, order } = req.body;

    try {
        const category = new Category({ name, parent: parent || null, order: order || 0 });
        await category.save();

        res.status(201).json({
            success: true,
            data: category
        });
    } catch (error) {
        throw new APIError('Error creating category', 500);
    }
};

/**
 * Get all categories
 * @route GET /api/categories
 * @access Private
 */
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ order: 1 });
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        throw new APIError('Error fetching categories', 500);
    }
};

/**
 * Update a category
 * @route PUT /api/categories/:id
 * @access Private
 */
exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) {
            throw new APIError('Category not found', 404);
        }
        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        throw new APIError('Error updating category', 500);
    }
};

/**
 * Delete a category
 * @route DELETE /api/categories/:id
 * @access Private
 */
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            throw new APIError('Category not found', 404);
        }
        res.status(204).json({
            success: true,
            data: null
        });
    } catch (error) {
        throw new APIError('Error deleting category', 500);
    }
};

/**
 * Reorder categories
 * @route POST /api/categories/reorder
 * @access Private
 * @body [{ _id: string, order: number }]
 */
exports.reorderCategories = async (req, res) => {
    const categories = req.body;

    try {
        const updatePromises = categories.map(cat =>
            Category.findByIdAndUpdate(cat._id, { order: cat.order })
        );
        await Promise.all(updatePromises);

        res.status(200).json({
            success: true,
            message: 'Categories reordered successfully'
        });
    } catch (error) {
        throw new APIError('Error reordering categories', 500);
    }
};
