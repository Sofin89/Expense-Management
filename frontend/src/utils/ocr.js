import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (imageFile) => {
  try {
    console.log('Starting OCR processing...');
    
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageFile,
      'eng',
      { 
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${m.progress * 100}%`);
          }
        }
      }
    );
    
    console.log('OCR completed. Confidence:', confidence);
    console.log('Extracted text:', text.substring(0, 200) + '...');
    
    const parsedData = parseReceiptText(text);
    console.log('Parsed data:', parsedData);
    
    return {
      ...parsedData,
      confidence,
      rawText: text.substring(0, 500) // Keep first 500 chars for reference
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process receipt image');
  }
};

const parseReceiptText = (text) => {
  const result = {
    amount: null,
    date: null,
    merchant: null,
    items: []
  };
  
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  
  // Extract merchant (usually first non-empty line)
  if (lines.length > 0) {
    result.merchant = lines[0].trim().substring(0, 100);
  }
  
  // Extract amount (look for currency patterns)
  const amountPatterns = [
    /(?:total|amount|balance)[:\s]*[\$€£]?\s*(\d+[.,]\d{2})/i,
    /[\$€£]?\s*(\d+[.,]\d{2})\s*(?:USD|EUR|GBP)?/,
    /(\d+[.,]\d{2})\s*[\$€£]/
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amountStr = match[1].replace(',', '.');
      result.amount = parseFloat(amountStr);
      if (!isNaN(result.amount)) break;
    }
  }
  
  // Extract date (common date formats)
  const datePatterns = [
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
    /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const date = new Date(match[0]);
        if (!isNaN(date.getTime())) {
          result.date = date;
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  // Extract line items (lines with amounts)
  lines.forEach(line => {
    const itemMatch = line.match(/(.+?)\s+([\$€£]?\s*\d+[.,]\d{2})/);
    if (itemMatch && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('subtotal')) {
      result.items.push({
        description: itemMatch[1].trim(),
        amount: parseFloat(itemMatch[2].replace(/[^\d.,]/g, '').replace(',', '.'))
      });
    }
  });
  
  return result;
};

// Helper function to validate OCR results
export const validateOcrResults = (ocrData) => {
  const warnings = [];
  
  if (!ocrData.amount) {
    warnings.push('Could not detect amount from receipt');
  }
  
  if (!ocrData.merchant) {
    warnings.push('Could not detect merchant name');
  }
  
  if (!ocrData.date) {
    warnings.push('Could not detect date from receipt');
  }
  
  if (ocrData.confidence < 70) {
    warnings.push('Low confidence in text recognition');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
};