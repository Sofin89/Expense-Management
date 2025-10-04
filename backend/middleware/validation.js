const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/\s+/g, ' ');
      }
    });
  }
  
  next();
};

// Common validation rules
const commonValidators = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom(async (email, { req }) => {
      if (req.method === 'PUT' && req.user && req.user.email === email) {
        return true;
      }
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('Email already exists');
      }
      return true;
    }),

  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  amount: body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount is required'),

  currency: body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid currency code is required')
    .isUppercase()
    .withMessage('Currency code must be uppercase'),

  date: body('date')
    .isISO8601()
    .withMessage('Valid date is required')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date > now) {
        throw new Error('Date cannot be in the future');
      }
      return true;
    })
};

// Auth validation rules
const authValidation = {
  register: [
    commonValidators.name,
    commonValidators.email,
    commonValidators.password,
    body('companyName')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Company name must be between 2 and 200 characters'),
    body('country')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Please provide a valid country name')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
  ]
};

// Expense validation rules
const expenseValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must be less than 200 characters'),
    commonValidators.amount,
    commonValidators.currency,
    body('category')
      .isIn(['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'])
      .withMessage('Please select a valid category'),
    commonValidators.date,
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number greater than 0'),
    body('currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency must be a 3-letter code'),
    body('category')
      .optional()
      .isIn(['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'])
      .withMessage('Please select a valid category'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date')
  ],

  approval: [
    body('action')
      .isIn(['approve', 'reject'])
      .withMessage('Action must be either "approve" or "reject"'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Comment must be less than 500 characters')
  ],

  query: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled', 'all'])
      .withMessage('Invalid status filter'),
    query('category')
      .optional()
      .isIn(['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other', 'all'])
      .withMessage('Invalid category filter')
  ]
};

// User validation rules
const userValidation = {
  create: [
    commonValidators.name,
    commonValidators.email,
    body('role')
      .isIn(['employee', 'manager', 'admin'])
      .withMessage('Role must be employee, manager, or admin')
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('role')
      .optional()
      .isIn(['employee', 'manager', 'admin'])
      .withMessage('Role must be employee, manager, or admin')
  ]
};

// Company validation rules
const companyValidation = {
  updateSettings: [
    body('settings.autoApproveLimit')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Auto approve limit must be a positive number'),
    body('settings.approvalFlow')
      .optional()
      .isArray()
      .withMessage('Approval flow must be an array'),
    body('settings.approvalPercentage')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Approval percentage must be between 1 and 100')
  ]
};

// Notification validation rules
const notificationValidation = {
  query: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ]
};

// Analytics validation rules
const analyticsValidation = {
  query: [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y'])
      .withMessage('Period must be 7d, 30d, 90d, or 1y')
  ]
};

// Parameter validation
const paramValidation = {
  id: param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  commonValidators,
  authValidation,
  expenseValidation,
  userValidation,
  companyValidation,
  notificationValidation,
  analyticsValidation,
  paramValidation
};