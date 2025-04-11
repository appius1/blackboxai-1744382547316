const Joi = require('joi');

/**
 * User validation schemas
 */
const userSchemas = {
    register: Joi.object({
        name: Joi.string().required().min(2).max(50),
        email: Joi.string().required().email(),
        password: Joi.string().required().min(8)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
            .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
        role: Joi.string().valid('admin', 'employee'),
        phone: Joi.string().pattern(new RegExp('^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$'))
    }),

    login: Joi.object({
        email: Joi.string().required().email(),
        password: Joi.string().required()
    }),

    updateProfile: Joi.object({
        name: Joi.string().min(2).max(50),
        phone: Joi.string().pattern(new RegExp('^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$')),
        currentPassword: Joi.string().min(8),
        newPassword: Joi.string().min(8)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
            .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
    })
};

/**
 * Product validation schemas
 */
const productSchemas = {
    create: Joi.object({
        name: Joi.string().required().min(2).max(100),
        sku: Joi.string().required().pattern(new RegExp('^[A-Za-z0-9-]+$')),
        category: Joi.string().required(),
        description: Joi.string().max(1000),
        price: Joi.number().required().min(0),
        stock: Joi.number().required().min(0),
        minStock: Joi.number().required().min(0),
        barcode: Joi.string(),
        supplier: Joi.object({
            name: Joi.string().required(),
            contactInfo: Joi.string()
        }),
        locations: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                quantity: Joi.number().required().min(0)
            })
        )
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(100),
        category: Joi.string(),
        description: Joi.string().max(1000),
        price: Joi.number().min(0),
        minStock: Joi.number().min(0),
        supplier: Joi.object({
            name: Joi.string(),
            contactInfo: Joi.string()
        }),
        locations: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                quantity: Joi.number().required().min(0)
            })
        )
    })
};

/**
 * Customer validation schemas
 */
const customerSchemas = {
    create: Joi.object({
        name: Joi.string().required().min(2).max(100),
        email: Joi.string().email(),
        phone: Joi.string().required().pattern(new RegExp('^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$')),
        address: Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().required()
        }),
        creditLimit: Joi.number().min(0),
        paymentTerms: Joi.string().valid('COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'),
        notes: Joi.string().max(500),
        tags: Joi.array().items(Joi.string())
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(100),
        email: Joi.string().email(),
        phone: Joi.string().pattern(new RegExp('^[+]?[(]?[0-9]{3}[)]?[-\\s.]?[0-9]{3}[-\\s.]?[0-9]{4,6}$')),
        address: Joi.object({
            street: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            zipCode: Joi.string(),
            country: Joi.string()
        }),
        creditLimit: Joi.number().min(0),
        paymentTerms: Joi.string().valid('COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'),
        notes: Joi.string().max(500),
        tags: Joi.array().items(Joi.string()),
        status: Joi.string().valid('active', 'inactive', 'blocked')
    })
};

/**
 * Sale validation schemas
 */
const saleSchemas = {
    create: Joi.object({
        customer: Joi.string().required().hex().length(24),
        items: Joi.array().required().items(
            Joi.object({
                product: Joi.string().required().hex().length(24),
                quantity: Joi.number().required().min(1),
                priceAtSale: Joi.number().required().min(0),
                discount: Joi.number().min(0)
            })
        ),
        tax: Joi.number().min(0),
        discount: Joi.number().min(0),
        amountPaid: Joi.number().min(0),
        paymentMethod: Joi.string().required().valid('cash', 'credit_card', 'debit_card', 'bank_transfer', 'credit'),
        notes: Joi.string(),
        location: Joi.string().required()
    })
};

/**
 * Purchase Order validation schemas
 */
const purchaseOrderSchemas = {
    create: Joi.object({
        supplier: Joi.object({
            name: Joi.string().required(),
            contactPerson: Joi.string(),
            email: Joi.string().email(),
            phone: Joi.string(),
            address: Joi.object({
                street: Joi.string(),
                city: Joi.string(),
                state: Joi.string(),
                zipCode: Joi.string(),
                country: Joi.string()
            })
        }).required(),
        items: Joi.array().required().items(
            Joi.object({
                product: Joi.string().required().hex().length(24),
                quantity: Joi.number().required().min(1),
                unitPrice: Joi.number().required().min(0)
            })
        ),
        tax: Joi.number().min(0),
        shipping: Joi.number().min(0),
        expectedDeliveryDate: Joi.date().greater('now'),
        paymentTerms: Joi.string().valid('COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60'),
        notes: Joi.string(),
        location: Joi.string().required()
    }),

    receive: Joi.object({
        items: Joi.array().required().items(
            Joi.object({
                itemId: Joi.string().required().hex().length(24),
                receivedQuantity: Joi.number().required().min(0)
            })
        )
    })
};

/**
 * Stock Adjustment validation schemas
 */
const stockAdjustmentSchemas = {
    create: Joi.object({
        product: Joi.string().required().hex().length(24),
        adjustmentType: Joi.string().required().valid('damage', 'theft', 'loss', 'correction', 'return', 'other'),
        quantity: Joi.number().required().not(0),
        reason: Joi.string().required(),
        location: Joi.string().required(),
        cost: Joi.number().required().min(0),
        reference: Joi.string(),
        notes: Joi.string()
    })
};

module.exports = {
    userSchemas,
    productSchemas,
    customerSchemas,
    saleSchemas,
    purchaseOrderSchemas,
    stockAdjustmentSchemas
};
