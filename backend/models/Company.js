const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  legalName: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    trim: true,
    maxlength: 3
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contact: {
    email: String,
    phone: String,
    website: String
  },
  logo: {
    url: String,
    publicId: String
  },
  settings: {
    // Approval settings
    autoApproveLimit: {
      type: Number,
      default: 50,
      min: 0
    },
    approvalFlow: [{
      type: String,
      enum: ['manager', 'finance', 'admin'],
      default: ['manager']
    }],
    approvalPercentage: {
      type: Number,
      default: 60,
      min: 1,
      max: 100
    },
    
    // Reminder settings
    reminderSchedule: {
      type: Number,
      default: 24, // hours
      min: 1,
      max: 168 // 1 week
    },
    
    // Expense settings
    requireReceipt: {
      type: Boolean,
      default: true
    },
    receiptRequiredAmount: {
      type: Number,
      default: 25
    },
    categories: [{
      type: String,
      enum: ['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other']
    }],
    
    // Notification settings
    notifyOnSubmission: {
      type: Boolean,
      default: true
    },
    notifyOnApproval: {
      type: Boolean,
      default: true
    },
    notifyOnRejection: {
      type: Boolean,
      default: true
    },
    
    // Currency settings
    exchangeRateProvider: {
      type: String,
      default: 'exchangerate-api'
    },
    
    // Security settings
    sessionTimeout: {
      type: Number,
      default: 24 // hours
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'canceled'],
      default: 'active'
    },
    expiresAt: Date,
    usersLimit: {
      type: Number,
      default: 10
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for company statistics
companySchema.virtual('stats', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'companyId',
  justOne: false,
  options: { 
    match: { 
      status: { $in: ['approved', 'pending', 'rejected'] } 
    } 
  }
});

// Index for efficient queries
companySchema.index({ name: 1 });
companySchema.index({ country: 1 });
companySchema.index({ 'subscription.status': 1 });
companySchema.index({ isActive: 1 });

// Static method to get active companies
companySchema.statics.getActiveCompanies = function() {
  return this.find({ isActive: true });
};

// Method to check if company can add more users
companySchema.methods.canAddUser = function() {
  return this.subscription.status === 'active';
};

// Method to get approval flow description
companySchema.methods.getApprovalFlowDescription = function() {
  return this.settings.approvalFlow.map(role => {
    switch(role) {
      case 'manager': return 'Manager';
      case 'finance': return 'Finance';
      case 'admin': return 'Admin';
      default: return role;
    }
  }).join(' → ');
};

// Pre-save middleware to ensure categories array is not empty
companySchema.pre('save', function(next) {
  if (!this.settings.categories || this.settings.categories.length === 0) {
    this.settings.categories = ['travel', 'meals', 'entertainment', 'supplies', 'equipment', 'software', 'other'];
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);