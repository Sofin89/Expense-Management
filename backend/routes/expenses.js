const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { 
  auth, 
  requireRole, 
  canApproveExpenses 
} = require('../middleware/auth');
const { 
  expenseValidation, 
  paramValidation, 
  handleValidationErrors, 
  sanitizeInput 
} = require('../middleware/validation');
const { uploadReceipt } = require('../middleware/upload');
const { 
  expenseSubmissionLimiter,
  fileUploadLimiter 
} = require('../middleware/rateLimit');

// @route   GET /api/expenses
// @desc    Get all expenses for current user
// @access  Private
router.get(
  '/',
  auth,
  expenseValidation.query,
  handleValidationErrors,
  expenseController.getUserExpenses
);

// @route   GET /api/expenses/approvals
// @desc    Get expenses awaiting approval
// @access  Private (Manager/Admin)
router.get(
  '/approvals',
  auth,
  requireRole(['manager', 'admin']),
  expenseValidation.query,
  handleValidationErrors,
  expenseController.getPendingApprovals
);

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private
router.get(
  '/:id',
  auth,
  paramValidation.id,
  handleValidationErrors,
  expenseController.getExpense
);

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private
router.post(
  '/',
  auth,
  expenseSubmissionLimiter,
  sanitizeInput,
  expenseValidation.create,
  handleValidationErrors,
  expenseController.createExpense
);

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put(
  '/:id',
  auth,
  sanitizeInput,
  paramValidation.id,
  expenseValidation.update,
  handleValidationErrors,
  expenseController.updateExpense
);

// @route   POST /api/expenses/:id/approve
// @desc    Approve/Reject expense
// @access  Private (Manager/Admin)
router.post(
  '/:id/approve',
  auth,
  requireRole(['manager', 'admin']),
  paramValidation.id,
  expenseValidation.approval,
  handleValidationErrors,
  expenseController.processApproval
);

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete(
  '/:id',
  auth,
  paramValidation.id,
  handleValidationErrors,
  expenseController.deleteExpense
);

// @route   POST /api/expenses/process-receipt
// @desc    Process receipt OCR
// @access  Private
router.post(
  '/process-receipt',
  auth,
  fileUploadLimiter,
  uploadReceipt,
  expenseController.processReceiptOCR
);

module.exports = router;