const { generatePDFReport, generateCSVReport } = require('../utils/report.utils');
const { APIError } = require('../middleware/error.middleware');

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

module.exports = exports;
