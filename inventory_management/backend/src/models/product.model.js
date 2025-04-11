const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    minStock: {
        type: Number,
        required: [true, 'Minimum stock level is required'],
        min: [0, 'Minimum stock cannot be negative'],
        default: 5
    },
    imageUrl: {
        type: String,
        default: null
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined values
    },
    locations: [{
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    supplier: {
        name: String,
        contactInfo: String
    },
    lastPurchasePrice: {
        type: Number,
        min: 0
    },
    lastPurchaseDate: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if product is low on stock
productSchema.virtual('isLowStock').get(function() {
    return this.stock <= this.minStock;
});

// Index for text search
productSchema.index({ 
    name: 'text', 
    sku: 'text', 
    category: 'text',
    description: 'text' 
});

// Middleware to prevent stock from going negative
productSchema.pre('save', function(next) {
    if (this.stock < 0) {
        this.stock = 0;
    }
    next();
});

// Method to update stock
productSchema.methods.updateStock = async function(quantity, type = 'add') {
    if (type === 'add') {
        this.stock += quantity;
    } else if (type === 'remove') {
        this.stock = Math.max(0, this.stock - quantity);
    }
    await this.save();
    return this.stock;
};

// Method to check if enough stock is available
productSchema.methods.hasEnoughStock = function(quantity) {
    return this.stock >= quantity;
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
