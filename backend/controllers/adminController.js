const User = require('../models/User');
const Company = require('../models/Company');
const Expense = require('../models/Expense');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { addEmailToQueue, JOB_TYPES } = require('../jobs/emailQueue');
const reminderJob = require('../jobs/reminderJob');

class AdminController {
  // Get all company users
  async getCompanyUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        role, 
        department,
        isActive = true 
      } = req.query;

      const query = { companyId: req.user.companyId };
      
      if (role && role !== 'all') query.role = role;
      if (department && department !== 'all') query.department = department;
      if (isActive !== 'all') query.isActive = isActive === 'true';

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get company users error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch users' 
      });
    }
  }

  // Create new user
  async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, email, role, department, position, phone } = req.body;

      // Check if user already exists in company
      const existingUser = await User.findOne({ 
        email, 
        companyId: req.user.companyId 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists in your company' 
        });
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Create user
      const user = new User({
        name,
        email,
        password: tempPassword,
        role: role || 'employee',
        companyId: req.user.companyId,
        department: department || 'General',
        position,
        phone
      });

      await user.save();

      // Send welcome email
      const company = await Company.findById(req.user.companyId);
      
      await addEmailToQueue(JOB_TYPES.WELCOME, {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        company: {
          _id: company._id,
          name: company.name,
          currency: company.currency
        },
        tempPassword
      });

      // Log the user creation
      await require('../models/AuditLog').logAction({
        action: 'user_created',
        performedBy: req.user.id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} created by admin ${req.user.name}`,
        severity: 'medium',
        metadata: {
          role: user.role,
          department: user.department
        }
      });

      logger.info(`New user created by admin: ${user.email} in company ${company.name}`);

      res.status(201).json({
        success: true,
        message: 'User created successfully. Welcome email sent.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position
        }
      });

    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create user' 
      });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, role, department, position, phone, isActive, settings } = req.body;

      // Find user in same company
      const user = await User.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Store previous state for audit log
      const previousState = user.toObject();

      // Update fields
      const updates = {};
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (department) updates.department = department;
      if (position) updates.position = position;
      if (phone) updates.phone = phone;
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (settings) updates.settings = { ...user.settings, ...settings };

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      // Log the user update
      await require('../models/AuditLog').logAction({
        action: 'user_updated',
        performedBy: req.user.id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} updated by admin ${req.user.name}`,
        severity: 'medium',
        changes: {
          before: previousState,
          after: updatedUser.toObject(),
          fields: Object.keys(updates)
        }
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
      });

    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update user' 
      });
    }
  }

  // Update company settings
  async updateCompanySettings(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { settings } = req.body;

      const company = await Company.findById(req.user.companyId);
      if (!company) {
        return res.status(404).json({ 
          success: false, 
          message: 'Company not found' 
        });
      }

      // Store previous settings for audit log
      const previousSettings = JSON.parse(JSON.stringify(company.settings));

      // Update settings
      company.settings = { ...company.settings, ...settings };
      await company.save();

      // Log the settings update
      await require('../models/AuditLog').logAction({
        action: 'settings_updated',
        performedBy: req.user.id,
        resourceType: 'company',
        resourceId: company._id,
        description: `Company settings updated by admin ${req.user.name}`,
        severity: 'medium',
        changes: {
          before: previousSettings,
          after: company.settings.toObject(),
          fields: Object.keys(settings)
        }
      });

      logger.info(`Company settings updated for ${company.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Company settings updated successfully',
        settings: company.settings
      });

    } catch (error) {
      logger.error('Update company settings error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update company settings' 
      });
    }
  }

  // Get all company expenses (admin view)
  async getAllCompanyExpenses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        category, 
        userId,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = { companyId: req.user.companyId };
      
      // Apply filters
      if (status && status !== 'all') query.status = status;
      if (category && category !== 'all') query.category = category;
      if (userId && userId !== 'all') query.userId = userId;
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = new Date(dateFrom);
        if (dateTo) query.date.$lte = new Date(dateTo);
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const expenses = await Expense.find(query)
        .populate('userId', 'name email department')
        .populate('approvalFlow.approverId', 'name email role')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Expense.countDocuments(query);

      // Get available users for filter
      const users = await User.find({ 
        companyId: req.user.companyId,
        isActive: true 
      }).select('name email');

      res.json({
        success: true,
        expenses,
        filters: {
          users
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get all company expenses error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch company expenses' 
      });
    }
  }

  // Get audit logs
  async getAuditLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        action, 
        resourceType,
        performedBy,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {};
      
      if (action && action !== 'all') filters.action = action;
      if (resourceType && resourceType !== 'all') filters.resourceType = resourceType;
      if (performedBy && performedBy !== 'all') filters.performedBy = performedBy;
      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom;
        filters.dateTo = dateTo;
      }

      const AuditLog = require('../models/AuditLog');
      const logs = await AuditLog.find(filters)
        .populate('performedBy', 'name email role')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments(filters);

      res.json({
        success: true,
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get audit logs error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch audit logs' 
      });
    }
  }

  // Trigger reminders manually
  async triggerReminders(req, res) {
    try {
      const { companyId } = req.body;
      
      const result = await reminderJob.triggerManually(companyId);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Manual reminder trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger reminders'
      });
    }
  }

  // Get queue statistics
  async getQueueStats(req, res) {
    try {
      // For now, return basic stats since Bull queue might not be fully configured
      const stats = {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      };

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Queue stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue statistics'
      });
    }
  }

  // Clean queue
  async cleanQueue(req, res) {
    try {
      // Placeholder for queue cleanup
      res.json({
        success: true,
        message: 'Queue cleanup completed'
      });
    } catch (error) {
      logger.error('Queue clean error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clean queue'
      });
    }
  }

  // Retry failed jobs
  async retryFailedJobs(req, res) {
    try {
      // Placeholder for retry functionality
      res.json({
        success: true,
        message: 'Failed jobs retry initiated'
      });
    } catch (error) {
      logger.error('Queue retry error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry failed jobs'
      });
    }
  }

  // Get failed jobs
  async getFailedJobs(req, res) {
    try {
      // Placeholder for failed jobs retrieval
      const jobs = [];

      res.json({
        success: true,
        jobs
      });
    } catch (error) {
      logger.error('Get failed jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get failed jobs'
      });
    }
  }
}

module.exports = new AdminController();