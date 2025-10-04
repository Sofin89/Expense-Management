const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Amount must be greater than 0'
    }
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    trim: true,
    maxlength: 3
  },
  convertedAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  category: {
    type: String,
    enum: ['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Expense date cannot be in the future'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'pending'
  },
  receipt: {
    url: String,
    publicId: String,
    thumbnailUrl: String,
    originalName: String,
    fileSize: Number,
    mimeType: String
  },
  merchant: {
    name: String,
    address: String,
    taxId: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  approvalFlow: [{
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['manager', 'finance', 'admin'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'skipped'],
      default: 'pending'
    },
    comment: String,
    actedAt: Date,
    dueDate: Date,
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date
  }],
  currentApproverIndex: {
    type: Number,
    default: 0,
    min: 0
  },
  auditLog: [{
    action: {
      type: String,
      required: true,
      enum: [
        'submitted', 'draft_saved', 'approved', 'rejected', 
        'returned', 'paid', 'cancelled', 'edited', 
        'comment_added', 'reminder_sent', 'auto_approved'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    previousState: mongoose.Schema.Types.Mixed,
    newState: mongoose.Schema.Types.Mixed
  }],
  dueDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isReceiptRequired: {
    type: Boolean,
    default: true
  },
  receiptVerified: {
    type: Boolean,
    default: false
  },
  ocrData: {
    extractedAmount: Number,
    extractedDate: Date,
    extractedMerchant: String,
    confidence: Number,
    rawText: String,
    processedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Virtual for formatted converted amount
expenseSchema.virtual('formattedConvertedAmount').get(function() {
  const company = this.populated('companyId') || this.companyId;
  const companyCurrency = company.currency || 'USD';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: companyCurrency
  }).format(this.convertedAmount);
});

// Virtual for days pending
expenseSchema.virtual('daysPending').get(function() {
  if (this.status !== 'pending') return 0;
  const created = new Date(this.createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Virtual for current approvers
expenseSchema.virtual('currentApprovers').get(function() {
  return this.approvalFlow.filter(flow => 
    flow.status === 'pending' && 
    this.approvalFlow.indexOf(flow) >= this.currentApproverIndex
  );
});

// Virtual for isOverdue
expenseSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'pending') return false;
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
  return this.createdAt < threshold;
});

// Indexes for efficient queries
expenseSchema.index({ userId: 1, createdAt: -1 });
expenseSchema.index({ companyId: 1, status: 1 });
expenseSchema.index({ companyId: 1, category: 1 });
expenseSchema.index({ companyId: 1, date: -1 });
expenseSchema.index({ 'approvalFlow.approverId': 1, status: 1 });
expenseSchema.index({ status: 1, createdAt: 1 });
expenseSchema.index({ companyId: 1, userId: 1, status: 1 });
expenseSchema.index({ dueDate: 1 });
expenseSchema.index({ 'auditLog.timestamp': -1 });

// Static method to get pending expenses for approver
expenseSchema.statics.getPendingForApprover = function(approverId) {
  return this.find({
    status: 'pending',
    'approvalFlow.approverId': approverId,
    'approvalFlow.status': 'pending'
  }).populate('userId', 'name email department')
    .populate('approvalFlow.approverId', 'name email role')
    .sort({ createdAt: -1 });
};

// Static method to get company expenses with filters
expenseSchema.statics.getCompanyExpenses = function(companyId, filters = {}) {
  const query = { companyId };
  
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.userId) query.userId = filters.userId;
  if (filters.dateFrom || filters.dateTo) {
    query.date = {};
    if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
  }
  
  return this.find(query)
    .populate('userId', 'name email department')
    .populate('approvalFlow.approverId', 'name email role')
    .sort({ createdAt: -1 });
};

// Method to check if expense can be edited
expenseSchema.methods.canEdit = function() {
  return ['draft', 'pending'].includes(this.status);
};

// Method to check if expense requires receipt
expenseSchema.methods.requiresReceipt = function() {
  return this.isReceiptRequired && this.amount >= (this.companyId?.settings?.receiptRequiredAmount || 25);
};

// Method to get approval progress
expenseSchema.methods.getApprovalProgress = function() {
  const totalSteps = this.approvalFlow.length;
  const completedSteps = this.approvalFlow.filter(flow => 
    ['approved', 'rejected', 'skipped'].includes(flow.status)
  ).length;
  
  return {
    completed: completedSteps,
    total: totalSteps,
    percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0
  };
};

// Pre-save middleware to set due date
expenseSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'pending') {
    // Set due date to 30 days from creation
    this.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);