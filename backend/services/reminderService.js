const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const { addEmailToQueue, JOB_TYPES } = require('../jobs/emailQueue');

class ReminderService {
  constructor() {
    this.reminderIntervals = new Map(); // companyId -> hours
  }

  async initializeCompanySettings() {
    try {
      const companies = await Company.find({});
      companies.forEach(company => {
        this.reminderIntervals.set(
          company._id.toString(), 
          company.settings?.reminderSchedule || 24
        );
      });
      logger.info(`Initialized reminder settings for ${companies.length} companies`);
    } catch (error) {
      logger.error('Error initializing company reminder settings:', error);
    }
  }

  async sendReminders() {
    try {
      logger.info('Starting reminder service...');
      
      const companies = await Company.find({ isActive: true });
      let totalRemindersSent = 0;
      
      for (const company of companies) {
        const remindersSent = await this.sendCompanyReminders(company);
        totalRemindersSent += remindersSent;
      }

      logger.info(`Reminder service completed. Sent ${totalRemindersSent} reminders across ${companies.length} companies`);
      return totalRemindersSent;
    } catch (error) {
      logger.error('Reminder service error:', error);
      throw error;
    }
  }

  async sendCompanyReminders(company) {
    const reminderHours = this.reminderIntervals.get(company._id.toString()) || 24;
    const reminderThreshold = new Date(Date.now() - reminderHours * 60 * 60 * 1000);
    
    // Find pending expenses older than reminder threshold
    const pendingExpenses = await Expense.find({
      companyId: company._id,
      status: 'pending',
      createdAt: { $lt: reminderThreshold },
      'approvalFlow.status': 'pending'
    })
      .populate('userId', 'name email')
      .populate('approvalFlow.approverId', 'name email settings');

    let remindersSent = 0;

    for (const expense of pendingExpenses) {
      const sentForExpense = await this.sendExpenseReminders(expense, company);
      remindersSent += sentForExpense;
    }

    logger.info(`Sent ${remindersSent} reminders for company ${company.name}`);
    return remindersSent;
  }

  async sendExpenseReminders(expense, company) {
    const pendingApprovals = expense.approvalFlow.filter(
      flow => flow.status === 'pending'
    );

    let remindersSent = 0;

    for (const approval of pendingApprovals) {
      const approver = await User.findById(approval.approverId);
      
      if (approver && approver.isActive) {
        try {
          // Check if we already sent a reminder recently (last 12 hours)
          const lastReminder = await this.getLastReminder(expense._id, approver._id);
          
          if (lastReminder && this.isRecentReminder(lastReminder)) {
            logger.debug(`Skipping reminder for ${approver.email} - recent reminder exists`);
            continue;
          }

          // Check approver notification settings
          if (approver.settings?.emailNotifications !== false) {
            await this.sendEmailReminder(expense, approver);
          }

          if (approver.settings?.pushNotifications !== false) {
            await this.sendInAppReminder(expense, approver);
          }

          await this.logReminderSent(expense, approver);
          remindersSent++;

          logger.info(`Sent reminder for expense ${expense._id} to ${approver.email}`);

        } catch (error) {
          logger.error(`Failed to send reminder to ${approver.email}:`, error);
        }
      }
    }

    return remindersSent;
  }

  async getLastReminder(expenseId, approverId) {
    const EmailLog = require('../models/EmailLog');
    
    return await EmailLog.findOne({
      'metadata.expenseId': expenseId.toString(),
      'metadata.approverId': approverId.toString(),
      type: JOB_TYPES.REMINDER,
      status: 'sent'
    }).sort({ createdAt: -1 });
  }

  isRecentReminder(lastReminder) {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    return lastReminder.createdAt > twelveHoursAgo;
  }

  async sendEmailReminder(expense, approver) {
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
  }

  async sendInAppReminder(expense, approver) {
    await notificationService.sendReminderNotification(expense, approver);
  }

  async logReminderSent(expense, approver) {
    // Add to expense audit log
    expense.auditLog.push({
      action: 'reminder_sent',
      performedBy: null, // System action
      comment: `Reminder sent to ${approver.name}`,
      timestamp: new Date()
    });
    await expense.save();

    // Log to system audit log
    const AuditLog = require('../models/AuditLog');
    await AuditLog.logAction({
      action: 'approval_reminder_sent',
      performedBy: null,
      resourceType: 'expense',
      resourceId: expense._id,
      description: `Reminder sent for expense "${expense.title}" to ${approver.name}`,
      severity: 'low',
      metadata: {
        expenseId: expense._id.toString(),
        approverId: approver._id.toString(),
        approverEmail: approver.email
      }
    });
  }

  async sendCustomReminder(expenseId, approverId) {
    try {
      const expense = await Expense.findById(expenseId)
        .populate('userId', 'name email')
        .populate('approvalFlow.approverId', 'name email settings');
      
      const approver = await User.findById(approverId);
      
      if (!expense || !approver) {
        throw new Error('Expense or approver not found');
      }

      // Verify the approver is actually assigned to this expense
      const isAssigned = expense.approvalFlow.some(
        flow => flow.approverId.equals(approverId) && flow.status === 'pending'
      );

      if (!isAssigned) {
        throw new Error('Approver is not assigned to this expense or already processed it');
      }

      // Send immediate reminder
      if (approver.settings?.emailNotifications !== false) {
        await this.sendEmailReminder(expense, approver);
      }

      if (approver.settings?.pushNotifications !== false) {
        await this.sendInAppReminder(expense, approver);
      }

      await this.logReminderSent(expense, approver);

      logger.info(`Sent custom reminder for expense ${expenseId} to ${approver.email}`);

      return { 
        success: true, 
        message: 'Reminder sent successfully',
        expenseTitle: expense.title,
        approverName: approver.name
      };
    } catch (error) {
      logger.error('Custom reminder error:', error);
      throw error;
    }
  }

  async updateCompanyReminderSettings(companyId, reminderHours) {
    this.reminderIntervals.set(companyId, reminderHours);
    
    logger.info(`Updated reminder settings for company ${companyId}: ${reminderHours}h`);
    
    // Update company document
    await Company.findByIdAndUpdate(companyId, {
      $set: {
        'settings.reminderSchedule': reminderHours
      }
    });
  }

  async getReminderStats(companyId = null) {
    try {
      const matchStage = companyId ? { companyId } : {};
      
      const stats = await Expense.aggregate([
        {
          $match: {
            ...matchStage,
            status: 'pending',
            'auditLog.action': 'reminder_sent'
          }
        },
        {
          $unwind: '$auditLog'
        },
        {
          $match: {
            'auditLog.action': 'reminder_sent'
          }
        },
        {
          $group: {
            _id: {
              companyId: '$companyId',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$auditLog.timestamp'
                }
              }
            },
            remindersSent: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': -1 }
        },
        {
          $limit: 30
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting reminder stats:', error);
      throw error;
    }
  }

  async getPendingReminders(companyId = null) {
    try {
      const companies = companyId 
        ? await Company.find({ _id: companyId, isActive: true })
        : await Company.find({ isActive: true });

      let totalPending = 0;
      const companyStats = [];

      for (const company of companies) {
        const reminderHours = this.reminderIntervals.get(company._id.toString()) || 24;
        const reminderThreshold = new Date(Date.now() - reminderHours * 60 * 60 * 1000);
        
        const pendingCount = await Expense.countDocuments({
          companyId: company._id,
          status: 'pending',
          createdAt: { $lt: reminderThreshold },
          'approvalFlow.status': 'pending'
        });

        totalPending += pendingCount;
        companyStats.push({
          companyId: company._id,
          companyName: company.name,
          pendingReminders: pendingCount,
          reminderInterval: reminderHours
        });
      }

      return {
        totalPending,
        companyStats
      };
    } catch (error) {
      logger.error('Error getting pending reminders:', error);
      throw error;
    }
  }
}

module.exports = new ReminderService();