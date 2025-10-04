const constants = require('./constants');
const Helpers = require('./helpers');

class Formatters {
  // Format expense for response
  static formatExpense(expense, user = null) {
    if (!expense) return null;
    
    const formatted = {
      id: expense._id || expense.id,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      convertedAmount: expense.convertedAmount,
      category: expense.category,
      date: expense.date,
      status: expense.status,
      merchant: expense.merchant,
      tags: expense.tags || [],
      receipt: expense.receipt,
      userId: expense.userId?._id || expense.userId,
      companyId: expense.companyId?._id || expense.companyId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      isReceiptRequired: expense.isReceiptRequired,
      receiptVerified: expense.receiptVerified,
      daysPending: Helpers.getRelativeTime(expense.createdAt),
      formattedAmount: Helpers.formatCurrency(expense.amount, expense.currency),
      formattedDate: Helpers.formatDate(expense.date)
    };

    // Add user information if populated
    if (expense.userId && typeof expense.userId === 'object') {
      formatted.user = {
        id: expense.userId._id,
        name: expense.userId.name,
        email: expense.userId.email,
        department: expense.userId.department
      };
    }

    // Add approval flow information if populated
    if (expense.approvalFlow && Array.isArray(expense.approvalFlow)) {
      formatted.approvalFlow = expense.approvalFlow.map(flow => ({
        approverId: flow.approverId?._id || flow.approverId,
        approver: flow.approverId && typeof flow.approverId === 'object' ? {
          id: flow.approverId._id,
          name: flow.approverId.name,
          email: flow.approverId.email,
          role: flow.approverId.role
        } : null,
        role: flow.role,
        status: flow.status,
        comment: flow.comment,
        actedAt: flow.actedAt,
        dueDate: flow.dueDate
      }));

      // Calculate approval progress
      const totalSteps = formatted.approvalFlow.length;
      const completedSteps = formatted.approvalFlow.filter(
        flow => ['approved', 'rejected', 'skipped'].includes(flow.status)
      ).length;
      
      formatted.approvalProgress = {
        currentStep: (expense.currentApproverIndex || 0) + 1,
        totalSteps,
        completedSteps,
        percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
      };
    }

    // Add audit log if populated
    if (expense.auditLog && Array.isArray(expense.auditLog)) {
      formatted.auditLog = expense.auditLog.map(log => ({
        action: log.action,
        performedBy: log.performedBy?._id || log.performedBy,
        performer: log.performedBy && typeof log.performedBy === 'object' ? {
          id: log.performedBy._id,
          name: log.performedBy.name,
          email: log.performedBy.email
        } : null,
        comment: log.comment,
        timestamp: log.timestamp,
        readableTime: Helpers.getRelativeTime(log.timestamp)
      }));
    }

    // Add permissions for the current user
    if (user) {
      const Permissions = require('./permissions');
      formatted.permissions = {
        canEdit: Permissions.canEditExpense(user, expense),
        canDelete: Permissions.canDeleteExpense(user, expense),
        canApprove: Permissions.canApproveExpense(user, expense)
      };
    }

    return formatted;
  }

  // Format user for response
  static formatUser(user, includeSensitive = false) {
    if (!user) return null;
    
    const formatted = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      position: user.position,
      companyId: user.companyId?._id || user.companyId,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      profilePicture: user.profilePicture,
      phone: user.phone,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      initials: Helpers.getInitials(user.name)
    };

    // Include company information if populated
    if (user.companyId && typeof user.companyId === 'object') {
      formatted.company = {
        id: user.companyId._id,
        name: user.companyId.name,
        currency: user.companyId.currency,
        country: user.companyId.country
      };
    }

    // Include sensitive information only if requested and appropriate
    if (includeSensitive) {
      // Add any sensitive fields here if needed
    }

    return formatted;
  }

  // Format company for response
  static formatCompany(company) {
    if (!company) return null;
    
    return {
      id: company._id || company.id,
      name: company.name,
      legalName: company.legalName,
      country: company.country,
      currency: company.currency,
      timezone: company.timezone,
      address: company.address,
      contact: company.contact,
      logo: company.logo,
      settings: company.settings,
      subscription: company.subscription,
      createdBy: company.createdBy,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  // Format notification for response
  static formatNotification(notification) {
    if (!notification) return null;
    
    return {
      id: notification._id || notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
      read: notification.read,
      readAt: notification.readAt,
      priority: notification.priority,
      expiresAt: notification.expiresAt,
      metadata: notification.metadata,
      actionRequired: notification.actionRequired,
      actions: notification.actions,
      source: notification.source,
      sourceId: notification.sourceId,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      isExpired: notification.expiresAt && new Date(notification.expiresAt) < new Date(),
      readableTime: Helpers.getRelativeTime(notification.createdAt)
    };
  }

  // Format analytics data for response
  static formatAnalytics(analytics) {
    if (!analytics) return null;
    
    return {
      summary: analytics.summary,
      byStatus: analytics.byStatus,
      byCategory: analytics.byCategory,
      monthlyTrend: analytics.monthlyTrend,
      topSpenders: analytics.topSpenders,
      period: analytics.period
    };
  }

  // Format email log for response
  static formatEmailLog(emailLog) {
    if (!emailLog) return null;
    
    return {
      id: emailLog._id || emailLog.id,
      to: emailLog.to,
      subject: emailLog.subject,
      type: emailLog.type,
      status: emailLog.status,
      provider: emailLog.provider,
      messageId: emailLog.messageId,
      error: emailLog.error,
      retryCount: emailLog.retryCount,
      sentAt: emailLog.sentAt,
      deliveredAt: emailLog.deliveredAt,
      metadata: emailLog.metadata,
      createdAt: emailLog.createdAt,
      updatedAt: emailLog.updatedAt,
      deliveryTime: emailLog.deliveryTime,
      canRetry: emailLog.canRetry,
      readableTime: Helpers.getRelativeTime(emailLog.createdAt)
    };
  }

  // Format audit log for response
  static formatAuditLog(auditLog) {
    if (!auditLog) return null;
    
    return {
      id: auditLog._id || auditLog.id,
      action: auditLog.action,
      performedBy: auditLog.performedBy?._id || auditLog.performedBy,
      performer: auditLog.performedBy && typeof auditLog.performedBy === 'object' ? {
        id: auditLog.performedBy._id,
        name: auditLog.performedBy.name,
        email: auditLog.performedBy.email,
        role: auditLog.performedBy.role
      } : null,
      userAgent: auditLog.userAgent,
      ipAddress: auditLog.ipAddress,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      description: auditLog.description,
      changes: auditLog.changes,
      metadata: auditLog.metadata,
      severity: auditLog.severity,
      sessionId: auditLog.sessionId,
      createdAt: auditLog.createdAt,
      updatedAt: auditLog.updatedAt,
      readableTime: Helpers.getRelativeTime(auditLog.createdAt)
    };
  }

  // Format pagination response
  static formatPaginationResponse(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
        nextPage: pagination.nextPage,
        prevPage: pagination.prevPage
      }
    };
  }

  // Format error response
  static formatErrorResponse(message, errors = [], code = null) {
    const response = {
      success: false,
      message
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (code) {
      response.code = code;
    }

    return response;
  }

  // Format success response
  static formatSuccessResponse(data = null, message = 'Success') {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      response.data = data;
    }

    return response;
  }

  // Format validation errors
  static formatValidationErrors(errors) {
    return errors.map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
  }

  // Format OCR results
  static formatOCRResults(ocrResult) {
    if (!ocrResult) return null;
    
    return {
      success: ocrResult.success,
      data: ocrResult.data,
      rawText: ocrResult.rawText,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime,
      ocrConfidence: ocrResult.ocrConfidence
    };
  }
}

module.exports = Formatters;