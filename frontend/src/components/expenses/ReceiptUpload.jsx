import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Scan, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { extractTextFromImage } from '../../utils/ocr';

export const ReceiptUpload = ({ 
  onReceiptChange, 
  onOcrData, 
  previewUrl, 
  scanning = false,
  className 
}) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, PDF)');
      return;
    }

    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    onReceiptChange?.(file, preview);

    // Perform OCR
    try {
      const ocrResult = await extractTextFromImage(file);
      onOcrData?.(ocrResult);
    } catch (error) {
      console.error('OCR processing failed:', error);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect({ target: { files } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onReceiptChange?.(null, '');
    onOcrData?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {!previewUrl ? (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            className="hidden"
          />
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Upload receipt
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400">
                Supports JPG, PNG, PDF up to 10MB
              </p>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="mt-4"
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scan className="h-4 w-4 mr-2" />
              )}
              {scanning ? 'Scanning...' : 'Choose File'}
            </Button>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Receipt uploaded</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 border rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Receipt ready for processing
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {scanning ? 'Extracting details...' : 'Details extracted successfully'}
                </p>
                
                {scanning && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-xs text-blue-500">Processing OCR...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};