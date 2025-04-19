const { APIError } = require('../middleware/error.middleware');
const Sale = require('../models/sale.model');
const jsPDF = require('jspdf');
require('jspdf-autotable');

/**
 * Generate PDF invoice for a sale
 * @route GET /api/invoices/:saleId/pdf
 * @access Private
 */
exports.generateInvoicePDF = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.saleId).populate('customer').populate('items.product');
        if (!sale) {
            throw new APIError('Sale not found', 404);
        }

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Invoice', 14, 22);

        doc.setFontSize(12);
        doc.text(`Invoice ID: ${sale._id}`, 14, 32);
        doc.text(`Date: ${sale.createdAt.toDateString()}`, 14, 40);

        doc.text(`Customer: ${sale.customer ? sale.customer.name : 'N/A'}`, 14, 48);

        const tableColumn = ['Product', 'Quantity', 'Price', 'Total'];
        const tableRows = [];

        sale.items.forEach(item => {
            const productName = item.product ? item.product.name : 'Unknown';
            const quantity = item.quantity;
            const price = item.price.toFixed(2);
            const total = (item.price * item.quantity).toFixed(2);
            tableRows.push([productName, quantity.toString(), `$${price}`, `$${total}`]);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 55 });

        const finalY = doc.lastAutoTable.finalY || 55;
        doc.text(`Total Amount: $${sale.amountPaid.toFixed(2)}`, 14, finalY + 10);

        const pdfBuffer = doc.output('arraybuffer');

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=invoice_${sale._id}.pdf`,
            'Content-Length': pdfBuffer.byteLength
        });

        res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        throw new APIError('Error generating invoice PDF', 500);
    }
};
