const cors = require('cors');

// Allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://localhost:3000',
  'https://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count'
  ]
};

// Development CORS (more permissive)
const devCorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200
};

// Choose CORS options based on environment
const corsMiddleware = process.env.NODE_ENV === 'production' 
  ? cors(corsOptions)
  : cors(devCorsOptions);

// Error handler for CORS
const corsErrorHandler = (err, req, res, next) => {
  if (err) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy restriction: Origin not allowed'
    });
  }
  next();
};

module.exports = {
  corsMiddleware,
  corsErrorHandler
};