const jwt = require('jsonwebtoken');
const { APIError } = require('../middleware/error.middleware');

/**
 * Generate JWT token
 * @param {Object} payload - Data to be encoded in the token
 * @param {String} expiresIn - Token expiration time
 * @returns {String} JWT token
 */
const generateToken = (payload, expiresIn = '1d') => {
    try {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    } catch (error) {
        throw new APIError('Error generating token', 500);
    }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new APIError('Token expired', 401);
        }
        throw new APIError('Invalid token', 401);
    }
};

/**
 * Extract token from request headers
 * @param {Object} headers - Request headers
 * @returns {String|null} Token or null if not found
 */
const extractTokenFromHeaders = (headers) => {
    if (headers.authorization && headers.authorization.startsWith('Bearer')) {
        return headers.authorization.split(' ')[1];
    }
    return null;
};

/**
 * Generate refresh token
 * @param {Object} payload - Data to be encoded in the token
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
    try {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    } catch (error) {
        throw new APIError('Error generating refresh token', 500);
    }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new APIError('Invalid refresh token', 401);
    }
};

module.exports = {
    generateToken,
    verifyToken,
    extractTokenFromHeaders,
    generateRefreshToken,
    verifyRefreshToken
};
