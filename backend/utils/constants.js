// Application constants
module.exports = {
  // User roles
  ROLES: {
    EMPLOYEE: 'employee',
    MANAGER: 'manager',
    ADMIN: 'admin'
  },

  // Expense statuses
  EXPENSE_STATUS: {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PAID: 'paid',
    CANCELLED: 'cancelled'
  },

  // Expense categories
  EXPENSE_CATEGORIES: [
    'travel',
    'meals',
    'entertainment',
    'supplies',
    'equipment',
    'software',
    'other'
  ],

  // Approval actions
  APPROVAL_ACTIONS: {
    APPROVE: 'approve',
    REJECT: 'reject'
  },

  // Approval flow roles
  APPROVAL_ROLES: {
    MANAGER: 'manager',
    FINANCE: 'finance',
    ADMIN: 'admin'
  },

  // Notification types
  NOTIFICATION_TYPES: {
    EXPENSE_SUBMITTED: 'expense_submitted',
    EXPENSE_APPROVED: 'expense_approved',
    EXPENSE_REJECTED: 'expense_rejected',
    EXPENSE_PAID: 'expense_paid',
    APPROVAL_REQUIRED: 'approval_required',
    REMINDER: 'reminder',
    SYSTEM_ALERT: 'system_alert',
    WELCOME: 'welcome',
    USER_INVITED: 'user_invited',
    SETTINGS_UPDATED: 'settings_updated'
  },

  // Notification priorities
  NOTIFICATION_PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  },

  // Email types
  EMAIL_TYPES: {
    EXPENSE_SUBMITTED: 'expense_submitted',
    EXPENSE_APPROVED: 'expense_approved',
    EXPENSE_REJECTED: 'expense_rejected',
    EXPENSE_PAID: 'expense_paid',
    REMINDER: 'reminder',
    WELCOME: 'welcome',
    USER_INVITED: 'user_invited',
    PASSWORD_RESET: 'password_reset',
    SYSTEM_ALERT: 'system_alert'
  },

  // Audit log actions
  AUDIT_ACTIONS: {
    // User actions
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    PASSWORD_CHANGED: 'password_changed',
    
    // Expense actions
    EXPENSE_CREATED: 'expense_created',
    EXPENSE_UPDATED: 'expense_updated',
    EXPENSE_DELETED: 'expense_deleted',
    EXPENSE_SUBMITTED: 'expense_submitted',
    EXPENSE_APPROVED: 'expense_approved',
    EXPENSE_REJECTED: 'expense_rejected',
    EXPENSE_PAID: 'expense_paid',
    
    // Approval actions
    APPROVAL_ASSIGNED: 'approval_assigned',
    APPROVAL_ACTION: 'approval_action',
    APPROVAL_REMINDER_SENT: 'approval_reminder_sent',
    
    // Company actions
    COMPANY_CREATED: 'company_created',
    COMPANY_UPDATED: 'company_updated',
    SETTINGS_UPDATED: 'settings_updated',
    
    // System actions
    BACKUP_CREATED: 'backup_created',
    CLEANUP_PERFORMED: 'cleanup_performed',
    SYSTEM_MAINTENANCE: 'system_maintenance'
  },

  // File upload constraints
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  // Rate limiting
  RATE_LIMITING: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 10,
    EXPENSE_SUBMISSION_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    EXPENSE_SUBMISSION_MAX_REQUESTS: 50
  },

  // Cache durations (in milliseconds)
  CACHE_DURATION: {
    EXCHANGE_RATES: 24 * 60 * 60 * 1000, // 24 hours
    COMPANY_SETTINGS: 60 * 60 * 1000, // 1 hour
    USER_SESSION: 7 * 24 * 60 * 60 * 1000, // 7 days
    ANALYTICS_DATA: 30 * 60 * 1000 // 30 minutes
  },

  // Default company settings
  DEFAULT_COMPANY_SETTINGS: {
    autoApproveLimit: 50,
    approvalFlow: ['manager'],
    approvalPercentage: 60,
    reminderSchedule: 24, // hours
    requireReceipt: true,
    receiptRequiredAmount: 25,
    categories: ['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'],
    notifyOnSubmission: true,
    notifyOnApproval: true,
    notifyOnRejection: true,
    sessionTimeout: 24 // hours
  },

  // Currency defaults
  CURRENCY: {
    DEFAULT: 'USD',
    SUPPORTED: [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
      'BRL', 'RUB', 'KRW', 'SGD', 'NZD', 'MXN', 'HKD', 'TRY', 'ZAR'
    ]
  },

  // Time intervals (in milliseconds)
  INTERVALS: {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000
  },

  // Regex patterns
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    CURRENCY: /^\$?(\d{1,3}(,\d{3})*|(\d+))(\.\d{2})?$/,
    OBJECT_ID: /^[0-9a-fA-F]{24}$/
  },

  // Error messages
  ERROR_MESSAGES: {
    // Authentication
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCESS_DENIED: 'Access denied. Insufficient permissions.',
    TOKEN_EXPIRED: 'Token expired. Please login again.',
    TOKEN_INVALID: 'Invalid token.',
    
    // Validation
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PASSWORD: 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    INVALID_AMOUNT: 'Amount must be a positive number',
    INVALID_CURRENCY: 'Invalid currency code',
    INVALID_DATE: 'Please provide a valid date',
    
    // Business logic
    EXPENSE_NOT_FOUND: 'Expense not found',
    USER_NOT_FOUND: 'User not found',
    COMPANY_NOT_FOUND: 'Company not found',
    ALREADY_PROCESSED: 'This expense has already been processed',
    CANNOT_EDIT: 'Expense cannot be edited in its current status',
    
    // System errors
    INTERNAL_ERROR: 'An internal server error occurred',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    RATE_LIMITED: 'Too many requests, please try again later'
  },

  // Success messages
  SUCCESS_MESSAGES: {
    // Authentication
    LOGIN_SUCCESS: 'Login successful',
    REGISTER_SUCCESS: 'Registration successful',
    LOGOUT_SUCCESS: 'Logout successful',
    
    // Expenses
    EXPENSE_CREATED: 'Expense submitted successfully',
    EXPENSE_UPDATED: 'Expense updated successfully',
    EXPENSE_DELETED: 'Expense deleted successfully',
    EXPENSE_APPROVED: 'Expense approved successfully',
    EXPENSE_REJECTED: 'Expense rejected successfully',
    
    // Users
    USER_CREATED: 'User created successfully',
    USER_UPDATED: 'User updated successfully',
    PASSWORD_CHANGED: 'Password updated successfully',
    
    // Company
    SETTINGS_UPDATED: 'Company settings updated successfully'
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  }
};