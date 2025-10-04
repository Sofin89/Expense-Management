const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');
const { 
  notificationValidation, 
  paramValidation, 
  handleValidationErrors 
} = require('../middleware/validation');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get(
  '/',
  auth,
  notificationValidation.query,
  handleValidationErrors,
  notificationController.getUserNotifications
);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get(
  '/unread-count',
  auth,
  notificationController.getUnreadCount
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put(
  '/:id/read',
  auth,
  paramValidation.id,
  handleValidationErrors,
  notificationController.markAsRead
);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put(
  '/read-all',
  auth,
  notificationController.markAllAsRead
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete(
  '/:id',
  auth,
  paramValidation.id,
  handleValidationErrors,
  notificationController.deleteNotification
);

// @route   DELETE /api/notifications
// @desc    Clear all notifications
// @access  Private
router.delete(
  '/',
  auth,
  notificationController.clearAllNotifications
);

module.exports = router;