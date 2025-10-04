const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for user information
morgan.token('user', (req) => {
  return req.user ? req.user.email : 'anonymous';
});

morgan.token('company', (req) => {
  return req.user ? req.user.companyId.toString() : 'no-company';
});

morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    // Don't log sensitive information
    const sensitiveFields = ['password', 'token', 'authorization'];
    const body = { ...req.body };
    
    sensitiveFields.forEach(field => {
      if (body[field]) {
        body[field] = '***';
      }
    });
    
    return JSON.stringify(body);
  }
  return '';
});

// Custom format
const format = ':remote-addr - :user[:company] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body';

// Success handler (2xx, 3xx)
const successHandler = morgan(format, {
  skip: (req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) }
});

// Error handler (4xx, 5xx)
const errorHandler = morgan(format, {
  skip: (req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) }
});

// Security logging middleware
const securityLogger = (req, res, next) => {
  // Log security-related events
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/change-password'
  ];

  if (securityEvents.includes(req.path)) {
    logger.info('Security event', {
      event: req.path,
      user: req.user ? req.user.email : 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      user: req.user ? req.user.email : 'anonymous',
      company: req.user ? req.user.companyId.toString() : 'no-company',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Log slow requests
    if (duration > 1000) { // More than 1 second
      logger.warn('Slow request detected', logData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      logger.error('Request error', logData);
    }
  });

  next();
};

module.exports = {
  successHandler,
  errorHandler,
  securityLogger,
  requestLogger
};