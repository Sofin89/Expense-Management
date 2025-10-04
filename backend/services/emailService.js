const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.useSendGrid = !!process.env.SENDGRID_API_KEY;
    this.isConfigured = false;
    
    this.initialize();
  }

  initialize() {
    try {
      if (this.useSendGrid) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.isConfigured = true;
        logger.info('SendGrid email service initialized');
      } else if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        this.isConfigured = true;
        logger.info('SMTP email service initialized');
      } else {
        logger.warn('No email service configured. Emails will be logged but not sent.');
      }
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, html, text = '') {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    const from = process.env.EMAIL_FROM || 'noreply@expensemanager.com';
    const emailData = { 
      to, 
      from, 
      subject, 
      html,
      text: text || this.htmlToText(html)
    };

    try {
      let result;
      
      if (this.useSendGrid) {
        result = await sgMail.send(emailData);
      } else {
        result = await this.transporter.sendMail(emailData);
      }

      // Log successful email
      await EmailLog.create({
        to,
        subject,
        status: 'sent',
        provider: this.useSendGrid ? 'sendgrid' : 'smtp',
        messageId: result.messageId || result[0]?.headers['message-id'],
        sentAt: new Date()
      });

      logger.info(`Email sent successfully to ${to}`, { 
        subject, 
        messageId: result.messageId 
      });

      return { 
        success: true, 
        messageId: result.messageId || result[0]?.headers['message-id'] 
      };
    } catch (error) {
      logger.error('Email sending failed:', error);

      // Log failed email
      await EmailLog.create({
        to,
        subject,
        status: 'failed',
        provider: this.useSendGrid ? 'sendgrid' : 'smtp',
        error: error.message,
        sentAt: new Date()
      });

      // Retry logic for specific errors
      if (this.shouldRetry(error)) {
        logger.info(`Email to ${to} will be retried`);
        return { 
          success: false, 
          error: error.message,
          shouldRetry: true 
        };
      }

      return { 
        success: false, 
        error: error.message,
        shouldRetry: false 
      };
    }
  }

  shouldRetry(error) {
    // Retry on network errors, rate limits, and temporary failures
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'EAI_AGAIN',
      'rate limit',
      'quota exceeded',
      'temporary failure',
      '429',
      '503'
    ];

    return retryableErrors.some(retryError => 
      error.message?.toLowerCase().includes(retryError.toLowerCase()) ||
      error.code?.toString().includes(retryError)
    );
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\s*\/?>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  async sendExpenseSubmittedEmail(expense, approvers) {
    const subject = `New Expense Submitted - ${expense.title}`;
    
    const html = this.generateExpenseSubmittedTemplate(expense, approvers);
    const text = this.generateExpenseSubmittedText(expense, approvers);

    const results = [];
    for (const approver of approvers) {
      if (approver.settings?.emailNotifications !== false) {
        const result = await this.sendEmail(approver.email, subject, html, text);
        results.push({
          approver: approver.email,
          success: result.success,
          error: result.error
        });
      } else {
        results.push({
          approver: approver.email,
          success: true,
          skipped: 'Email notifications disabled'
        });
      }
    }

    return results;
  }

  async sendExpenseStatusEmail(expense, action, comment = '') {
    const User = require('../models/User');
    const user = await User.findById(expense.userId);
    
    if (!user || user.settings?.emailNotifications === false) {
      return { success: true, skipped: 'User email notifications disabled' };
    }

    const actionText = action.charAt(0).toUpperCase() + action.slice(1);
    const subject = `Expense ${actionText} - ${expense.title}`;
    
    const html = this.generateExpenseStatusTemplate(expense, action, comment);
    const text = this.generateExpenseStatusText(expense, action, comment);

    return await this.sendEmail(user.email, subject, html, text);
  }

  async sendReminderEmail(expense, approver) {
    if (approver.settings?.emailNotifications === false) {
      return { success: true, skipped: 'Approver email notifications disabled' };
    }

    const subject = `Reminder: Expense Approval Required - ${expense.title}`;
    
    const html = this.generateReminderTemplate(expense, approver);
    const text = this.generateReminderText(expense, approver);

    return await this.sendEmail(approver.email, subject, html, text);
  }

  async sendWelcomeEmail(user, company, tempPassword = null) {
    const subject = `Welcome to ${company.name} Expense Management System`;
    
    const html = this.generateWelcomeTemplate(user, company, tempPassword);
    const text = this.generateWelcomeText(user, company, tempPassword);

    return await this.sendEmail(user.email, subject, html, text);
  }

  // Template generators
  generateExpenseSubmittedTemplate(expense, approvers) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .expense-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Expense Submission</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A new expense has been submitted and requires your approval.</p>
            
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Employee:</strong> ${expense.userId.name}</p>
              <p><strong>Title:</strong> ${expense.title}</p>
              <p><strong>Amount:</strong> ${expense.amount} ${expense.currency}</p>
              <p><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString()}</p>
              <p><strong>Category:</strong> ${expense.category}</p>
              ${expense.description ? `<p><strong>Description:</strong> ${expense.description}</p>` : ''}
            </div>

            <p>Please review this expense at your earliest convenience.</p>
            
            <a href="${frontendUrl}/expenses/${expense._id}" class="button">
              Review Expense
            </a>
          </div>
          <div class="footer">
            <p>This is an automated message from the Expense Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateExpenseStatusTemplate(expense, action, comment) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const actionColor = action === 'approved' ? '#28a745' : '#dc3545';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${actionColor}; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .expense-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Expense ${action.toUpperCase()}</h1>
          </div>
          <div class="content">
            <p>Hello ${expense.userId.name},</p>
            <p>Your expense "<strong>${expense.title}</strong>" has been <strong style="color: ${actionColor}">${action}</strong>.</p>
            
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Amount:</strong> ${expense.amount} ${expense.currency}</p>
              <p><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString()}</p>
              <p><strong>Category:</strong> ${expense.category}</p>
              ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
            </div>

            <a href="${frontendUrl}/expenses/${expense._id}" class="button">
              View Details
            </a>
          </div>
          <div class="footer">
            <p>This is an automated message from the Expense Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateReminderTemplate(expense, approver) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const daysPending = Math.floor((Date.now() - new Date(expense.createdAt)) / (1000 * 60 * 60 * 24));
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .expense-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .urgent { color: #dc3545; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Approval Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${approver.name},</p>
            <p>This is a friendly reminder that an expense is awaiting your approval.</p>
            
            <div class="expense-details">
              <h3>Expense Details:</h3>
              <p><strong>Employee:</strong> ${expense.userId.name}</p>
              <p><strong>Title:</strong> ${expense.title}</p>
              <p><strong>Amount:</strong> ${expense.amount} ${expense.currency}</p>
              <p><strong>Submitted:</strong> ${new Date(expense.createdAt).toLocaleDateString()}</p>
              <p><strong>Days Pending:</strong> ${daysPending} day(s)</p>
              ${daysPending > 3 ? `<p class="urgent">This expense has been pending for ${daysPending} days and requires your attention.</p>` : ''}
            </div>

            <p>Please review this expense as soon as possible.</p>
            
            <a href="${frontendUrl}/expenses/${expense._id}" class="button">
              Review Now
            </a>
          </div>
          <div class="footer">
            <p>This is an automated reminder from the Expense Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWelcomeTemplate(user, company, tempPassword) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const hasTempPassword = tempPassword !== null;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .credentials { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${company.name}!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>Your account has been created successfully for the ${company.name} Expense Management System.</p>
            
            <div class="user-details">
              <h3>Your Account Details:</h3>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Role:</strong> ${user.role}</p>
              <p><strong>Company:</strong> ${company.name}</p>
              <p><strong>Default Currency:</strong> ${company.currency}</p>
            </div>

            ${hasTempPassword ? `
            <div class="credentials">
              <h3>Your Temporary Password:</h3>
              <p><strong>${tempPassword}</strong></p>
              <p><em>Please change your password after first login for security.</em></p>
            </div>
            ` : ''}

            <p>You can now start submitting expenses and managing approvals through the system.</p>
            
            <a href="${frontendUrl}/dashboard" class="button">
              Go to Dashboard
            </a>
          </div>
          <div class="footer">
            <p>This is an automated welcome message from the Expense Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Text versions for fallback
  generateExpenseSubmittedText(expense, approvers) {
    return `
New Expense Submission

Hello,

A new expense has been submitted and requires your approval.

Expense Details:
- Employee: ${expense.userId.name}
- Title: ${expense.title}
- Amount: ${expense.amount} ${expense.currency}
- Date: ${new Date(expense.date).toLocaleDateString()}
- Category: ${expense.category}
${expense.description ? `- Description: ${expense.description}` : ''}

Please review this expense at your earliest convenience.

Review the expense here: ${process.env.FRONTEND_URL}/expenses/${expense._id}

This is an automated message from the Expense Management System.
    `.trim();
  }

  generateExpenseStatusText(expense, action, comment) {
    return `
Expense ${action.toUpperCase()}

Hello ${expense.userId.name},

Your expense "${expense.title}" has been ${action}.

Expense Details:
- Amount: ${expense.amount} ${expense.currency}
- Date: ${new Date(expense.date).toLocaleDateString()}
- Category: ${expense.category}
${comment ? `- Comment: ${comment}` : ''}

View details here: ${process.env.FRONTEND_URL}/expenses/${expense._id}

This is an automated message from the Expense Management System.
    `.trim();
  }

  generateReminderText(expense, approver) {
    const daysPending = Math.floor((Date.now() - new Date(expense.createdAt)) / (1000 * 60 * 60 * 24));
    
    return `
Approval Reminder

Hello ${approver.name},

This is a friendly reminder that an expense is awaiting your approval.

Expense Details:
- Employee: ${expense.userId.name}
- Title: ${expense.title}
- Amount: ${expense.amount} ${expense.currency}
- Submitted: ${new Date(expense.createdAt).toLocaleDateString()}
- Days Pending: ${daysPending} day(s)

Please review this expense as soon as possible.

Review the expense here: ${process.env.FRONTEND_URL}/expenses/${expense._id}

This is an automated reminder from the Expense Management System.
    `.trim();
  }

  generateWelcomeText(user, company, tempPassword) {
    return `
Welcome to ${company.name}!

Hello ${user.name},

Your account has been created successfully for the ${company.name} Expense Management System.

Your Account Details:
- Email: ${user.email}
- Role: ${user.role}
- Company: ${company.name}
- Default Currency: ${company.currency}

${tempPassword ? `
Your Temporary Password: ${tempPassword}

Please change your password after first login for security.
` : ''}

You can now start submitting expenses and managing approvals through the system.

Access your dashboard here: ${process.env.FRONTEND_URL}/dashboard

This is an automated welcome message from the Expense Management System.
    `.trim();
  }
}

module.exports = new EmailService();