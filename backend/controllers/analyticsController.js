const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class AnalyticsController {
  // Get company analytics
  async getCompanyAnalytics(req, res) {
    try {
      const companyId = req.user.companyId;
      const { period = '30d' } = req.query;

      // Date range calculation
      const dateRanges = {
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        '1y': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      };

      const dateFrom = dateRanges[period] || dateRanges['30d'];

      // Get basic expense counts and totals
      const expenseStats = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            createdAt: { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$convertedAmount' },
            avgAmount: { $avg: '$convertedAmount' }
          }
        }
      ]);

      // Get category breakdown
      const categoryStats = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            status: 'approved',
            createdAt: { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalAmount: { $sum: '$convertedAmount' },
            percentage: { $avg: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);

      // Get monthly trend
      const monthlyTrend = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            status: 'approved',
            createdAt: { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$convertedAmount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $limit: 12
        }
      ]);

      // Get pending approvals count
      const pendingApprovals = await Expense.countDocuments({
        companyId: companyId,
        status: 'pending',
        'approvalFlow.status': 'pending'
      });

      // Get top spenders
      const topSpenders = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            status: 'approved',
            createdAt: { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: '$userId',
            totalAmount: { $sum: '$convertedAmount' },
            expenseCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalAmount: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            userName: '$user.name',
            userEmail: '$user.email',
            userDepartment: '$user.department',
            totalAmount: 1,
            expenseCount: 1
          }
        }
      ]);

      // Calculate approval rate
      const approvalStats = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            createdAt: { $gte: dateFrom },
            status: { $in: ['approved', 'rejected'] }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const approvedCount = approvalStats.find(s => s._id === 'approved')?.count || 0;
      const rejectedCount = approvalStats.find(s => s._id === 'rejected')?.count || 0;
      const totalProcessed = approvedCount + rejectedCount;
      const approvalRate = totalProcessed > 0 ? (approvedCount / totalProcessed) * 100 : 0;

      // Format the response
      const analytics = {
        summary: {
          totalExpenses: expenseStats.reduce((sum, stat) => sum + stat.count, 0),
          totalAmount: expenseStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
          pendingApprovals,
          approvalRate: Math.round(approvalRate * 100) / 100
        },
        byStatus: expenseStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
            avgAmount: Math.round(stat.avgAmount * 100) / 100
          };
          return acc;
        }, {}),
        byCategory: categoryStats.map(stat => ({
          category: stat._id,
          count: stat.count,
          totalAmount: stat.totalAmount,
          percentage: Math.round((stat.totalAmount / categoryStats.reduce((sum, s) => sum + s.totalAmount, 0)) * 100 * 100) / 100
        })),
        monthlyTrend: monthlyTrend.map(month => ({
          period: `${month._id.year}-${month._id.month.toString().padStart(2, '0')}`,
          count: month.count,
          totalAmount: month.totalAmount
        })),
        topSpenders: topSpenders.map(spender => ({
          name: spender.userName,
          email: spender.userEmail,
          department: spender.userDepartment,
          totalAmount: spender.totalAmount,
          expenseCount: spender.expenseCount
        })),
        period: {
          from: dateFrom,
          to: new Date()
        }
      };

      res.json({
        success: true,
        analytics
      });

    } catch (error) {
      logger.error('Get company analytics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch analytics' 
      });
    }
  }

  // Get user dashboard statistics
  async getUserDashboard(req, res) {
    try {
      const userId = req.user.id;
      const companyId = req.user.companyId;

      // Get user's expense statistics
      const userExpenseStats = await Expense.aggregate([
        {
          $match: {
            userId: userId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$convertedAmount' }
          }
        }
      ]);

      // Get pending approvals count for user (as approver)
      const pendingApprovalsCount = await Expense.countDocuments({
        companyId: companyId,
        status: 'pending',
        'approvalFlow.approverId': userId,
        'approvalFlow.status': 'pending'
      });

      // Get recent expenses
      const recentExpenses = await Expense.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('approvalFlow.approverId', 'name email');

      // Get unread notifications count
      const unreadNotificationsCount = await Notification.getUnreadCount(userId);

      // Calculate monthly spending
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlySpending = await Expense.aggregate([
        {
          $match: {
            userId: userId,
            status: 'approved',
            date: { $gte: currentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$convertedAmount' }
          }
        }
      ]);

      const dashboard = {
        expenseStats: userExpenseStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {}),
        pendingApprovals: pendingApprovalsCount,
        unreadNotifications: unreadNotificationsCount,
        monthlySpending: monthlySpending[0]?.totalAmount || 0,
        recentExpenses: recentExpenses.map(expense => ({
          id: expense._id,
          title: expense.title,
          amount: expense.amount,
          currency: expense.currency,
          status: expense.status,
          date: expense.date,
          category: expense.category
        }))
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error) {
      logger.error('Get user dashboard error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch dashboard data' 
      });
    }
  }

  // Get approval analytics for managers/admins
  async getApprovalAnalytics(req, res) {
    try {
      const companyId = req.user.companyId;
      const { period = '30d' } = req.query;

      const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

      // Get approval performance by approver
      const approverPerformance = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            'approvalFlow.actedAt': { $gte: dateFrom }
          }
        },
        {
          $unwind: '$approvalFlow'
        },
        {
          $match: {
            'approvalFlow.actedAt': { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: '$approvalFlow.approverId',
            totalActions: { $sum: 1 },
            approvals: {
              $sum: {
                $cond: [{ $eq: ['$approvalFlow.status', 'approved'] }, 1, 0]
              }
            },
            rejections: {
              $sum: {
                $cond: [{ $eq: ['$approvalFlow.status', 'rejected'] }, 1, 0]
              }
            },
            avgResponseTime: {
              $avg: {
                $subtract: ['$approvalFlow.actedAt', '$createdAt']
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'approver'
          }
        },
        {
          $unwind: '$approver'
        },
        {
          $project: {
            approverName: '$approver.name',
            approverEmail: '$approver.email',
            approverRole: '$approver.role',
            totalActions: 1,
            approvals: 1,
            rejections: 1,
            approvalRate: {
              $cond: [
                { $eq: ['$totalActions', 0] },
                0,
                { $multiply: [{ $divide: ['$approvals', '$totalActions'] }, 100] }
              ]
            },
            avgResponseTimeHours: {
              $divide: ['$avgResponseTime', 1000 * 60 * 60]
            }
          }
        },
        {
          $sort: { totalActions: -1 }
        }
      ]);

      // Get approval timeline
      const approvalTimeline = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            status: { $in: ['approved', 'rejected'] },
            createdAt: { $gte: dateFrom }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      res.json({
        success: true,
        analytics: {
          approverPerformance,
          approvalTimeline
        }
      });

    } catch (error) {
      logger.error('Get approval analytics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch approval analytics' 
      });
    }
  }
}

module.exports = new AnalyticsController();