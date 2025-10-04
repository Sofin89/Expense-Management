import { useState, useCallback } from 'react';
import { extractTextFromImage, validateOcrResults } from '../utils/ocr';

export const useOCR = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const scanReceipt = useCallback(async (imageFile) => {
    if (!imageFile) {
      setError('No image file provided');
      return null;
    }

    try {
      setScanning(true);
      setProgress(0);
      setError(null);
      setResults(null);

      console.log('🔍 Starting OCR scan...');
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);

      const ocrResult = await extractTextFromImage(imageFile);
      
      clearInterval(progressInterval);
      setProgress(100);

      // Validate results
      const validation = validateOcrResults(ocrResult);
      
      setResults({
        ...ocrResult,
        validation
      });

      console.log('✅ OCR scan completed:', ocrResult);
      return ocrResult;
    } catch (err) {
      console.error('❌ OCR scan failed:', err);
      setError(err.message || 'Failed to scan receipt');
      return null;
    } finally {
      setScanning(false);
      setTimeout(() => setProgress(0), 1000); // Reset progress after completion
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setProgress(0);
  }, []);

  const retryScan = useCallback((imageFile) => {
    clearResults();
    return scanReceipt(imageFile);
  }, [scanReceipt, clearResults]);

  return {
    // State
    scanning,
    progress,
    results,
    error,
    
    // Actions
    scanReceipt,
    clearResults,
    retryScan,
    
    // Derived state
    hasResults: !!results,
    isValid: results?.validation?.isValid,
    warnings: results?.validation?.warnings || []
  };
};