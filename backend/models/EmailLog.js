const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: true,
    enum: [
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'expense_paid',
      'reminder',
      'welcome',
      'user_invited',
      'password_reset',
      'system_alert'
    ]
  },
  status: {
    type: String,
    required: true,
    enum: ['sent', 'failed', 'processing', 'delivered', 'bounced'],
    default: 'processing'
  },
  provider: {
    type: String,
    enum: ['sendgrid', 'smtp', 'ses'],
    required: true
  },
  messageId: {
    type: String,
    trim: true
  },
  templateId: {
    type: String,
    trim: true
  },
  error: {
    code: String,
    message: String,
    stack: String
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  retryAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  content: {
    html: String,
    text: String
  },
  attachments: [{
    filename: String,
    content: String, // base64 encoded
    type: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for delivery time
emailLogSchema.virtual('deliveryTime').get(function() {
  if (this.sentAt && this.deliveredAt) {
    return this.deliveredAt - this.sentAt;
  }
  return null;
});

// Virtual for canRetry
emailLogSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && 
         this.retryCount < 3 && 
         (!this.retryAt || this.retryAt <= new Date());
});

// Indexes for efficient queries
emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, status: 1 });
emailLogSchema.index({ status: 1, retryAt: 1 });
emailLogSchema.index({ 'metadata.expenseId': 1 });
emailLogSchema.index({ 'metadata.userId': 1 });
emailLogSchema.index({ createdAt: 1 });
emailLogSchema.index({ provider: 1, status: 1 });

// Static method to get failed emails
emailLogSchema.statics.getFailedEmails = function(days = 7) {
  const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'failed',
    createdAt: { $gte: dateThreshold },
    retryCount: { $lt: 3 }
  });
};

// Static method to get email statistics
emailLogSchema.statics.getEmailStats = function(period = '7d') {
  const periods = {
    '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
    '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
  
  const dateThreshold = periods[period] || periods['7d'];
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: dateThreshold }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        uniqueRecipients: { $addToSet: '$to' }
      }
    }
  ]);
};

// Method to prepare for retry
emailLogSchema.methods.prepareForRetry = function() {
  if (this.canRetry) {
    this.status = 'processing';
    this.retryCount += 1;
    this.retryAt = new Date(Date.now() + Math.pow(2, this.retryCount) * 60 * 1000); // Exponential backoff
    return this.save();
  }
  throw new Error('Email cannot be retried');
};

// Method to log delivery
emailLogSchema.methods.logDelivery = function(messageId, deliveredAt = new Date()) {
  this.status = 'delivered';
  this.messageId = messageId;
  this.deliveredAt = deliveredAt;
  return this.save();
};

// Method to log bounce
emailLogSchema.methods.logBounce = function(error) {
  this.status = 'bounced';
  this.error = {
    code: 'BOUNCE',
    message: error.message || 'Email bounced',
    stack: error.stack
  };
  return this.save();
};

// Pre-save middleware to set sentAt
emailLogSchema.pre('save', function(next) {
  if (this.status === 'sent' && !this.sentAt) {
    this.sentAt = new Date();
  }
  next();
});

module.exports = mongoose.model('EmailLog', emailLogSchema);