const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'expense_paid',
      'approval_required',
      'reminder',
      'system_alert',
      'welcome',
      'user_invited',
      'settings_updated'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Body cannot exceed 1000 characters']
  },
  link: {
    type: String,
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actions: [{
    label: String,
    action: String,
    link: String,
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE']
    }
  }],
  source: {
    type: String,
    enum: ['system', 'user', 'admin'],
    default: 'system'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'source'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for isActionable
notificationSchema.virtual('isActionable').get(function() {
  return this.actionRequired && !this.read && !this.isExpired;
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ 'metadata.expenseId': 1 });

// Auto-remove expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get user notifications with pagination
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
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

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ 
    userId, 
    read: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to create bulk notifications
notificationSchema.statics.createBulk = function(notificationsData) {
  const notifications = notificationsData.map(data => new this(data));
  return this.insertMany(notifications);
};

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Pre-save middleware to validate link
notificationSchema.pre('save', function(next) {
  if (this.link && !this.link.startsWith('/')) {
    this.link = `/${this.link}`;
  }
  next();
});

// Pre-save middleware to set priority based on type
notificationSchema.pre('save', function(next) {
  if (!this.priority) {
    const priorityMap = {
      'reminder': 'medium',
      'approval_required': 'high',
      'system_alert': 'urgent',
      'expense_rejected': 'high',
      'expense_approved': 'low'
    };
    this.priority = priorityMap[this.type] || 'medium';
  }
  next();
});

// FIX: Correct the model export - change userIdSchema to notificationSchema
module.exports = mongoose.model('Notification', notificationSchema);