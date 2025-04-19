const express = require('express');
const {
    createCategory,
    getAllCategories,
    updateCategory,
    deleteCategory,
    reorderCategories
} = require('../controllers/category.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createCategory);
router.get('/', protect, getAllCategories);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, deleteCategory);
router.post('/reorder', protect, reorderCategories);

module.exports = router;
