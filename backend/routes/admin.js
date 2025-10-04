const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { 
  auth, 
  requireRole
} = require('../middleware/auth');
const { 
  userValidation, 
  companyValidation, 
  paramValidation, 
  handleValidationErrors, 
  sanitizeInput 
} = require('../middleware/validation');
const { adminLimiter } = require('../middleware/rateLimit');

// @route   GET /api/admin/users
// @desc    Get all company users
// @access  Private (Admin)
router.get(
  '/users',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.getCompanyUsers
);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin)
router.post(
  '/users',
  auth,
  requireRole(['admin']),
  adminLimiter,
  sanitizeInput,
  userValidation.create,
  handleValidationErrors,
  adminController.createUser
);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put(
  '/users/:id',
  auth,
  requireRole(['admin']),
  adminLimiter,
  sanitizeInput,
  paramValidation.id,
  userValidation.update,
  handleValidationErrors,
  adminController.updateUser
);

// @route   PUT /api/admin/company/settings
// @desc    Update company settings
// @access  Private (Admin)
router.put(
  '/company/settings',
  auth,
  requireRole(['admin']),
  adminLimiter,
  sanitizeInput,
  companyValidation.updateSettings,
  handleValidationErrors,
  adminController.updateCompanySettings
);

// @route   GET /api/admin/expenses
// @desc    Get all company expenses (admin view)
// @access  Private (Admin)
router.get(
  '/expenses',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.getAllCompanyExpenses
);

// @route   GET /api/admin/audit-logs
// @desc    Get audit logs
// @access  Private (Admin)
router.get(
  '/audit-logs',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.getAuditLogs
);

// Reminder management routes
// @route   POST /api/admin/reminders/trigger
// @desc    Manually trigger reminders (for demo/testing)
// @access  Private (Admin)
router.post(
  '/reminders/trigger',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.triggerReminders
);

// @route   GET /api/admin/queue/stats
// @desc    Get email queue statistics
// @access  Private (Admin)
router.get(
  '/queue/stats',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.getQueueStats
);

// @route   POST /api/admin/queue/clean
// @desc    Clean old jobs from queue
// @access  Private (Admin)
router.post(
  '/queue/clean',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.cleanQueue
);

// @route   POST /api/admin/queue/retry-failed
// @desc    Retry failed email jobs
// @access  Private (Admin)
router.post(
  '/queue/retry-failed',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.retryFailedJobs
);

// @route   GET /api/admin/queue/failed-jobs
// @desc    Get recent failed jobs
// @access  Private (Admin)
router.get(
  '/queue/failed-jobs',
  auth,
  requireRole(['admin']),
  adminLimiter,
  adminController.getFailedJobs
);

module.exports = router;