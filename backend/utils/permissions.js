const constants = require('./constants');

class Permissions {
  // Check if user can view expense
  static canViewExpense(user, expense) {
    if (!user || !expense) return false;
    
    // Admin can view all expenses in their company
    if (user.role === constants.ROLES.ADMIN && 
        user.companyId.toString() === expense.companyId.toString()) {
      return true;
    }
    
    // Manager can view expenses they need to approve or from their department
    if (user.role === constants.ROLES.MANAGER) {
      const isApprover = expense.approvalFlow.some(
        flow => flow.approverId.toString() === user._id.toString()
      );
      
      if (isApprover) return true;
      
      // Optional: Managers can view expenses from their department
      if (user.department && expense.userId.department === user.department) {
        return true;
      }
    }
    
    // Users can always view their own expenses
    return expense.userId.toString() === user._id.toString();
  }

  // Check if user can edit expense
  static canEditExpense(user, expense) {
    if (!user || !expense) return false;
    
    // Only the owner can edit their expense, and only in draft or pending status
    if (expense.userId.toString() !== user._id.toString()) {
      return false;
    }
    
    return [constants.EXPENSE_STATUS.DRAFT, constants.EXPENSE_STATUS.PENDING].includes(expense.status);
  }

  // Check if user can delete expense
  static canDeleteExpense(user, expense) {
    if (!user || !expense) return false;
    
    // Only the owner can delete their expense, and only in draft or pending status
    if (expense.userId.toString() !== user._id.toString()) {
      return false;
    }
    
    return [constants.EXPENSE_STATUS.DRAFT, constants.EXPENSE_STATUS.PENDING].includes(expense.status);
  }

  // Check if user can approve/reject expense
  static canApproveExpense(user, expense) {
    if (!user || !expense) return false;
    
    // Only managers and admins can approve expenses
    if (![constants.ROLES.MANAGER, constants.ROLES.ADMIN].includes(user.role)) {
      return false;
    }
    
    // Check if user is in the approval flow for this expense
    return expense.approvalFlow.some(
      flow => flow.approverId.toString() === user._id.toString() && 
              flow.status === constants.EXPENSE_STATUS.PENDING
    );
  }

  // Check if user can manage users
  static canManageUsers(user) {
    return user.role === constants.ROLES.ADMIN;
  }

  // Check if user can manage company settings
  static canManageCompany(user) {
    return user.role === constants.ROLES.ADMIN;
  }

  // Check if user can view analytics
  static canViewAnalytics(user) {
    return [constants.ROLES.MANAGER, constants.ROLES.ADMIN].includes(user.role);
  }

  // Check if user can view admin panel
  static canViewAdminPanel(user) {
    return user.role === constants.ROLES.ADMIN;
  }

  // Check if user can create expenses
  static canCreateExpense(user) {
    return user.isActive; // All active users can create expenses
  }

  // Check if user can upload files
  static canUploadFiles(user) {
    return user.isActive;
  }

  // Get user permissions object
  static getUserPermissions(user) {
    if (!user) return {};
    
    return {
      canViewExpense: (expense) => this.canViewExpense(user, expense),
      canEditExpense: (expense) => this.canEditExpense(user, expense),
      canDeleteExpense: (expense) => this.canDeleteExpense(user, expense),
      canApproveExpense: (expense) => this.canApproveExpense(user, expense),
      canManageUsers: this.canManageUsers(user),
      canManageCompany: this.canManageCompany(user),
      canViewAnalytics: this.canViewAnalytics(user),
      canViewAdminPanel: this.canViewAdminPanel(user),
      canCreateExpense: this.canCreateExpense(user),
      canUploadFiles: this.canUploadFiles(user),
      role: user.role,
      isAdmin: user.role === constants.ROLES.ADMIN,
      isManager: user.role === constants.ROLES.MANAGER,
      isEmployee: user.role === constants.ROLES.EMPLOYEE
    };
  }

  // Validate user can access resource
  static validateResourceAccess(user, resource, action) {
    const permissions = this.getUserPermissions(user);
    
    switch (action) {
      case 'view':
        return permissions.canViewExpense(resource);
      case 'edit':
        return permissions.canEditExpense(resource);
      case 'delete':
        return permissions.canDeleteExpense(resource);
      case 'approve':
        return permissions.canApproveExpense(resource);
      default:
        return false;
    }
  }

  // Get accessible expense statuses for user
  static getAccessibleStatuses(user) {
    const baseStatuses = [constants.EXPENSE_STATUS.DRAFT, constants.EXPENSE_STATUS.PENDING];
    
    if (user.role === constants.ROLES.EMPLOYEE) {
      return baseStatuses;
    }
    
    // Managers and admins can see more statuses
    return [
      ...baseStatuses,
      constants.EXPENSE_STATUS.APPROVED,
      constants.EXPENSE_STATUS.REJECTED,
      constants.EXPENSE_STATUS.PAID
    ];
  }

  // Check if user can change expense status
  static canChangeExpenseStatus(user, fromStatus, toStatus) {
    if (user.role === constants.ROLES.ADMIN) {
      // Admin can change any status
      return true;
    }
    
    if (user.role === constants.ROLES.MANAGER) {
      // Managers can only approve/reject pending expenses
      if (fromStatus === constants.EXPENSE_STATUS.PENDING && 
          [constants.EXPENSE_STATUS.APPROVED, constants.EXPENSE_STATUS.REJECTED].includes(toStatus)) {
        return true;
      }
    }
    
    if (user.role === constants.ROLES.EMPLOYEE) {
      // Employees can only submit drafts
      if (fromStatus === constants.EXPENSE_STATUS.DRAFT && 
          toStatus === constants.EXPENSE_STATUS.PENDING) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = Permissions;