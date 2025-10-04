const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { 
  authValidation, 
  handleValidationErrors, 
  sanitizeInput 
} = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register new user and company
// @access  Public
router.post(
  '/register',
  sanitizeInput,
  authValidation.register,
  handleValidationErrors,
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  sanitizeInput,
  authValidation.login,
  handleValidationErrors,
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get(
  '/me',
  auth,
  authController.getCurrentUser
);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  auth,
  sanitizeInput,
  authController.updateProfile
);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post(
  '/change-password',
  auth,
  sanitizeInput,
  authValidation.changePassword,
  handleValidationErrors,
  authController.changePassword
);

// @route   POST /api/auth/logout
// @desc    Logout user (audit logging)
// @access  Private
router.post(
  '/logout',
  auth,
  authController.logout
);

module.exports = router;