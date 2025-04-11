const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        sparse: true // Allows null/undefined values while maintaining unique constraint
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    photoUrl: {
        type: String,
        default: null
    },
    totalPurchases: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    },
    amountDue: {
        type: Number,
        default: 0
    },
    creditLimit: {
        type: Number,
        default: 0
    },
    paymentTerms: {
        type: String,
        enum: ['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
        default: 'COD'
    },
    notes: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'blocked'],
        default: 'active'
    },
    lastPurchaseDate: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
    const address = this.address;
    if (!address) return '';
    
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`
        .replace(/undefined|null/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/g, '')
        .trim();
});

// Virtual for credit status
customerSchema.virtual('creditStatus').get(function() {
    if (this.amountDue <= 0) return 'PAID';
    if (this.amountDue >= this.creditLimit) return 'LIMIT_REACHED';
    return 'HAS_CREDIT';
});

// Index for text search
customerSchema.index({ 
    name: 'text', 
    'address.city': 'text',
    'address.state': 'text',
    email: 'text',
    phone: 'text'
});

// Method to update purchase totals
customerSchema.methods.updatePurchaseTotals = async function(purchaseAmount, amountPaid) {
    this.totalPurchases += 1;
    this.totalSpent += purchaseAmount;
    this.amountDue += (purchaseAmount - amountPaid);
    this.lastPurchaseDate = new Date();
    await this.save();
};

// Method to process payment
customerSchema.methods.processPayment = async function(amount) {
    if (amount > this.amountDue) {
        throw new Error('Payment amount exceeds amount due');
    }
    this.amountDue -= amount;
    await this.save();
    return this.amountDue;
};

// Method to check credit availability
customerSchema.methods.hasAvailableCredit = function(amount) {
    return (this.amountDue + amount) <= this.creditLimit;
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
