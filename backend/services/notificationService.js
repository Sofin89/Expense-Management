const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class NotificationService {
  async sendExpenseSubmittedNotifications(expense, approvers) {
    try {
      const notificationPromises = approvers.map(approver => 
        Notification.create({
          userId: approver._id,
          type: 'approval_required',
          title: 'New Expense Approval Required',
          body: `${expense.userId.name} submitted "${expense.title}" for ${expense.amount} ${expense.currency}`,
          link: `/expenses/${expense._id}`,
          actionRequired: true,
          priority: 'high',
          metadata: {
            expenseId: expense._id.toString(),
            submitterName: expense.userId.name,
            amount: expense.amount,
            currency: expense.currency,
            category: expense.category
          }
        })
      );

      const notifications = await Promise.all(notificationPromises);
      
      // Emit real-time notifications via Socket.IO
      approvers.forEach(approver => {
        if (global.sendNotification) {
          global.sendNotification(approver._id.toString(), {
            type: 'approval_required',
            title: 'New Expense Approval Required',
            body: `${expense.userId.name} submitted a new expense`,
            link: `/expenses/${expense._id}`,
            priority: 'high',
            timestamp: new Date().toISOString()
          });
        }
      });

      logger.info(`Sent ${notifications.length} expense submission notifications for expense ${expense._id}`);
      return notifications;
    } catch (error) {
      logger.error('Error sending expense submission notifications:', error);
      throw error;
    }
  }

  async sendExpenseStatusNotification(expense, action) {
    try {
      const actionText = action.charAt(0).toUpperCase() + action.slice(1);
      const priority = action === 'rejected' ? 'high' : 'medium';
      
      const notification = await Notification.create({
        userId: expense.userId,
        type: `expense_${action}`,
        title: `Expense ${actionText}`,
        body: `Your expense "${expense.title}" has been ${action}`,
        link: `/expenses/${expense._id}`,
        priority,
        metadata: {
          expenseId: expense._id.toString(),
          action: action,
          amount: expense.amount,
          currency: expense.currency,
          title: expense.title
        }
      });

      // Emit real-time notification
      if (global.sendNotification) {
        global.sendNotification(expense.userId.toString(), {
          type: `expense_${action}`,
          title: `Expense ${actionText}`,
          body: `Your expense "${expense.title}" has been ${action}`,
          link: `/expenses/${expense._id}`,
          priority,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Sent expense ${action} notification to user ${expense.userId} for expense ${expense._id}`);
      return notification;
    } catch (error) {
      logger.error('Error sending expense status notification:', error);
      throw error;
    }
  }

  async sendReminderNotification(expense, approver) {
    try {
      const daysPending = Math.floor((Date.now() - new Date(expense.createdAt)) / (1000 * 60 * 60 * 24));
      const priority = daysPending > 3 ? 'high' : 'medium';
      
      const notification = await Notification.create({
        userId: approver._id,
        type: 'reminder',
        title: 'Approval Reminder',
        body: `Reminder: Expense "${expense.title}" from ${expense.userId.name} is awaiting your approval for ${daysPending} day(s)`,
        link: `/expenses/${expense._id}`,
        actionRequired: true,
        priority,
        metadata: {
          expenseId: expense._id.toString(),
          submitterName: expense.userId.name,
          daysPending: daysPending,
          amount: expense.amount,
          currency: expense.currency
        }
      });

      // Emit real-time notification
      if (global.sendNotification) {
        global.sendNotification(approver._id.toString(), {
          type: 'reminder',
          title: 'Approval Reminder',
          body: `Expense "${expense.title}" is awaiting your approval`,
          link: `/expenses/${expense._id}`,
          priority,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Sent reminder notification to approver ${approver._id} for expense ${expense._id}`);
      return notification;
    } catch (error) {
      logger.error('Error sending reminder notification:', error);
      throw error;
    }
  }

  async sendSystemNotification(userId, title, body, metadata = {}) {
    try {
      const notification = await Notification.create({
        userId,
        type: 'system_alert',
        title,
        body,
        priority: metadata.priority || 'medium',
        metadata
      });

      // Emit real-time notification
      if (global.sendNotification) {
        global.sendNotification(userId.toString(), {
          type: 'system_alert',
          title,
          body,
          priority: metadata.priority || 'medium',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Sent system notification to user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error sending system notification:', error);
      throw error;
    }
  }

  async sendWelcomeNotification(userId, companyName) {
    try {
      const notification = await Notification.create({
        userId,
        type: 'welcome',
        title: `Welcome to ${companyName}!`,
        body: `Your account has been created successfully. You can now start submitting expenses.`,
        link: '/dashboard',
        priority: 'low',
        metadata: {
          companyName,
          welcome: true
        }
      });

      // Emit real-time notification
      if (global.sendNotification) {
        global.sendNotification(userId.toString(), {
          type: 'welcome',
          title: `Welcome to ${companyName}!`,
          body: 'Your account has been created successfully',
          link: '/dashboard',
          priority: 'low',
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Sent welcome notification to user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error sending welcome notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { 
          read: true,
          readAt: new Date()
        },
        { new: true }
      );

      if (!notification) {
        throw new Error('Notification not found or access denied');
      }

      logger.info(`Marked notification ${notificationId} as read for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { 
          read: true,
          readAt: new Date()
        }
      );

      // Emit real-time update
      if (global.sendNotification) {
        global.sendNotification(userId.toString(), {
          type: 'all_read',
          title: 'All notifications marked as read',
          body: `${result.modifiedCount} notifications marked as read`,
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        read = null,
        type = null,
        priority = null
      } = options;

      const query = { userId };
      
      if (read !== null) query.read = read;
      if (type) query.type = type;
      if (priority) query.priority = priority;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      return notifications;
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false,
        expiresAt: { $gt: new Date() }
      });

      return count;
    } catch (error) {
      logger.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      logger.info(`Cleaned up ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        {
          $match: { userId }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
            }
          }
        }
      ]);

      const total = await Notification.countDocuments({ userId });
      const unreadTotal = await Notification.countDocuments({ 
        userId, 
        read: false 
      });

      return {
        total,
        unreadTotal,
        byType: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            unread: stat.unread
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Error fetching notification stats:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();