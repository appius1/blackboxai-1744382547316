const express = require('express');
const { generateInvoicePDF } = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/:saleId/pdf', protect, generateInvoicePDF);

module.exports = router;
