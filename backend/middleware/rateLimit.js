const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Use memory store only
logger.info('Using memory store for rate limiting');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.'
  },
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Email: ${req.body.email}`);
    res.status(options.statusCode).json(options.message);
  }
});

// Expense submission rate limiter
const expenseSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
  message: {
    success: false,
    message: 'Too many expense submissions, please slow down.'
  }
});

// File upload rate limiter
const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user.id,
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  }
});

// Analytics endpoint rate limiter
const analyticsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user.id,
  message: {
    success: false,
    message: 'Too many analytics requests, please slow down.'
  }
});

// Admin endpoints rate limiter
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user.id,
  message: {
    success: false,
    message: 'Too many admin requests, please slow down.'
  }
});

// IP-based blocking for suspicious activity
const suspiciousActivityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  skip: (req) => {
    return req.user && req.user.isActive;
  },
  message: {
    success: false,
    message: 'Suspicious activity detected from this IP. Access temporarily restricted.'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  expenseSubmissionLimiter,
  fileUploadLimiter,
  analyticsLimiter,
  adminLimiter,
  suspiciousActivityLimiter
};