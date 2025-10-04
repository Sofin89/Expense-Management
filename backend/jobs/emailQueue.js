const Queue = require('bull');
const emailService = require('../services/emailService');
const EmailLog = require('../models/EmailLog');
const logger = require('../utils/logger');

// Create email queue
const emailQueue = new Queue('email queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Email job types
const JOB_TYPES = {
  EXPENSE_SUBMITTED: 'expense_submitted',
  EXPENSE_STATUS_CHANGED: 'expense_status_changed',
  REMINDER: 'reminder',
  WELCOME: 'welcome'
};

// Add email to queue with retry configuration
const addEmailToQueue = async (jobType, data, options = {}) => {
  const jobOptions = {
    delay: options.delay || 0,
    attempts: options.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5 seconds initial delay
    },
    removeOnComplete: true,
    removeOnFail: false
  };

  return await emailQueue.add(jobType, data, jobOptions);
};

// Process email jobs
emailQueue.process(async (job) => {
  const { type, data } = job.data;
  
  try {
    logger.info(`Processing email job: ${type}`, { jobId: job.id });

    switch (type) {
      case JOB_TYPES.EXPENSE_SUBMITTED:
        await processExpenseSubmittedEmail(data);
        break;
      
      case JOB_TYPES.EXPENSE_STATUS_CHANGED:
        await processExpenseStatusEmail(data);
        break;
      
      case JOB_TYPES.REMINDER:
        await processReminderEmail(data);
        break;
      
      case JOB_TYPES.WELCOME:
        await processWelcomeEmail(data);
        break;
      
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }

    logger.info(`Email job completed successfully: ${type}`, { jobId: job.id });
    return { success: true, jobId: job.id };

  } catch (error) {
    logger.error(`Email job failed: ${type}`, { 
      jobId: job.id, 
      error: error.message,
      data: job.data 
    });

    // Update email log status
    if (data.emailLogId) {
      await EmailLog.findByIdAndUpdate(data.emailLogId, {
        status: 'failed',
        error: error.message,
        retryCount: job.attemptsMade
      });
    }

    throw error; // This will trigger retry
  }
});

// Job processors
const processExpenseSubmittedEmail = async (data) => {
  const { expense, approvers } = data;
  
  const emailLog = await EmailLog.create({
    to: approvers.map(a => a.email).join(','),
    subject: `New Expense Submitted - ${expense.title}`,
    type: JOB_TYPES.EXPENSE_SUBMITTED,
    status: 'processing',
    metadata: { expenseId: expense._id.toString() }
  });

  const result = await emailService.sendExpenseSubmittedEmail(expense, approvers);
  
  // Update email log with results
  await EmailLog.findByIdAndUpdate(emailLog._id, {
    status: 'sent',
    messageId: result.messageId,
    sentAt: new Date()
  });

  return result;
};

const processExpenseStatusEmail = async (data) => {
  const { expense, action, comment } = data;
  
  const user = await require('../models/User').findById(expense.userId);
  
  const emailLog = await EmailLog.create({
    to: user.email,
    subject: `Expense ${action.charAt(0).toUpperCase() + action.slice(1)} - ${expense.title}`,
    type: JOB_TYPES.EXPENSE_STATUS_CHANGED,
    status: 'processing',
    metadata: { 
      expenseId: expense._id.toString(),
      action,
      userId: user._id.toString()
    }
  });

  const result = await emailService.sendExpenseStatusEmail(expense, action, comment);
  
  await EmailLog.findByIdAndUpdate(emailLog._id, {
    status: 'sent',
    messageId: result.messageId,
    sentAt: new Date()
  });

  return result;
};

const processReminderEmail = async (data) => {
  const { expense, approver } = data;
  
  const emailLog = await EmailLog.create({
    to: approver.email,
    subject: `Reminder: Expense Approval Required - ${expense.title}`,
    type: JOB_TYPES.REMINDER,
    status: 'processing',
    metadata: { 
      expenseId: expense._id.toString(),
      approverId: approver._id.toString()
    }
  });

  const result = await emailService.sendReminderEmail(expense, approver);
  
  await EmailLog.findByIdAndUpdate(emailLog._id, {
    status: 'sent',
    messageId: result.messageId,
    sentAt: new Date()
  });

  return result;
};

const processWelcomeEmail = async (data) => {
  const { user, company } = data;
  
  const emailLog = await EmailLog.create({
    to: user.email,
    subject: `Welcome to ${company.name} Expense Management System`,
    type: JOB_TYPES.WELCOME,
    status: 'processing',
    metadata: { 
      userId: user._id.toString(),
      companyId: company._id.toString()
    }
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to ${company.name}!</h2>
      <p>Your account has been created successfully.</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p><strong>Company:</strong> ${company.name}</p>
      <p><strong>Default Currency:</strong> ${company.currency}</p>
      <p>You can now start submitting expenses and managing approvals.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard" 
         style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Go to Dashboard
      </a>
    </div>
  `;

  const result = await emailService.sendEmail(user.email, `Welcome to ${company.name}`, html);
  
  await EmailLog.findByIdAndUpdate(emailLog._id, {
    status: 'sent',
    messageId: result.messageId,
    sentAt: new Date()
  });

  return result;
};

// Queue event handlers
emailQueue.on('completed', (job, result) => {
  logger.info(`Email job completed: ${job.id}`, { 
    type: job.data.type,
    result 
  });
});

emailQueue.on('failed', (job, error) => {
  logger.error(`Email job failed: ${job.id}`, { 
    type: job.data.type,
    error: error.message,
    attemptsMade: job.attemptsMade 
  });
});

emailQueue.on('stalled', (job) => {
  logger.warn(`Email job stalled: ${job.id}`, { type: job.data.type });
});

emailQueue.on('waiting', (jobId) => {
  logger.info(`Email job waiting: ${jobId}`);
});

// Clean old jobs (keep 7 days of history)
const cleanOldJobs = async () => {
  try {
    const completedJobs = await emailQueue.getJobs(['completed'], 0, 1000);
    const failedJobs = await emailQueue.getJobs(['failed'], 0, 1000);
    
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const job of [...completedJobs, ...failedJobs]) {
      if (job.finishedOn < weekAgo) {
        await job.remove();
      }
    }
    
    logger.info('Cleaned old email jobs');
  } catch (error) {
    logger.error('Error cleaning old email jobs:', error);
  }
};

// Process queue (start worker)
const processQueue = () => {
  logger.info('Email queue processor started');
  
  // Clean old jobs every day
  setInterval(cleanOldJobs, 24 * 60 * 60 * 1000);
};

module.exports = {
  emailQueue,
  JOB_TYPES,
  addEmailToQueue,
  processQueue,
  cleanOldJobs
};