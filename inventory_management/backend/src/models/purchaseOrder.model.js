const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
    unitPrice: {
        type: Number,
        required: true,
        min: [0, 'Unit price cannot be negative']
    },
    subtotal: {
        type: Number,
        required: true
    },
    receivedQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Received quantity cannot be negative']
    },
    status: {
        type: String,
        enum: ['pending', 'partial', 'received'],
        default: 'pending'
    }
});

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true
    },
    supplier: {
        name: {
            type: String,
            required: true
        },
        contactPerson: String,
        email: String,
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        }
    },
    items: [purchaseOrderItemSchema],
    subtotal: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        default: 0
    },
    shipping: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'ordered', 'partial', 'received', 'cancelled'],
        default: 'draft'
    },
    orderDate: {
        type: Date
    },
    expectedDeliveryDate: {
        type: Date
    },
    receivedDate: {
        type: Date
    },
    paymentTerms: {
        type: String,
        enum: ['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
        default: 'Net 30'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid'],
        default: 'pending'
    },
    notes: String,
    attachments: [{
        name: String,
        url: String,
        uploadedAt: Date
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

purchaseOrderSchema.index({ status: 1 });

// Virtual for full supplier address
purchaseOrderSchema.virtual('supplierFullAddress').get(function() {
    const address = this.supplier.address;
    if (!address) return '';
    
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`
        .replace(/undefined|null/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/g, '')
        .trim();
});

// Pre-save middleware to calculate totals
purchaseOrderSchema.pre('save', function(next) {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calculate total with tax and shipping
    this.total = this.subtotal + this.tax + this.shipping;
    
    // Update overall status based on items
    if (this.status !== 'draft' && this.status !== 'cancelled') {
        const allReceived = this.items.every(item => item.status === 'received');
        const someReceived = this.items.some(item => item.status === 'received' || item.status === 'partial');
        
        if (allReceived) {
            this.status = 'received';
            this.receivedDate = new Date();
        } else if (someReceived) {
            this.status = 'partial';
        }
    }
    
    next();
});

// Static method to generate PO number
purchaseOrderSchema.statics.generatePONumber = async function() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the last PO number for the current month
    const lastPO = await this.findOne({
        poNumber: new RegExp(`^PO${year}${month}`)
    }, {}, { sort: { 'poNumber': -1 } });
    
    let sequence = '0001';
    if (lastPO) {
        const lastSequence = parseInt(lastPO.poNumber.slice(-4));
        sequence = (lastSequence + 1).toString().padStart(4, '0');
    }
    
    return `PO${year}${month}${sequence}`;
};

// Method to receive items
purchaseOrderSchema.methods.receiveItems = async function(receivedItems) {
    for (const receivedItem of receivedItems) {
        const item = this.items.id(receivedItem.itemId);
        if (!item) {
            throw new Error(`Item ${receivedItem.itemId} not found in PO`);
        }
        
        if (receivedItem.quantity + item.receivedQuantity > item.quantity) {
            throw new Error(`Received quantity exceeds ordered quantity for item ${receivedItem.itemId}`);
        }
        
        item.receivedQuantity += receivedItem.quantity;
        item.status = item.receivedQuantity === item.quantity ? 'received' : 'partial';
    }
    
    await this.save();
    return this;
};

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
