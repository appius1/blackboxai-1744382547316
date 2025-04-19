const express = require('express');
const { exportCSV } = require('../controllers/export.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/csv', protect, exportCSV);

module.exports = router;
