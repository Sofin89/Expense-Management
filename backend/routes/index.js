const express = require('express');
const router = express.Router();

// Import all routes
const authRoutes = require('./auth');
const expenseRoutes = require('./expenses');
const notificationRoutes = require('./notifications');
const analyticsRoutes = require('./analytics');
const adminRoutes = require('./admin');
const uploadRoutes = require('./upload');
const healthRoutes = require('./health');

// Route documentation
router.get('/', (req, res) => {
  res.json({
    message: 'Expense Management System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user and company',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'Logout user'
      },
      expenses: {
        'GET /api/expenses': 'Get user expenses',
        'GET /api/expenses/approvals': 'Get pending approvals',
        'GET /api/expenses/:id': 'Get single expense',
        'POST /api/expenses': 'Create expense',
        'PUT /api/expenses/:id': 'Update expense',
        'POST /api/expenses/:id/approve': 'Approve/Reject expense',
        'DELETE /api/expenses/:id': 'Delete expense',
        'POST /api/expenses/process-receipt': 'Process receipt OCR'
      },
      notifications: {
        'GET /api/notifications': 'Get notifications',
        'GET /api/notifications/unread-count': 'Get unread count',
        'PUT /api/notifications/:id/read': 'Mark as read',
        'PUT /api/notifications/read-all': 'Mark all as read',
        'DELETE /api/notifications/:id': 'Delete notification',
        'DELETE /api/notifications': 'Clear all notifications'
      },
      analytics: {
        'GET /api/analytics/company': 'Get company analytics (Manager/Admin)',
        'GET /api/analytics/dashboard': 'Get user dashboard',
        'GET /api/analytics/approvals': 'Get approval analytics (Manager/Admin)'
      },
      admin: {
        'GET /api/admin/users': 'Get company users (Admin)',
        'POST /api/admin/users': 'Create user (Admin)',
        'PUT /api/admin/users/:id': 'Update user (Admin)',
        'PUT /api/admin/company/settings': 'Update company settings (Admin)',
        'GET /api/admin/expenses': 'Get all company expenses (Admin)',
        'GET /api/admin/audit-logs': 'Get audit logs (Admin)',
        'POST /api/admin/reminders/trigger': 'Trigger reminders (Admin)'
      },
      upload: {
        'POST /api/upload/receipt': 'Upload receipt',
        'DELETE /api/upload/receipt/:publicId': 'Delete file',
        'GET /api/upload/signature': 'Get upload signature'
      },
      system: {
        'GET /api/health': 'Health check',
        'GET /api/health/version': 'API version'
      }
    },
    documentation: 'https://github.com/your-repo/expense-management/docs'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);
router.use('/health', healthRoutes);

module.exports = router;