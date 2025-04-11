const express = require('express');
const { createCustomer, getAllCustomers, getCustomerById, updateCustomer, deleteCustomer, getCustomerHistory } = require('../controllers/customer.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', protect, createCustomer);
router.get('/', protect, getAllCustomers);
router.get('/:id', protect, getCustomerById);
router.put('/:id', protect, updateCustomer);
router.delete('/:id', protect, deleteCustomer);
router.get('/:id/history', protect, getCustomerHistory);

module.exports = router;
