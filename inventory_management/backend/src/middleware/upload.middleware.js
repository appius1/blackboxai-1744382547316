const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { APIError } = require('./error.middleware');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Configure storage for different file types
 */
const createStorageConfig = (folder) => {
    return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: `inventory-management/${folder}`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        }
    });
};

// Storage configurations for different types of uploads
const storageConfigs = {
    products: createStorageConfig('products'),
    customers: createStorageConfig('customers'),
    documents: createStorageConfig('documents')
};

/**
 * File filter function
 */
const fileFilter = (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new APIError('Not an image or PDF! Please upload only images or PDF files.', 400), false);
    }
};

/**
 * Create multer upload instance for different purposes
 */
const createUploader = (type) => {
    if (!storageConfigs[type]) {
        throw new Error(`Invalid upload type: ${type}`);
    }

    return multer({
        storage: storageConfigs[type],
        fileFilter: fileFilter,
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        }
    });
};

// Create upload instances for different types
const uploadProduct = createUploader('products');
const uploadCustomer = createUploader('customers');
const uploadDocument = createUploader('documents');

/**
 * Middleware to handle single file upload
 */
const handleSingleUpload = (type) => {
    return async (req, res, next) => {
        try {
            const uploader = type === 'products' ? uploadProduct :
                           type === 'customers' ? uploadCustomer :
                           uploadDocument;

            uploader.single('file')(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        throw new APIError('File too large! Maximum size is 5MB.', 400);
                    }
                    throw new APIError(err.message, 400);
                } else if (err) {
                    throw new APIError(err.message, 400);
                }
                next();
            });
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to handle multiple file uploads
 */
const handleMultipleUploads = (type, maxCount = 5) => {
    return async (req, res, next) => {
        try {
            const uploader = type === 'products' ? uploadProduct :
                           type === 'customers' ? uploadCustomer :
                           uploadDocument;

            uploader.array('files', maxCount)(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        throw new APIError('File too large! Maximum size is 5MB.', 400);
                    } else if (err.code === 'LIMIT_FILE_COUNT') {
                        throw new APIError(`Too many files! Maximum is ${maxCount} files.`, 400);
                    }
                    throw new APIError(err.message, 400);
                } else if (err) {
                    throw new APIError(err.message, 400);
                }
                next();
            });
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        throw new APIError('Error deleting file', 500);
    }
};

/**
 * Middleware to process uploaded files
 */
const processUpload = async (req, res, next) => {
    try {
        if (!req.file && !req.files) {
            return next();
        }

        // For single file upload
        if (req.file) {
            req.uploadedFile = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }
        // For multiple file uploads
        else if (req.files) {
            req.uploadedFiles = req.files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
        }
        next();
    } catch (error) {
        next(new APIError('Error processing uploaded file', 500));
    }
};

module.exports = {
    handleSingleUpload,
    handleMultipleUploads,
    deleteFile,
    processUpload
};
