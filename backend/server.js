const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Import middleware
const { 
  successHandler, 
  errorHandler, 
  securityLogger, 
  requestLogger 
} = require('./middleware/logger');
const { 
  generalLimiter, 
  authLimiter, 
  suspiciousActivityLimiter 
} = require('./middleware/rateLimit');
const { corsMiddleware, corsErrorHandler } = require('./middleware/cors');
const { errorHandler: globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Config
const PORT = process.env.PORT || 5000;

// Database connection
const connectDB = require('./config/database');
connectDB();

// Apply middleware
app.use(corsMiddleware);
app.use(corsErrorHandler);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security logging
app.use(securityLogger);

// Request logging
app.use(requestLogger);
app.use(successHandler);
app.use(errorHandler);

// Rate limiting
app.use(generalLimiter);
app.use(suspiciousActivityLimiter);

// Health check route (no rate limiting)
app.use('/api/health', require('./routes/health'));

// Auth routes with specific rate limiting
app.use('/api/auth', authLimiter, require('./routes/auth'));

// API routes
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Socket.IO notification handler
require('./sockets/notificationHandler')(io);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connections
  await mongoose.connection.close();
  console.log('Database connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await mongoose.connection.close();
  console.log('Database connection closed');
  
  process.exit(0);
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  
  // Start background jobs
  if (process.env.NODE_ENV !== 'test') {
    require('./jobs/reminderJob').start();
    require('./jobs/emailQueue').processQueue();
    console.log('✅ Background jobs started');
  }
});

module.exports = app;