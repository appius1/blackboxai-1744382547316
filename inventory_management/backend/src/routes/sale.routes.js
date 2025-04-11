const express = require('express');
const { createSale, getAllSales, getSaleById, updateSale, deleteSale } = require('../controllers/sale.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createSale);
router.get('/', protect, getAllSales);
router.get('/:id', protect, getSaleById);
router.put('/:id', protect, updateSale);
router.delete('/:id', protect, deleteSale);

module.exports = router;
