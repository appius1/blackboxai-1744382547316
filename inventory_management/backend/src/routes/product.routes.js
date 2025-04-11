const express = require('express');
const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, scanProduct } = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createProduct);
router.get('/', protect, getAllProducts);
router.get('/:id', protect, getProductById);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.post('/scan', protect, scanProduct);

module.exports = router;
