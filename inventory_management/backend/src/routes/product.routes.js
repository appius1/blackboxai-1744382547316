const express = require('express');
const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, scanProduct, uploadProductImage } = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/localUpload.middleware');

const router = express.Router();

router.post('/', protect, createProduct);
router.get('/', protect, getAllProducts);
router.get('/:id', protect, getProductById);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.post('/scan', protect, scanProduct);

// Upload product image
router.post('/:id/upload-image', protect, upload.single('image'), uploadProductImage);

module.exports = router;
