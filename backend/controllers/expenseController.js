const Expense = require('../models/Expense');
const Company = require('../models/Company');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const currencyService = require('../services/currencyService');
const approvalService = require('../services/approvalService');
const notificationService = require('../services/notificationService');
const { addEmailToQueue, JOB_TYPES } = require('../jobs/emailQueue');
const ocrService = require('../services/ocrService');
const logger = require('../utils/logger');

class ExpenseController {
  // Get all expenses for current user
  async getUserExpenses(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        category, 
        dateFrom, 
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = { userId: req.user.id };
      
      // Apply filters
      if (status && status !== 'all') query.status = status;
      if (category && category !== 'all') query.category = category;
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = new Date(dateFrom);
        if (dateTo) query.date.$lte = new Date(dateTo);
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const expenses = await Expense.find(query)
        .populate('userId', 'name email department')
        .populate('approvalFlow.approverId', 'name email role')
        .populate('auditLog.performedBy', 'name email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Expense.countDocuments(query);

      res.json({
        success: true,
        expenses,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get user expenses error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch expenses' 
      });
    }
  }

  // Get expenses awaiting approval
  async getPendingApprovals(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const expenses = await Expense.find({
        'approvalFlow.approverId': req.user.id,
        'approvalFlow.status': 'pending',
        status: 'pending'
      })
        .populate('userId', 'name email department')
        .populate('approvalFlow.approverId', 'name email role')
        .populate('auditLog.performedBy', 'name email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Expense.countDocuments({
        'approvalFlow.approverId': req.user.id,
        'approvalFlow.status': 'pending',
        status: 'pending'
      });

      res.json({
        success: true,
        expenses,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get pending approvals error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch pending approvals' 
      });
    }
  }

  // Get single expense
  async getExpense(req, res) {
    try {
      const expense = await Expense.findOne({
        _id: req.params.id,
        $or: [
          { userId: req.user.id },
          { 'approvalFlow.approverId': req.user.id },
          { companyId: req.user.companyId, 'userId.role': 'admin' } // Admin can view all company expenses
        ]
      })
        .populate('userId', 'name email department position')
        .populate('approvalFlow.approverId', 'name email role department')
        .populate('auditLog.performedBy', 'name email role');

      if (!expense) {
        return res.status(404).json({ 
          success: false, 
          message: 'Expense not found or access denied' 
        });
      }

      // Check if user can view this expense
      const canView = 
        expense.userId._id.toString() === req.user.id ||
        expense.approvalFlow.some(flow => 
          flow.approverId._id.toString() === req.user.id
        ) ||
        req.user.role === 'admin';

      if (!canView) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied to this expense' 
        });
      }

      res.json({
        success: true,
        expense
      });
    } catch (error) {
      logger.error('Get expense error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch expense' 
      });
    }
  }

  // Create new expense
  async createExpense(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { 
        title, 
        amount, 
        currency, 
        category, 
        date, 
        description, 
        merchant,
        tags,
        receipt 
      } = req.body;

      // Get company to determine base currency
      const company = await Company.findById(req.user.companyId);
      if (!company) {
        return res.status(400).json({ 
          success: false, 
          message: 'Company not found' 
        });
      }

      // Convert amount to company currency
      let convertedAmount = amount;
      let exchangeRate = 1;

      if (currency !== company.currency) {
        try {
          convertedAmount = await currencyService.convertToCompanyCurrency(
            amount, 
            currency, 
            company.currency
          );
          exchangeRate = convertedAmount / amount;
        } catch (error) {
          logger.warn('Currency conversion failed, using original amount:', error);
          // Continue with original amount if conversion fails
        }
      }

      // Check if receipt is required
      const isReceiptRequired = company.settings.requireReceipt && 
        amount >= (company.settings.receiptRequiredAmount || 25);

      if (isReceiptRequired && !receipt) {
        return res.status(400).json({ 
          success: false, 
          message: 'Receipt is required for this amount' 
        });
      }

      // Create expense
      const expenseData = {
        title,
        amount,
        currency,
        convertedAmount,
        exchangeRate,
        category,
        date: new Date(date),
        description,
        merchant: merchant ? { name: merchant } : undefined,
        tags,
        receipt,
        userId: req.user.id,
        companyId: req.user.companyId,
        isReceiptRequired,
        receiptVerified: !!receipt
      };

      const expense = new Expense(expenseData);

      // Initialize approval flow
      const approvalResult = await approvalService.initializeApprovalFlow(expense, company);
      expense.status = approvalResult.status;
      expense.approvalFlow = approvalResult.approvalFlow;

      await expense.save();
      
      // Populate for response
      await expense.populate('userId', 'name email department');
      await expense.populate('approvalFlow.approverId', 'name email role');

      // Add to audit log
      expense.auditLog.push({
        action: 'submitted',
        performedBy: req.user.id,
        comment: 'Expense submitted for approval',
        timestamp: new Date()
      });
      await expense.save();

      // Log the expense creation
      await require('../models/AuditLog').logAction({
        action: 'expense_created',
        performedBy: req.user.id,
        resourceType: 'expense',
        resourceId: expense._id,
        description: `Expense "${expense.title}" submitted for ${expense.amount} ${expense.currency}`,
        severity: 'medium',
        metadata: {
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category
        }
      });

      // Handle notifications and emails based on status
      if (expense.status === 'pending') {
        const approvers = await approvalService.getNextApprovers(expense, company);
        
        // Send in-app notifications
        await notificationService.sendExpenseSubmittedNotifications(expense, approvers);
        
        // Send emails via queue
        await addEmailToQueue(JOB_TYPES.EXPENSE_SUBMITTED, {
          expense: {
            _id: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            date: expense.date,
            category: expense.category,
            userId: {
              name: expense.userId.name,
              email: expense.userId.email
            }
          },
          approvers: approvers.map(a => ({
            _id: a._id,
            name: a.name,
            email: a.email,
            role: a.role
          }))
        });

        logger.info(`Expense submitted and sent to ${approvers.length} approvers`);
      } else {
        // Auto-approved
        await notificationService.sendExpenseStatusNotification(expense, 'approved');
        await addEmailToQueue(JOB_TYPES.EXPENSE_STATUS_CHANGED, {
          expense: {
            _id: expense._id,
            title: expense.title,
            amount: expense.amount,
            currency: expense.currency,
            userId: {
              name: expense.userId.name,
              email: expense.userId.email
            }
          },
          action: 'approved',
          comment: 'Auto-approved (below threshold)'
        });

        logger.info(`Expense auto-approved: ${expense.title}`);
      }

      res.status(201).json({
        success: true,
        message: expense.status === 'approved' ? 
          'Expense submitted and auto-approved' : 
          'Expense submitted for approval',
        expense
      });

    } catch (error) {
      logger.error('Create expense error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to submit expense' 
      });
    }
  }

  // Update expense
  async updateExpense(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const expense = await Expense.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!expense) {
        return res.status(404).json({ 
          success: false, 
          message: 'Expense not found' 
        });
      }

      if (!expense.canEdit()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Expense cannot be edited in its current status' 
        });
      }

      const updates = req.body;
      const previousState = { ...expense.toObject() };

      // Update fields
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== '_id' && key !== 'userId' && key !== 'companyId') {
          expense[key] = updates[key];
        }
      });

      // Recalculate converted amount if amount or currency changed
      if (updates.amount || updates.currency) {
        const company = await Company.findById(req.user.companyId);
        if (company && (expense.currency !== company.currency)) {
          try {
            expense.convertedAmount = await currencyService.convertToCompanyCurrency(
              expense.amount, 
              expense.currency, 
              company.currency
            );
          } catch (error) {
            logger.warn('Currency conversion failed during update:', error);
          }
        }
      }

      await expense.save();
      await expense.populate('userId', 'name email department');
      await expense.populate('approvalFlow.approverId', 'name email role');

      // Add to audit log
      expense.auditLog.push({
        action: 'edited',
        performedBy: req.user.id,
        comment: 'Expense details updated',
        timestamp: new Date(),
        previousState,
        newState: expense.toObject()
      });
      await expense.save();

      // Log the update
      await require('../models/AuditLog').logAction({
        action: 'expense_updated',
        performedBy: req.user.id,
        resourceType: 'expense',
        resourceId: expense._id,
        description: `Expense "${expense.title}" updated`,
        severity: 'medium'
      });

      res.json({
        success: true,
        message: 'Expense updated successfully',
        expense
      });

    } catch (error) {
      logger.error('Update expense error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update expense' 
      });
    }
  }

  // Approve/Reject expense
  async processApproval(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { action, comment } = req.body;
      const expenseId = req.params.id;

      const expense = await Expense.findOne({
        _id: expenseId,
        'approvalFlow.approverId': req.user.id,
        'approvalFlow.status': 'pending'
      }).populate('userId', 'name email');

      if (!expense) {
        return res.status(404).json({ 
          success: false, 
          message: 'Expense not found or already processed' 
        });
      }

      // Process approval
      const previousState = { ...expense.toObject() };
      const updatedExpense = await approvalService.processApproval(
        expense, 
        req.user.id, 
        action === 'approve' ? 'approved' : 'rejected',
        comment
      );

      await updatedExpense.populate('userId', 'name email');
      await updatedExpense.populate('approvalFlow.approverId', 'name email role');

      // Log the approval action
      await require('../models/AuditLog').logAction({
        action: action === 'approve' ? 'expense_approved' : 'expense_rejected',
        performedBy: req.user.id,
        resourceType: 'expense',
        resourceId: expense._id,
        description: `Expense "${expense.title}" ${action}ed by ${req.user.name}`,
        severity: 'medium',
        metadata: {
          action,
          comment,
          previousStatus: previousState.status,
          newStatus: updatedExpense.status
        }
      });

      // Send notifications
      await notificationService.sendExpenseStatusNotification(updatedExpense, action);
      await addEmailToQueue(JOB_TYPES.EXPENSE_STATUS_CHANGED, {
        expense: {
          _id: updatedExpense._id,
          title: updatedExpense.title,
          amount: updatedExpense.amount,
          currency: updatedExpense.currency,
          userId: {
            name: updatedExpense.userId.name,
            email: updatedExpense.userId.email
          }
        },
        action,
        comment
      });

      logger.info(`Expense ${action}ed: ${updatedExpense.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: `Expense ${action}d successfully`,
        expense: updatedExpense
      });

    } catch (error) {
      logger.error('Process approval error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process approval' 
      });
    }
  }

  // Process receipt OCR
  async processReceiptOCR(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      const result = await ocrService.processReceipt(req.file.buffer);

      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to process receipt image' 
        });
      }

      res.json({
        success: true,
        data: result.data,
        confidence: result.confidence,
        message: 'Receipt processed successfully'
      });

    } catch (error) {
      logger.error('OCR processing error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process receipt' 
      });
    }
  }

  // Delete expense (soft delete)
  async deleteExpense(req, res) {
    try {
      const expense = await Expense.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!expense) {
        return res.status(404).json({ 
          success: false, 
          message: 'Expense not found' 
        });
      }

      if (!['draft', 'pending'].includes(expense.status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Only draft or pending expenses can be deleted' 
        });
      }

      // Store expense data for audit log before deletion
      const expenseData = expense.toObject();

      await Expense.findByIdAndDelete(req.params.id);

      // Log the deletion
      await require('../models/AuditLog').logAction({
        action: 'expense_deleted',
        performedBy: req.user.id,
        resourceType: 'expense',
        resourceId: req.params.id,
        description: `Expense "${expenseData.title}" deleted`,
        severity: 'medium',
        metadata: {
          title: expenseData.title,
          amount: expenseData.amount,
          currency: expenseData.currency,
          status: expenseData.status
        }
      });

      logger.info(`Expense deleted: ${expenseData.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });

    } catch (error) {
      logger.error('Delete expense error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete expense' 
      });
    }
  }
}

module.exports = new ExpenseController();