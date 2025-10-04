const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'user_login',
      'user_logout',
      'user_created',
      'user_updated',
      'user_deleted',
      'password_changed',
      
      // Expense actions
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'expense_paid',
      
      // Approval actions
      'approval_assigned',
      'approval_action',
      'approval_reminder_sent',
      
      // Company actions
      'company_created',
      'company_updated',
      'settings_updated',
      
      // System actions
      'backup_created',
      'cleanup_performed',
      'system_maintenance'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  resourceType: {
    type: String,
    enum: ['user', 'expense', 'company', 'notification', 'system'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String]
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  sessionId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for readable timestamp
auditLogSchema.virtual('readableTime').get(function() {
  return this.createdAt.toLocaleString();
});

// Indexes for efficient queries
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to get logs with filters
auditLogSchema.statics.getLogs = function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = {};
  
  if (filters.action) query.action = filters.action;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.performedBy) query.performedBy = filters.performedBy;
  if (filters.severity) query.severity = filters.severity;
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }

  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return this.find(query)
    .populate('performedBy', 'name email role')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to cleanup old logs (keep 90 days)
auditLogSchema.statics.cleanupOldLogs = function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $ne: 'critical' } // Keep critical logs forever
  });
};

// Static method to log action
auditLogSchema.statics.logAction = async function(data) {
  const {
    action,
    performedBy,
    resourceType,
    resourceId,
    description,
    changes = {},
    metadata = {},
    severity = 'medium',
    userAgent = '',
    ipAddress = '',
    sessionId = ''
  } = data;

  const log = new this({
    action,
    performedBy,
    resourceType,
    resourceId,
    description,
    changes,
    metadata,
    severity,
    userAgent,
    ipAddress,
    sessionId
  });

  return await log.save();
};

// Pre-save middleware to set description if not provided
auditLogSchema.pre('save', function(next) {
  if (!this.description) {
    this.description = `${this.action} performed on ${this.resourceType}`;
  }
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);