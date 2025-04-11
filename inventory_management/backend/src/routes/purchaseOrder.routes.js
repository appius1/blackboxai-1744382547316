const express = require('express');
const { createPurchaseOrder, getAllPurchaseOrders, getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder, receivePurchaseOrder } = require('../controllers/purchaseOrder.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createPurchaseOrder);
router.get('/', protect, getAllPurchaseOrders);
router.get('/:id', protect, getPurchaseOrderById);
router.put('/:id', protect, updatePurchaseOrder);
router.delete('/:id', protect, deletePurchaseOrder);
router.post('/:id/receive', protect, receivePurchaseOrder);

module.exports = router;
