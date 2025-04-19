const express = require('express');
const { generatePDFReport, generateCSVReport, getDashboardKPIs, getSalesTrend, getCategoryDistribution } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Route to generate PDF report
router.post('/pdf', protect, generatePDFReport);

// Route to generate CSV report
router.post('/csv', protect, generateCSVReport);

// Route to get dashboard KPIs
router.get('/dashboard', protect, getDashboardKPIs);

// Route to get sales trend data
router.get('/sales-trend', protect, getSalesTrend);

// Route to get product category distribution
router.get('/category-distribution', protect, getCategoryDistribution);

module.exports = router;
