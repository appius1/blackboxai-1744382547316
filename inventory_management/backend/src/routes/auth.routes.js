const express = require('express');
const { register, login, getProfile, updateProfile, refreshToken, changePassword, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.post('/refresh-token', refreshToken);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
