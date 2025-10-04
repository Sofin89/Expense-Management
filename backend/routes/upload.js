const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadReceipt, deleteFile } = require('../middleware/upload');
const { fileUploadLimiter } = require('../middleware/rateLimit');

// @route   POST /api/upload/receipt
// @desc    Upload receipt file
// @access  Private
router.post(
  '/receipt',
  auth,
  fileUploadLimiter,
  uploadReceipt,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: req.body.receipt
    });
  }
);

// @route   DELETE /api/upload/receipt/:publicId
// @desc    Delete uploaded file
// @access  Private
router.delete(
  '/receipt/:publicId',
  auth,
  async (req, res) => {
    try {
      const { publicId } = req.params;
      
      await deleteFile(publicId);
      
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  }
);

// @route   GET /api/upload/signature
// @desc    Get Cloudinary upload signature (for direct client-side uploads)
// @access  Private
router.get(
  '/signature',
  auth,
  (req, res) => {
    try {
      const timestamp = Math.round((new Date()).getTime() / 1000);
      
      // In a real implementation, you might want to generate a signature
      // For now, we'll return the necessary credentials for client-side uploads
      res.json({
        success: true,
        data: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: process.env.CLOUDINARY_API_KEY,
          timestamp,
          folder: 'expense-management/receipts'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate upload signature'
      });
    }
  }
);

module.exports = router;