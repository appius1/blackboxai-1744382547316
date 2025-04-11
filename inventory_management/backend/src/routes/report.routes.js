const express = require('express');
const { generatePDFReport, generateCSVReport } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Route to generate PDF report
router.post('/pdf', protect, generatePDFReport);

// Route to generate CSV report
router.post('/csv', protect, generateCSVReport);

module.exports = router;
