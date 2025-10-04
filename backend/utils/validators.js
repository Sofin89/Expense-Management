const mongoose = require('mongoose');
const logger = require('./logger');

class Validators {
  // Validate MongoDB ObjectId
  static isValidObjectId(id) {
    if (!id) return false;
    return mongoose.Types.ObjectId.isValid(id) && 
           new mongoose.Types.ObjectId(id).toString() === id;
  }

  // Validate expense amount
  static isValidAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return false;
    if (amount <= 0) return false;
    if (amount > 1000000) return false; // Maximum $1,000,000
    return true;
  }

  // Validate currency code
  static isValidCurrency(currency) {
    if (typeof currency !== 'string') return false;
    
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR',
      'BRL', 'RUB', 'KRW', 'SGD', 'NZD', 'MXN', 'HKD', 'TRY', 'ZAR'
    ];
    
    return validCurrencies.includes(currency.toUpperCase());
  }

  // Validate expense category
  static isValidCategory(category) {
    const validCategories = [
      'travel', 'meals', 'entertainment', 'supplies', 
      'equipment', 'software', 'other'
    ];
    
    return validCategories.includes(category);
  }

  // Validate expense status
  static isValidExpenseStatus(status) {
    const validStatuses = [
      'draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled'
    ];
    
    return validStatuses.includes(status);
  }

  // Validate user role
  static isValidUserRole(role) {
    const validRoles = ['employee', 'manager', 'admin'];
    return validRoles.includes(role);
  }

  // Validate date range
  static isValidDateRange(startDate, endDate) {
    if (!startDate || !endDate) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    if (start > end) return false;
    if (end > new Date()) return false; // Can't be in future
    
    // Maximum 1 year range
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYearMs) return false;
    
    return true;
  }

  // Validate file upload
  static isValidFileUpload(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf'
      ],
      allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    } = options;

    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        error: `File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB` 
      };
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { 
        isValid: false, 
        error: `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}` 
      };
    }

    // Check file extension if filename is provided
    if (file.originalname) {
      const extension = file.originalname.toLowerCase().split('.').pop();
      if (!allowedExtensions.includes(extension)) {
        return { 
          isValid: false, 
          error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}` 
        };
      }
    }

    return { isValid: true };
  }

  // Validate email template variables
  static validateEmailTemplate(template, requiredVariables = []) {
    const errors = [];
    
    if (!template.subject) {
      errors.push('Email template must have a subject');
    }
    
    if (!template.html && !template.text) {
      errors.push('Email template must have either HTML or text content');
    }
    
    // Check for required variables in content
    const content = template.html || template.text || '';
    requiredVariables.forEach(variable => {
      if (!content.includes(`{{${variable}}}`)) {
        errors.push(`Email template is missing required variable: ${variable}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate notification data
  static validateNotification(notification) {
    const errors = [];
    
    if (!notification.userId) {
      errors.push('Notification must have a userId');
    }
    
    if (!notification.type) {
      errors.push('Notification must have a type');
    }
    
    if (!notification.title) {
      errors.push('Notification must have a title');
    }
    
    if (!notification.body) {
      errors.push('Notification must have a body');
    }
    
    const validTypes = [
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'expense_paid',
      'approval_required',
      'reminder',
      'system_alert',
      'welcome',
      'user_invited',
      'settings_updated'
    ];
    
    if (!validTypes.includes(notification.type)) {
      errors.push(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }
    
    if (notification.title.length > 200) {
      errors.push('Notification title must be less than 200 characters');
    }
    
    if (notification.body.length > 1000) {
      errors.push('Notification body must be less than 1000 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate company settings
  static validateCompanySettings(settings) {
    const errors = [];
    
    if (settings.autoApproveLimit !== undefined) {
      if (typeof settings.autoApproveLimit !== 'number' || settings.autoApproveLimit < 0) {
        errors.push('Auto approve limit must be a positive number');
      }
    }
    
    if (settings.approvalFlow !== undefined) {
      if (!Array.isArray(settings.approvalFlow)) {
        errors.push('Approval flow must be an array');
      } else {
        const validRoles = ['manager', 'finance', 'admin'];
        settings.approvalFlow.forEach(role => {
          if (!validRoles.includes(role)) {
            errors.push(`Invalid role in approval flow: ${role}. Must be one of: ${validRoles.join(', ')}`);
          }
        });
      }
    }
    
    if (settings.approvalPercentage !== undefined) {
      if (typeof settings.approvalPercentage !== 'number' || 
          settings.approvalPercentage < 1 || 
          settings.approvalPercentage > 100) {
        errors.push('Approval percentage must be between 1 and 100');
      }
    }
    
    if (settings.reminderSchedule !== undefined) {
      if (typeof settings.reminderSchedule !== 'number' || 
          settings.reminderSchedule < 1 || 
          settings.reminderSchedule > 168) {
        errors.push('Reminder schedule must be between 1 and 168 hours');
      }
    }
    
    if (settings.categories !== undefined) {
      if (!Array.isArray(settings.categories)) {
        errors.push('Categories must be an array');
      } else {
        const validCategories = ['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'];
        settings.categories.forEach(category => {
          if (!validCategories.includes(category)) {
            errors.push(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate analytics query parameters
  static validateAnalyticsQuery(query) {
    const errors = [];
    
    if (query.period && !['7d', '30d', '90d', '1y'].includes(query.period)) {
      errors.push('Period must be one of: 7d, 30d, 90d, 1y');
    }
    
    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      if (isNaN(dateFrom.getTime())) {
        errors.push('Invalid dateFrom format');
      }
    }
    
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      if (isNaN(dateTo.getTime())) {
        errors.push('Invalid dateTo format');
      }
    }
    
    if (query.dateFrom && query.dateTo) {
      const dateFrom = new Date(query.dateFrom);
      const dateTo = new Date(query.dateTo);
      
      if (dateFrom > dateTo) {
        errors.push('dateFrom cannot be after dateTo');
      }
      
      // Maximum 1 year range
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (dateTo - dateFrom > oneYearMs) {
        errors.push('Date range cannot exceed 1 year');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate pagination parameters
  static validatePagination(query) {
    const errors = [];
    
    if (query.page && (!Number.isInteger(Number(query.page)) || Number(query.page) < 1)) {
      errors.push('Page must be a positive integer');
    }
    
    if (query.limit && (!Number.isInteger(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
      errors.push('Limit must be an integer between 1 and 100');
    }
    
    const validSortOrders = ['asc', 'desc'];
    if (query.sortOrder && !validSortOrders.includes(query.sortOrder.toLowerCase())) {
      errors.push('Sort order must be either "asc" or "desc"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize search query
  static sanitizeSearchQuery(query) {
    if (typeof query !== 'string') return '';
    
    // Remove potentially dangerous characters
    return query
      .replace(/[<>]/g, '')
      .replace(/script/gi, '')
      .trim()
      .substring(0, 100); // Limit length
  }

  // Validate email configuration
  static validateEmailConfig(config) {
    const errors = [];
    
    if (config.provider === 'sendgrid' && !config.apiKey) {
      errors.push('SendGrid API key is required');
    }
    
    if (config.provider === 'smtp') {
      if (!config.host) errors.push('SMTP host is required');
      if (!config.port) errors.push('SMTP port is required');
      if (!config.user) errors.push('SMTP user is required');
      if (!config.pass) errors.push('SMTP password is required');
    }
    
    if (!config.from) {
      errors.push('From email address is required');
    } else if (!this.isValidEmail(config.from)) {
      errors.push('From email address is invalid');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method for email validation
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = Validators;