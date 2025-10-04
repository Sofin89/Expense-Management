const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const logger = require('../utils/logger');

class ApprovalService {
  async getNextApprovers(expense, company) {
    try {
      const approvalFlow = company.settings.approvalFlow || ['manager'];
      const currentIndex = expense.currentApproverIndex || 0;
      
      if (currentIndex >= approvalFlow.length) {
        return []; // No more approvers needed
      }

      const nextRole = approvalFlow[currentIndex];
      
      // Get active users with the required role
      const approvers = await User.find({ 
        companyId: expense.companyId, 
        role: nextRole,
        isActive: true 
      }).select('name email role department settings');

      logger.debug(`Found ${approvers.length} ${nextRole} approvers for expense ${expense._id}`);
      return approvers;
    } catch (error) {
      logger.error('Error getting next approvers:', error);
      throw error;
    }
  }

  async initializeApprovalFlow(expense, company) {
    try {
      const approvers = await this.getNextApprovers(expense, company);
      
      if (approvers.length === 0) {
        throw new Error('No approvers found for the approval flow');
      }

      const approvalFlow = approvers.map(approver => ({
        approverId: approver._id,
        role: approver.role,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }));

      // Check for auto-approval
      const autoApproveLimit = company.settings.autoApproveLimit || 50;
      
      if (expense.amount <= autoApproveLimit) {
        logger.info(`Expense ${expense._id} auto-approved (amount: ${expense.amount} <= ${autoApproveLimit})`);
        
        return {
          status: 'approved',
          approvalFlow: approvalFlow.map(flow => ({
            ...flow,
            status: 'approved',
            actedAt: new Date(),
            comment: 'Auto-approved (below threshold)'
          }))
        };
      }

      return {
        status: 'pending',
        approvalFlow
      };
    } catch (error) {
      logger.error('Error initializing approval flow:', error);
      throw error;
    }
  }

  async processApproval(expense, approverId, action, comment = '') {
    try {
      const approvalIndex = expense.approvalFlow.findIndex(
        flow => flow.approverId.equals(approverId) && flow.status === 'pending'
      );

      if (approvalIndex === -1) {
        throw new Error('Approval not found or already processed');
      }

      // Store previous state for audit
      const previousState = {
        status: expense.status,
        approvalFlow: JSON.parse(JSON.stringify(expense.approvalFlow)),
        currentApproverIndex: expense.currentApproverIndex
      };

      // Update the specific approval
      expense.approvalFlow[approvalIndex].status = action;
      expense.approvalFlow[approvalIndex].comment = comment;
      expense.approvalFlow[approvalIndex].actedAt = new Date();

      // Add to audit log
      expense.auditLog.push({
        action: `${action}_by_approver`,
        performedBy: approverId,
        comment,
        timestamp: new Date(),
        previousState: {
          approvalStatus: previousState.approvalFlow[approvalIndex].status
        },
        newState: {
          approvalStatus: action
        }
      });

      // Get company settings for approval rules
      const company = await Company.findById(expense.companyId);
      const currentRole = expense.approvalFlow[approvalIndex].role;
      
      // Get all approvers for the current role
      const allApproversForCurrentRole = expense.approvalFlow.filter(
        flow => flow.role === currentRole
      );

      const approvedCount = allApproversForCurrentRole.filter(
        flow => flow.status === 'approved'
      ).length;

      const rejectedCount = allApproversForCurrentRole.filter(
        flow => flow.status === 'rejected'
      ).length;

      const pendingCount = allApproversForCurrentRole.filter(
        flow => flow.status === 'pending'
      ).length;

      // Check percentage-based approval
      const approvalPercentage = company.settings.approvalPercentage || 60;
      const requiredApprovals = Math.ceil(
        allApproversForCurrentRole.length * (approvalPercentage / 100)
      );

      logger.debug(`Approval stats for role ${currentRole}: ${approvedCount}/${requiredApprovals} approved, ${rejectedCount} rejected, ${pendingCount} pending`);

      // Decision logic
      if (rejectedCount > 0) {
        // If any rejection for current role, expense is rejected
        expense.status = 'rejected';
        expense.auditLog.push({
          action: 'expense_rejected',
          performedBy: approverId,
          comment: `Expense rejected by ${currentRole} role (${rejectedCount} rejection(s))`,
          timestamp: new Date()
        });
        
        logger.info(`Expense ${expense._id} rejected by ${currentRole} role`);
      } else if (approvedCount >= requiredApprovals) {
        // Move to next role or approve if last role
        const nextApprovers = await this.getNextApprovers(expense, company);
        
        if (nextApprovers.length > 0) {
          expense.currentApproverIndex += 1;
          const nextRoleApprovers = nextApprovers.map(approver => ({
            approverId: approver._id,
            role: approver.role,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }));
          expense.approvalFlow.push(...nextRoleApprovers);
          
          expense.auditLog.push({
            action: 'moved_to_next_approval_stage',
            performedBy: approverId,
            comment: `Approval moved to ${nextApprovers[0].role} role`,
            timestamp: new Date()
          });
          
          logger.info(`Expense ${expense._id} moved to ${nextApprovers[0].role} approval stage`);
        } else {
          expense.status = 'approved';
          expense.auditLog.push({
            action: 'expense_approved',
            performedBy: approverId,
            comment: 'Expense fully approved',
            timestamp: new Date()
          });
          
          logger.info(`Expense ${expense._id} fully approved`);
        }
      } else if (pendingCount === 0) {
        // All approvers for current role have acted but didn't reach consensus
        // This shouldn't happen with the logic above, but as a fallback
        expense.status = 'rejected';
        expense.auditLog.push({
          action: 'expense_rejected',
          performedBy: approverId,
          comment: 'Expense rejected (insufficient approvals for current role)',
          timestamp: new Date()
        });
        
        logger.warn(`Expense ${expense._id} rejected due to insufficient approvals for role ${currentRole}`);
      }
      // Otherwise, status remains 'pending' waiting for more approvals

      await expense.save();
      
      logger.info(`Approval processed for expense ${expense._id} by ${approverId}: ${action}`);
      return expense;
    } catch (error) {
      logger.error('Error processing approval:', error);
      throw error;
    }
  }

  // Pure function for testing approval logic
  calculateApprovalStatus(approvalFlow, rules = {}) {
    const statusCounts = {
      approved: 0,
      rejected: 0,
      pending: 0
    };

    // Group by role
    const byRole = {};
    approvalFlow.forEach(flow => {
      if (!byRole[flow.role]) {
        byRole[flow.role] = { approved: 0, rejected: 0, pending: 0, total: 0 };
      }
      
      byRole[flow.role][flow.status]++;
      byRole[flow.role].total++;
      statusCounts[flow.status]++;
    });

    // Check for any rejection
    if (statusCounts.rejected > 0) {
      return 'rejected';
    }

    // Check each role's approval status
    const roles = Object.keys(byRole);
    for (const role of roles) {
      const roleStats = byRole[role];
      const requiredApprovals = Math.ceil(
        roleStats.total * ((rules.approvalPercentage || 60) / 100)
      );

      if (roleStats.rejected > 0) {
        return 'rejected';
      }

      if (roleStats.approved < requiredApprovals && roleStats.pending === 0) {
        return 'rejected'; // Didn't get enough approvals and no pending left
      }

      if (roleStats.approved < requiredApprovals) {
        return 'pending'; // Still waiting for more approvals
      }
    }

    // If all roles have sufficient approvals
    return 'approved';
  }

  async getApprovalProgress(expenseId) {
    try {
      const expense = await Expense.findById(expenseId)
        .populate('approvalFlow.approverId', 'name email role');
      
      if (!expense) {
        throw new Error('Expense not found');
      }

      const totalSteps = expense.approvalFlow.length;
      const completedSteps = expense.approvalFlow.filter(flow => 
        ['approved', 'rejected', 'skipped'].includes(flow.status)
      ).length;

      const currentStep = expense.currentApproverIndex + 1;
      const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

      const currentApprovers = expense.approvalFlow
        .filter(flow => 
          flow.status === 'pending' && 
          expense.approvalFlow.indexOf(flow) >= expense.currentApproverIndex
        )
        .map(flow => ({
          approver: flow.approverId,
          role: flow.role,
          dueDate: flow.dueDate
        }));

      return {
        currentStep,
        totalSteps,
        completedSteps,
        percentage: Math.round(percentage),
        currentApprovers,
        status: expense.status
      };
    } catch (error) {
      logger.error('Error getting approval progress:', error);
      throw error;
    }
  }

  async getPendingApprovalsCount(approverId) {
    try {
      const count = await Expense.countDocuments({
        status: 'pending',
        'approvalFlow.approverId': approverId,
        'approvalFlow.status': 'pending'
      });

      return count;
    } catch (error) {
      logger.error('Error getting pending approvals count:', error);
      throw error;
    }
  }

  async getApprovalStatistics(companyId, period = '30d') {
    try {
      const dateRanges = {
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        '90d': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      };

      const dateFrom = dateRanges[period] || dateRanges['30d'];

      const stats = await Expense.aggregate([
        {
          $match: {
            companyId: companyId,
            createdAt: { $gte: dateFrom }
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
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting approval statistics:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService();