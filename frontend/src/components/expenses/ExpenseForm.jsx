import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Scan, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useExpenses } from '../../hooks/useExpenses';
import { extractTextFromImage } from '../../utils/ocr';
import { useAuthStore } from '../../store/authStore';

const categories = [
  'Travel',
  'Meals',
  'Entertainment',
  'Office Supplies',
  'Software',
  'Hardware',
  'Training',
  'Other'
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export const ExpenseForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    currency: 'USD',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt: null
  });
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errors, setErrors] = useState({});
  const { createExpense } = useExpenses();
  const { company } = useAuthStore();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setUploading(true);

    // Create FormData for file upload
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('amount', formData.amount);
    submitData.append('currency', formData.currency);
    submitData.append('category', formData.category);
    submitData.append('date', formData.date);
    submitData.append('description', formData.description);
    if (formData.receipt) {
      submitData.append('receipt', formData.receipt);
    }
    submitData.append('companyCurrency', company?.currency || 'USD');

    const result = await createExpense(submitData);

    if (result.success) {
      // Reset form
      setFormData({
        title: '',
        amount: '',
        currency: 'USD',
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receipt: null
      });
      setPreviewUrl('');
      setErrors({});
      onSuccess?.();
    } else {
      alert(result.error);
    }

    setUploading(false);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
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

    setFormData(prev => ({ ...prev, receipt: file }));
    setPreviewUrl(URL.createObjectURL(file));

    // Auto-scan receipt for OCR data
    setScanning(true);
    try {
      const ocrResult = await extractTextFromImage(file);
      
      if (ocrResult) {
        setFormData(prev => ({
          ...prev,
          amount: ocrResult.amount ? ocrResult.amount.toString() : prev.amount,
          title: ocrResult.merchant || prev.title,
          date: ocrResult.date ? ocrResult.date.toISOString().split('T')[0] : prev.date,
          description: prev.description || `Scanned receipt from ${ocrResult.merchant || 'unknown merchant'}`
        }));
      }
    } catch (error) {
      console.error('OCR scanning failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const removeReceipt = () => {
    setFormData(prev => ({ ...prev, receipt: null }));
    setPreviewUrl('');
    URL.revokeObjectURL(previewUrl);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Submit New Expense</CardTitle>
          <CardDescription>
            Fill out the form below to submit an expense for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Expense title"
                  className={errors.title ? 'border-red-500' : ''}
                  required
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`input ${errors.category ? 'border-red-500' : ''}`}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={errors.amount ? 'border-red-500' : ''}
                  required
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="input"
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={errors.date ? 'border-red-500' : ''}
                  required
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input resize-none"
                placeholder="Additional details about this expense..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Receipt</label>
              {!previewUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    id="receipt"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                  <label htmlFor="receipt" className="cursor-pointer block">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Upload receipt image
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, PDF up to 10MB
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="mt-2"
                      disabled={scanning}
                    >
                      {scanning ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Scan className="h-4 w-4 mr-2" />
                      )}
                      {scanning ? 'Scanning...' : 'Upload & Scan'}
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="relative inline-block">
                  <div className="border rounded-lg p-4">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="w-full max-w-xs rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeReceipt}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {scanning && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={uploading}
              size="lg"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};