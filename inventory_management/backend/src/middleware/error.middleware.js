const mongoose = require('mongoose');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new APIError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
    return new APIError('Your token has expired. Please log in again.', 401);
};

/**
 * Handle MongoDB duplicate key error
 */
const handleDuplicateFieldsDB = (error) => {
    const value = error.message.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new APIError(message, 400);
};

/**
 * Handle Mongoose validation error
 */
const handleValidationErrorDB = (error) => {
    const errors = Object.values(error.errors).map(err => err.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new APIError(message, 400);
};

/**
 * Handle MongoDB cast error
 */
const handleCastErrorDB = (error) => {
    const message = `Invalid ${error.path}: ${error.value}`;
    return new APIError(message, 400);
};

/**
 * Send error response in development environment
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Send error response in production environment
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        });
    } 
    // Programming or other unknown error: don't leak error details
    else {
        // Log error for debugging
        console.error('ERROR 💥:', err);

        res.status(500).json({
            success: false,
            message: 'Something went wrong!'
        });
    }
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle different types of errors
        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

/**
 * Middleware to handle 404 errors
 */
const notFound = (req, res, next) => {
    const error = new APIError(`Not found - ${req.originalUrl}`, 404);
    next(error);
};

/**
 * Middleware to handle async errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware to validate request body
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            const message = error.details.map(detail => detail.message).join(', ');
            throw new APIError(message, 400);
        }
        next();
    };
};

/**
 * Middleware to validate MongoDB ObjectId
 */
const validateObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new APIError('Invalid ID', 400);
    }
    next();
};

module.exports = {
    APIError,
    errorHandler,
    notFound,
    asyncHandler,
    validateRequest,
    validateObjectId
};
