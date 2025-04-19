const { generatePDFReport, generateCSVReport } = require('../utils/report.utils');
const { APIError } = require('../middleware/error.middleware');
const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const mongoose = require('mongoose');

/**
 * Generate PDF report
 * @route POST /api/reports/pdf
 * @access Private
 */
exports.generatePDFReport = async (req, res) => {
    const reportData = req.body; // Assuming report data is sent in the request body

    try {
        const pdfBuffer = await generatePDFReport(reportData, reportData.type);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=report.pdf',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (error) {
        throw new APIError('Error generating PDF report', 500);
    }
};

/**
 * Generate CSV report
 * @route POST /api/reports/csv
 * @access Private
 */
exports.generateCSVReport = async (req, res) => {
    const reportData = req.body; // Assuming report data is sent in the request body

    try {
        const csvString = generateCSVReport(reportData, reportData.type);
        res.set({
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=report.csv',
            'Content-Length': Buffer.byteLength(csvString)
        });
        res.send(csvString);
    } catch (error) {
        throw new APIError('Error generating CSV report', 500);
    }
};

/**
 * Get dashboard KPIs
 * @route GET /api/reports/dashboard
 * @access Private
 */
exports.getDashboardKPIs = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const lowStockCount = await Product.countDocuments({ stockLevel: { $lte: '$reorderPoint' } });
        const monthlyRevenueAgg = await Sale.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amountPaid' }
                }
            }
        ]);
        const monthlyRevenue = monthlyRevenueAgg.length > 0 ? monthlyRevenueAgg[0].totalRevenue : 0;

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                lowStockCount,
                monthlyRevenue
            }
        });
    } catch (error) {
        throw new APIError('Error fetching dashboard KPIs', 500);
    }
};

/**
 * Get sales trend data
 * @route GET /api/reports/sales-trend
 * @access Private
 */
exports.getSalesTrend = async (req, res) => {
    try {
        const salesTrend = await Sale.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    totalSales: { $sum: '$amountPaid' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: salesTrend
        });
    } catch (error) {
        throw new APIError('Error fetching sales trend data', 500);
    }
};

/**
 * Get product category distribution
 * @route GET /api/reports/category-distribution
 * @access Private
 */
exports.getCategoryDistribution = async (req, res) => {
    try {
        const categoryDistribution = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: categoryDistribution
        });
    } catch (error) {
        throw new APIError('Error fetching category distribution', 500);
    }
};

module.exports = exports;
