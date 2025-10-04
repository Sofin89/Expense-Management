const crypto = require('crypto');
const logger = require('./logger');

class Helpers {
  // Generate random string
  static generateRandomString(length = 10) {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  // Generate unique ID
  static generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }

  // Format currency
  static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      logger.warn('Currency formatting failed, using fallback', { amount, currency, error: error.message });
      // Fallback formatting
      const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CAD: 'C$',
        AUD: 'A$'
      };
      const symbol = symbols[currency] || currency;
      return `${symbol}${parseFloat(amount).toFixed(2)}`;
    }
  }

  // Format date
  static formatDate(date, format = 'standard') {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const formats = {
      standard: dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      full: dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      iso: dateObj.toISOString().split('T')[0],
      datetime: dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    return formats[format] || formats.standard;
  }

  // Calculate relative time (e.g., "2 hours ago")
  static getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatDate(date);
  }

  // Truncate text
  static truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  // Sanitize HTML
  static sanitizeHtml(html) {
    if (!html) return '';
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate URL
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Deep clone object
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  // Merge objects deeply
  static deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  // Check if value is an object
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // Convert object to query string
  static objectToQueryString(obj) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    }
    
    return params.toString();
  }

  // Parse query string to object
  static queryStringToObject(queryString) {
    const params = new URLSearchParams(queryString);
    const obj = {};
    
    for (const [key, value] of params) {
      obj[key] = value;
    }
    
    return obj;
  }

  // Generate pagination metadata
  static generatePagination(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    };
  }

  // Calculate percentage
  static calculatePercentage(part, total) {
    if (total === 0) return 0;
    return Math.round((part / total) * 100 * 100) / 100;
  }

  // Sleep/delay function
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Retry function with exponential backoff
  static async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Operation failed, retrying in ${delay}ms`, { 
          attempt: attempt + 1, 
          maxRetries,
          error: error.message 
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Validate file type
  static isValidFileType(filename, allowedTypes) {
    const extension = filename.toLowerCase().split('.').pop();
    return allowedTypes.includes(extension);
  }

  // Get file extension
  static getFileExtension(filename) {
    return filename.toLowerCase().split('.').pop();
  }

  // Format file size
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate color from string (for avatars, etc.)
  static stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  }

  // Get initials from name
  static getInitials(name) {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  // Check if value is empty
  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  // Capitalize first letter
  static capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Convert snake_case to camelCase
  static snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  // Convert camelCase to snake_case
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Generate secure random number
  static generateSecureRandom(min, max) {
    const range = max - min + 1;
    const bytes = crypto.randomBytes(4);
    const random = bytes.readUInt32BE(0);
    return min + (random % range);
  }

  // Mask sensitive data
  static maskSensitiveData(data, fields = ['password', 'token', 'authorization']) {
    if (typeof data !== 'object' || data === null) return data;
    
    const masked = { ...data };
    
    fields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***';
      }
    });
    
    return masked;
  }

  // Validate password strength
  static validatePasswordStrength(password) {
    const requirements = {
      minLength: 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const errors = [];
    
    if (password.length < requirements.minLength) {
      errors.push(`Password must be at least ${requirements.minLength} characters long`);
    }
    if (!requirements.hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!requirements.hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!requirements.hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: this.calculatePasswordScore(password)
    };
  }

  // Calculate password strength score
  static calculatePasswordScore(password) {
    let score = 0;
    
    // Length
    if (password.length >= 8) score += 2;
    if (password.length >= 12) score += 2;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 2;
    
    return Math.min(score, 8); // Max score 8
  }
}

module.exports = Helpers;