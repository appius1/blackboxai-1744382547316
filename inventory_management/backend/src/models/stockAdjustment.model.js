const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    adjustmentType: {
        type: String,
        required: true,
        enum: ['damage', 'theft', 'loss', 'correction', 'return', 'other'],
    },
    quantity: {
        type: Number,
        required: true,
        validate: {
            validator: function(value) {
                return value !== 0;
            },
            message: 'Quantity cannot be zero'
        }
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true,
        min: [0, 'Cost cannot be negative']
    },
    reference: {
        type: String,
        trim: true
    },
    attachments: [{
        name: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
stockAdjustmentSchema.index({ product: 1, createdAt: -1 });
stockAdjustmentSchema.index({ adjustmentType: 1 });
stockAdjustmentSchema.index({ status: 1 });
stockAdjustmentSchema.index({ location: 1 });

// Virtual for adjustment direction
stockAdjustmentSchema.virtual('direction').get(function() {
    return this.quantity > 0 ? 'increase' : 'decrease';
});

// Virtual for formatted quantity
stockAdjustmentSchema.virtual('formattedQuantity').get(function() {
    return Math.abs(this.quantity);
});

// Pre-save middleware to calculate new stock
stockAdjustmentSchema.pre('save', function(next) {
    this.newStock = this.previousStock + this.quantity;
    next();
});

// Method to approve adjustment
stockAdjustmentSchema.methods.approve = async function(approvedBy) {
    if (this.status !== 'pending') {
        throw new Error('Can only approve pending adjustments');
    }
    
    this.status = 'approved';
    this.approvedBy = approvedBy;
    await this.save();
    
    // Update product stock
    const product = await mongoose.model('Product').findById(this.product);
    if (!product) {
        throw new Error('Product not found');
    }
    
    await product.updateStock(Math.abs(this.quantity), this.quantity > 0 ? 'add' : 'remove');
    
    return this;
};

// Method to reject adjustment
stockAdjustmentSchema.methods.reject = async function(approvedBy) {
    if (this.status !== 'pending') {
        throw new Error('Can only reject pending adjustments');
    }
    
    this.status = 'rejected';
    this.approvedBy = approvedBy;
    await this.save();
    
    return this;
};

// Static method to generate adjustment reference
stockAdjustmentSchema.statics.generateReference = async function() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the last reference number for the current month
    const lastAdjustment = await this.findOne({
        reference: new RegExp(`^ADJ${year}${month}`)
    }, {}, { sort: { 'reference': -1 } });
    
    let sequence = '0001';
    if (lastAdjustment) {
        const lastSequence = parseInt(lastAdjustment.reference.slice(-4));
        sequence = (lastSequence + 1).toString().padStart(4, '0');
    }
    
    return `ADJ${year}${month}${sequence}`;
};

// Static method to get stock value adjustment
stockAdjustmentSchema.statics.getStockValueAdjustment = async function(startDate, endDate, location = null) {
    const match = {
        status: 'approved',
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
    };
    
    if (location) {
        match.location = location;
    }
    
    const result = await this.aggregate([
        { $match: match },
        { $group: {
            _id: '$adjustmentType',
            totalQuantity: { $sum: '$quantity' },
            totalCost: { $sum: '$cost' },
            count: { $sum: 1 }
        }},
        { $project: {
            adjustmentType: '$_id',
            totalQuantity: 1,
            totalCost: 1,
            count: 1,
            _id: 0
        }}
    ]);
    
    return result;
};

const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);

module.exports = StockAdjustment;
