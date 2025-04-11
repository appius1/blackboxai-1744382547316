const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    priceAtSale: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    subtotal: {
        type: Number,
        required: true
    }
});

const saleSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    items: [saleItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative']
    },
    tax: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Tax cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    total: {
        type: Number,
        required: true,
        min: [0, 'Total cannot be negative']
    },
    amountPaid: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Amount paid cannot be negative']
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'credit']
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['pending', 'partial', 'paid'],
        default: 'pending'
    },
    notes: String,
    salesPerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: String,
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

saleSchema.index({ paymentStatus: 1 });

// Virtual for payment status text
saleSchema.virtual('paymentStatusText').get(function() {
    if (this.paymentStatus === 'paid') return 'Paid';
    if (this.amountPaid > 0) return 'Partially Paid';
    return 'Unpaid';
});

// Pre-save middleware to calculate totals and balance
saleSchema.pre('save', function(next) {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate total with tax and discount
    this.total = this.subtotal + this.tax - this.discount;
    
    // Calculate remaining balance
    this.balance = this.total - this.amountPaid;
    
    // Update payment status
    if (this.balance <= 0) {
        this.paymentStatus = 'paid';
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'partial';
    } else {
        this.paymentStatus = 'pending';
    }
    
    next();
});

// Method to process payment
saleSchema.methods.processPayment = async function(amount) {
    if (amount > this.balance) {
        throw new Error('Payment amount exceeds remaining balance');
    }
    
    this.amountPaid += amount;
    this.balance = this.total - this.amountPaid;
    
    if (this.balance <= 0) {
        this.paymentStatus = 'paid';
    } else {
        this.paymentStatus = 'partial';
    }
    
    await this.save();
    return {
        amountPaid: this.amountPaid,
        balance: this.balance,
        status: this.paymentStatus
    };
};

// Static method to generate invoice number
saleSchema.statics.generateInvoiceNumber = async function() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the last invoice number for the current month
    const lastSale = await this.findOne({
        invoiceNumber: new RegExp(`^INV${year}${month}`)
    }, {}, { sort: { 'invoiceNumber': -1 } });
    
    let sequence = '0001';
    if (lastSale) {
        const lastSequence = parseInt(lastSale.invoiceNumber.slice(-4));
        sequence = (lastSequence + 1).toString().padStart(4, '0');
    }
    
    return `INV${year}${month}${sequence}`;
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;
