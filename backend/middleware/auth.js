const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('companyId');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Check if company is active
    if (!user.companyId.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Company account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed.' 
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.email} with role ${req.user.role}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

// Check if user can manage expenses (admin, manager, or own expenses)
const canManageExpenses = (req, res, next) => {
  const allowedRoles = ['admin', 'manager'];
  
  if (allowedRoles.includes(req.user.role) || req.params.userId === req.user.id) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Cannot manage other users expenses.' 
  });
};

// Check if user can approve expenses
const canApproveExpenses = (req, res, next) => {
  const allowedRoles = ['admin', 'manager'];
  
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Approval permissions required.' 
  });
};

// Check if user can manage users (admin only)
const canManageUsers = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. User management permissions required.' 
  });
};

// Check if user can manage company settings (admin only)
const canManageCompany = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Company management permissions required.' 
  });
};

// Check if user can view analytics
const canViewAnalytics = (req, res, next) => {
  const allowedRoles = ['admin', 'manager'];
  
  if (allowedRoles.includes(req.user.role)) {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    message: 'Access denied. Analytics view permissions required.' 
  });
};

module.exports = {
  auth,
  requireRole,
  canManageExpenses,
  canApproveExpenses,
  canManageUsers,
  canManageCompany,
  canViewAnalytics
};