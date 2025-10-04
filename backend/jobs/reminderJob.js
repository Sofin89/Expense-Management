const cron = require('node-cron');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { addEmailToQueue, JOB_TYPES } = require('./emailQueue');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class ReminderJob {
  constructor() {
    this.isRunning = false;
    this.reminderIntervals = {}; // companyId -> hours
  }

  async initializeCompanySettings() {
    try {
      const companies = await Company.find({});
      companies.forEach(company => {
        this.reminderIntervals[company._id.toString()] = 
          company.settings?.reminderSchedule || 24;
      });
      logger.info('Initialized company reminder settings');
    } catch (error) {
      logger.error('Error initializing company settings:', error);
    }
  }

  async sendReminders() {
    try {
      logger.info('Starting reminder job...');
      
      const companies = await Company.find({});
      
      for (const company of companies) {
        await this.sendCompanyReminders(company);
      }

      logger.info('Reminder job completed successfully');
    } catch (error) {
      logger.error('Reminder job error:', error);
    }
  }

  async sendCompanyReminders(company) {
    const reminderHours = company.settings?.reminderSchedule || 24;
    const reminderThreshold = new Date(Date.now() - reminderHours * 60 * 60 * 1000);
    
    // Find pending expenses older than reminder threshold
    const pendingExpenses = await Expense.find({
      companyId: company._id,
      status: 'pending',
      createdAt: { $lt: reminderThreshold },
      'approvalFlow.status': 'pending'
    })
      .populate('userId', 'name email')
      .populate('approvalFlow.approverId', 'name email');

    logger.info(`Found ${pendingExpenses.length} pending expenses for ${company.name}`);

    for (const expense of pendingExpenses) {
      await this.sendExpenseReminders(expense, company);
    }
  }

  async sendExpenseReminders(expense, company) {
    const pendingApprovals = expense.approvalFlow.filter(
      flow => flow.status === 'pending'
    );

    for (const approval of pendingApprovals) {
      const approver = await User.findById(approval.approverId);
      
      if (approver && approver.isActive) {
        try {
          // Check if we already sent a reminder recently (last 12 hours)
          const lastReminder = await require('../models/EmailLog').findOne({
            'metadata.expenseId': expense._id.toString(),
            'metadata.approverId': approver._id.toString(),
            type: JOB_TYPES.REMINDER,
            createdAt: { $gt: new Date(Date.now() - 12 * 60 * 60 * 1000) }
          });

          if (lastReminder) {
            logger.info(`Skipping reminder for ${approver.email} - recent reminder exists`);
            continue;
          }

          // Send in-app notification
          await notificationService.sendReminderNotification(expense, approver);
          
          // Send email reminder via queue
          await addEmailToQueue(JOB_TYPES.REMINDER, {
            expense: {
              _id: expense._id,
              title: expense.title,
              amount: expense.amount,
              currency: expense.currency,
              createdAt: expense.createdAt,
              userId: {
                name: expense.userId.name,
                email: expense.userId.email
              }
            },
            approver: {
              _id: approver._id,
              name: approver.name,
              email: approver.email
            }
          });

          logger.info(`Sent reminder for expense ${expense._id} to ${approver.email}`);

          // Add to expense audit log
          expense.auditLog.push({
            action: 'reminder_sent',
            performedBy: null, // System action
            comment: `Reminder sent to ${approver.name}`,
            timestamp: new Date()
          });
          await expense.save();

        } catch (error) {
          logger.error(`Failed to send reminder to ${approver.email}:`, error);
        }
      }
    }
  }

  async sendCustomReminder(expenseId, approverId) {
    try {
      const expense = await Expense.findById(expenseId)
        .populate('userId', 'name email')
        .populate('approvalFlow.approverId', 'name email');
      
      const approver = await User.findById(approverId);
      
      if (!expense || !approver) {
        throw new Error('Expense or approver not found');
      }

      // Send immediate reminder
      await notificationService.sendReminderNotification(expense, approver);
      await addEmailToQueue(JOB_TYPES.REMINDER, {
        expense: {
          _id: expense._id,
          title: expense.title,
          amount: expense.amount,
          currency: expense.currency,
          createdAt: expense.createdAt,
          userId: {
            name: expense.userId.name,
            email: expense.userId.email
          }
        },
        approver: {
          _id: approver._id,
          name: approver.name,
          email: approver.email
        }
      }, { delay: 0 }); // Send immediately

      logger.info(`Sent custom reminder for expense ${expenseId} to ${approver.email}`);

      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      logger.error('Custom reminder error:', error);
      throw error;
    }
  }

  start() {
    if (this.isRunning) return;

    // Initialize company settings
    this.initializeCompanySettings();

    // Run every hour to check for reminders
    cron.schedule('0 * * * *', () => {
      this.sendReminders();
    });

    // Also run at 9 AM daily for primary reminder wave
    cron.schedule('0 9 * * *', () => {
      this.sendReminders();
    });

    this.isRunning = true;
    logger.info('Reminder job scheduler started');
  }

  // Manual trigger for demo purposes
  async triggerManually(companyId = null) {
    try {
      if (companyId) {
        const company = await Company.findById(companyId);
        if (!company) {
          throw new Error('Company not found');
        }
        await this.sendCompanyReminders(company);
        return { 
          success: true, 
          message: `Manual reminders triggered for company ${company.name}` 
        };
      } else {
        await this.sendReminders();
        return { 
          success: true, 
          message: 'Manual reminders triggered for all companies' 
        };
      }
    } catch (error) {
      logger.error('Manual reminder trigger error:', error);
      throw error;
    }
  }

  // Update company reminder settings
  async updateCompanyReminderSettings(companyId, reminderHours) {
    this.reminderIntervals[companyId] = reminderHours;
    logger.info(`Updated reminder settings for company ${companyId}: ${reminderHours}h`);
  }
}

module.exports = new ReminderJob();