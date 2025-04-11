const User = require('../models/user.model');
const { APIError } = require('../middleware/error.middleware');
const { generateToken, generateRefreshToken } = require('../utils/jwt.utils');
const { userSchemas } = require('../utils/validation.utils');
const { removeSensitiveData } = require('../utils/helper.utils');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res) => {
    const { error } = userSchemas.register.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const { email, password, name, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new APIError('User already exists', 400);
    }

    // Create user
    const user = await User.create({
        email,
        password,
        name,
        role: role || 'employee',
        phone,
        active: true
    });

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Remove sensitive data
    const userData = removeSensitiveData(user.toObject());

    res.status(201).json({
        success: true,
        data: {
            user: userData,
            token,
            refreshToken
        }
    });
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
    const { error } = userSchemas.login.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new APIError('Invalid credentials', 401);
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new APIError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.active) {
        throw new APIError('Your account has been deactivated', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Remove sensitive data
    const userData = removeSensitiveData(user.toObject());

    res.status(200).json({
        success: true,
        data: {
            user: userData,
            token,
            refreshToken
        }
    });
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 * @access Private
 */
exports.getProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new APIError('User not found', 404);
    }

    res.status(200).json({
        success: true,
        data: removeSensitiveData(user.toObject())
    });
};

/**
 * Update user profile
 * @route PUT /api/auth/me
 * @access Private
 */
exports.updateProfile = async (req, res) => {
    const { error } = userSchemas.updateProfile.validate(req.body);
    if (error) {
        throw new APIError(error.details[0].message, 400);
    }

    const { name, phone, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
        throw new APIError('User not found', 404);
    }

    // Update basic info
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Update password if provided
    if (currentPassword && newPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new APIError('Current password is incorrect', 401);
        }
        user.password = newPassword;
    }

    await user.save();

    res.status(200).json({
        success: true,
        data: removeSensitiveData(user.toObject())
    });
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new APIError('Refresh token is required', 400);
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id);

        if (!user || !user.active) {
            throw new APIError('Invalid refresh token', 401);
        }

        const newToken = generateToken({ id: user._id });
        const newRefreshToken = generateRefreshToken({ id: user._id });

        res.status(200).json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        throw new APIError('Invalid refresh token', 401);
    }
};

/**
 * Change password
 * @route POST /api/auth/change-password
 * @access Private
 */
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new APIError('Please provide both current and new password', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
        throw new APIError('User not found', 404);
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
        throw new APIError('Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password updated successfully'
    });
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
    // In a real-world application, you might want to invalidate the token
    // This could be done by maintaining a blacklist of tokens in Redis
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

module.exports = exports;
