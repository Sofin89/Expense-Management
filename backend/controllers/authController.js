const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const axios = require('axios');
const logger = require('../utils/logger');
const { addEmailToQueue, JOB_TYPES } = require('../jobs/emailQueue');

class AuthController {
  // Get country and currency data
  async getCountryCurrency(countryName) {
    try {
      const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}?fullText=true`);
      const country = response.data[0];
      const currencyCode = Object.keys(country.currencies)[0];
      return {
        currency: currencyCode,
        country: country.name.common,
        currencySymbol: country.currencies[currencyCode].symbol
      };
    } catch (error) {
      logger.warn(`Failed to fetch country data for ${countryName}, using defaults`, error);
      return { 
        currency: 'USD', 
        country: countryName,
        currencySymbol: '$'
      };
    }
  }

  // Register new user and company
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, email, password, companyName, country, timezone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }

      // Get country currency
      const countryData = await this.getCountryCurrency(country);

      // Create company
      const company = new Company({
        name: companyName,
        legalName: companyName,
        country: countryData.country,
        currency: countryData.currency,
        timezone: timezone || 'UTC',
        contact: { email },
        createdBy: null // Will be set after user creation
      });
      await company.save();

      // Create user (as admin)
      const user = new User({
        name,
        email,
        password,
        role: 'admin',
        companyId: company._id,
        department: 'Management',
        position: 'Administrator'
      });
      await user.save();

      // Update company with creator
      company.createdBy = user._id;
      await company.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      // Send welcome email
      await addEmailToQueue(JOB_TYPES.WELCOME, {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        company: {
          _id: company._id,
          name: company.name,
          currency: company.currency
        }
      });

      // Log the registration
      await require('../models/AuditLog').logAction({
        action: 'user_created',
        performedBy: user._id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} registered and created company ${company.name}`,
        severity: 'medium'
      });

      logger.info(`New company registered: ${company.name} by ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: company._id,
          company: {
            id: company._id,
            name: company.name,
            currency: company.currency,
            country: company.country
          }
        }
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user with password
      const user = await User.findOne({ email }).select('+password').populate('companyId');
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated. Please contact administrator.' 
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      // Log the login
      await require('../models/AuditLog').logAction({
        action: 'user_login',
        performedBy: user._id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} logged in`,
        severity: 'low',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId._id,
          company: user.companyId,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed. Please try again.' 
      });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('companyId');

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get user data' 
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { name, department, position, phone, settings } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (department) updates.department = department;
      if (position) updates.position = position;
      if (phone) updates.phone = phone;
      if (settings) updates.settings = { ...req.user.settings, ...settings };

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password').populate('companyId');

      // Log the profile update
      await require('../models/AuditLog').logAction({
        action: 'user_updated',
        performedBy: req.user.id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} updated their profile`,
        severity: 'low'
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile' 
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user.id).select('+password');
      
      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Log the password change
      await require('../models/AuditLog').logAction({
        action: 'password_changed',
        performedBy: req.user.id,
        resourceType: 'user',
        resourceId: user._id,
        description: `User ${user.name} changed their password`,
        severity: 'medium'
      });

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to change password' 
      });
    }
  }

  // Logout user (client-side token destruction, this is for audit logging)
  async logout(req, res) {
    try {
      // Log the logout
      await require('../models/AuditLog').logAction({
        action: 'user_logout',
        performedBy: req.user.id,
        resourceType: 'user',
        resourceId: req.user.id,
        description: `User ${req.user.name} logged out`,
        severity: 'low',
        ipAddress: req.ip
      });

      logger.info(`User logged out: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
  }
}

module.exports = new AuthController();