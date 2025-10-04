const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class NotificationController {
  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        read, 
        type, 
        priority 
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        read: read === 'true' ? true : read === 'false' ? false : null,
        type,
        priority
      };

      const notifications = await Notification.getUserNotifications(req.user.id, options);
      const unreadCount = await Notification.getUnreadCount(req.user.id);

      res.json({
        success: true,
        notifications,
        pagination: {
          page: options.page,
          limit: options.limit,
          unreadCount
        }
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch notifications' 
      });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!notification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Notification not found' 
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        message: 'Notification marked as read',
        notification
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark notification as read' 
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const result = await Notification.updateMany(
        { userId: req.user.id, read: false },
        { read: true, readAt: new Date() }
      );

      // Emit real-time update
      if (global.sendNotification) {
        global.sendNotification(req.user.id.toString(), {
          type: 'all_read',
          title: 'All notifications marked as read',
          body: `${result.modifiedCount} notifications marked as read`
        });
      }

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${req.user.email}`);

      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to mark all notifications as read' 
      });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const count = await Notification.getUnreadCount(req.user.id);

      res.json({
        success: true,
        count
      });
    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get unread count' 
      });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.id
      });

      if (!notification) {
        return res.status(404).json({ 
          success: false, 
          message: 'Notification not found' 
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      logger.error('Delete notification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete notification' 
      });
    }
  }

  // Clear all notifications
  async clearAllNotifications(req, res) {
    try {
      const result = await Notification.deleteMany({
        userId: req.user.id
      });

      // Emit real-time update
      if (global.sendNotification) {
        global.sendNotification(req.user.id.toString(), {
          type: 'all_cleared',
          title: 'All notifications cleared',
          body: 'All your notifications have been cleared'
        });
      }

      logger.info(`Cleared ${result.deletedCount} notifications for user ${req.user.email}`);

      res.json({
        success: true,
        message: `Cleared ${result.deletedCount} notifications`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error('Clear all notifications error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to clear notifications' 
      });
    }
  }
}

module.exports = new NotificationController();