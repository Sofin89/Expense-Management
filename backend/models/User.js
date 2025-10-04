const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    default: 'employee',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  department: {
    type: String,
    default: 'General',
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profilePicture: {
    url: String,
    publicId: String
  },
  phone: {
    type: String,
    trim: true
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for user's full profile
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    position: this.position,
    isActive: this.isActive,
    profilePicture: this.profilePicture
  };
});

// Index for efficient queries
userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ companyId: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Hash password before updating if modified
userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.password) {
    try {
      update.password = await bcrypt.hash(update.password, 12);
      this.setUpdate(update);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user can approve expenses
userSchema.methods.canApprove = function() {
  return ['manager', 'admin'].includes(this.role);
};

// Check if user can manage users
userSchema.methods.canManageUsers = function() {
  return this.role === 'admin';
};

// Check if user can manage company settings
userSchema.methods.canManageSettings = function() {
  return this.role === 'admin';
};

// Static method to get company admins
userSchema.statics.getCompanyAdmins = function(companyId) {
  return this.find({ 
    companyId, 
    role: 'admin', 
    isActive: true 
  });
};

// Static method to get company managers
userSchema.statics.getCompanyManagers = function(companyId) {
  return this.find({ 
    companyId, 
    role: 'manager', 
    isActive: true 
  });
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);