const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      // Don't log the entire stack trace in console for readability
      const cleanMeta = { ...meta };
      delete cleanMeta.stack;
      if (Object.keys(cleanMeta).length > 0) {
        log += ` ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    
    return log;
  })
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'expense-management-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Write audit logs to separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Audit logging function
logger.audit = (action, user, resource, details = {}) => {
  logger.info('AUDIT', {
    action,
    userId: user?._id || user?.id,
    userEmail: user?.email,
    resourceType: resource?.constructor?.modelName || typeof resource,
    resourceId: resource?._id || resource?.id,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Security logging function
logger.security = (event, user, details = {}) => {
  logger.warn('SECURITY', {
    event,
    userId: user?._id || user?.id,
    userEmail: user?.email,
    ip: details.ip,
    userAgent: details.userAgent,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Performance logging function
logger.performance = (operation, duration, details = {}) => {
  logger.info('PERFORMANCE', {
    operation,
    duration: `${duration}ms`,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Database query logging
logger.dbQuery = (operation, collection, duration, filter = {}) => {
  // Don't log sensitive filter fields
  const sanitizedFilter = { ...filter };
  delete sanitizedFilter.password;
  delete sanitizedFilter.token;
  
  logger.debug('DB_QUERY', {
    operation,
    collection,
    duration: `${duration}ms`,
    filter: sanitizedFilter,
    timestamp: new Date().toISOString()
  });
};

// Email logging
logger.email = (action, to, subject, details = {}) => {
  logger.info('EMAIL', {
    action,
    to,
    subject,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Error logging with context
logger.errorWithContext = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    },
    ...context,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;