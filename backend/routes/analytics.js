const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { 
  auth, 
  requireRole, 
  canViewAnalytics 
} = require('../middleware/auth');
const { 
  analyticsValidation, 
  handleValidationErrors 
} = require('../middleware/validation');
const { analyticsLimiter } = require('../middleware/rateLimit');

// @route   GET /api/analytics/company
// @desc    Get company analytics
// @access  Private (Manager/Admin)
router.get(
  '/company',
  auth,
  requireRole(['manager', 'admin']),
  analyticsLimiter,
  analyticsValidation.query,
  handleValidationErrors,
  analyticsController.getCompanyAnalytics
);

// @route   GET /api/analytics/dashboard
// @desc    Get user dashboard statistics
// @access  Private
router.get(
  '/dashboard',
  auth,
  analyticsController.getUserDashboard
);

// @route   GET /api/analytics/approvals
// @desc    Get approval analytics
// @access  Private (Manager/Admin)
router.get(
  '/approvals',
  auth,
  requireRole(['manager', 'admin']),
  analyticsLimiter,
  analyticsValidation.query,
  handleValidationErrors,
  analyticsController.getApprovalAnalytics
);

module.exports = router;