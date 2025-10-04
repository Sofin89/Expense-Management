const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'expense-management/receipts',
    format: async (req, file) => {
      // Preserve original format
      const ext = path.extname(file.originalname).toLowerCase();
      return ext.substring(1) || 'png'; // Default to png if no extension
    },
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const originalName = path.parse(file.originalname).name;
      return `${originalName}-${timestamp}-${random}`;
    },
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Resize large images
      { quality: 'auto' }, // Optimize quality
      { format: 'auto' } // Auto-format
    ]
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file upload
  }
});

// Custom file size error handler
const handleFileSizeError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
};

// Process uploaded file and add to request body
const processUploadedFile = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    // Add file information to request body for consistency
    req.body.receipt = {
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    };

    // Generate thumbnail URL for images (not PDFs)
    if (req.file.mimetype.startsWith('image/')) {
      const urlParts = req.file.path.split('/');
      const publicId = urlParts[urlParts.length - 1].split('.')[0];
      
      req.body.receipt.thumbnailUrl = cloudinary.url(publicId, {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        format: 'webp'
      });
    }

    logger.info(`File uploaded successfully: ${req.file.originalname} (${req.file.size} bytes)`);
    next();
  } catch (error) {
    logger.error('Error processing uploaded file:', error);
    next(error);
  }
};

// Delete file from Cloudinary (utility function)
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`File deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

// Upload middleware for receipt images
const uploadReceipt = [
  upload.single('receipt'),
  handleFileSizeError,
  processUploadedFile
];

module.exports = {
  uploadReceipt,
  deleteFile,
  cloudinary
};