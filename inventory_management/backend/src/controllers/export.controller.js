const { APIError } = require('../middleware/error.middleware');
const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { Parser } = require('json2csv');

/**
 * Export data as CSV
 * @route POST /api/export/csv
 * @access Private
 * @body { type: 'sales' | 'products' | 'customers' }
 */
exports.exportCSV = async (req, res) => {
    const { type } = req.body;

    try {
        let data = [];
        let fields = [];

        switch (type) {
            case 'sales':
                data = await Sale.find().populate('customer').populate('items.product').lean();
                fields = ['_id', 'customer.name', 'amountPaid', 'createdAt'];
                break;
            case 'products':
                data = await Product.find().lean();
                fields = ['_id', 'name', 'category', 'stockLevel', 'price'];
                break;
            case 'customers':
                data = await Customer.find().lean();
                fields = ['_id', 'name', 'email', 'phone'];
                break;
            default:
                throw new APIError('Invalid export type', 400);
        }

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);

        res.setHeader('Content-disposition', `attachment; filename=${type}.csv`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csv);
    } catch (error) {
        throw new APIError('Error exporting CSV', 500);
    }
};
