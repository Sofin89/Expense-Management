const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');

class OCRService {
  constructor() {
    this.workers = new Map();
    this.initializeWorkers();
  }

  async initializeWorkers() {
    try {
      // Pre-initialize worker for better performance
      const worker = await Tesseract.createWorker('eng');
      this.workers.set('default', worker);
      logger.info('OCR worker initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OCR worker:', error);
    }
  }

  async extractTextFromImage(imageBuffer) {
    let worker = this.workers.get('default');
    
    try {
      if (!worker) {
        worker = await Tesseract.createWorker('eng');
        this.workers.set('default', worker);
      }

      const { data: { text, confidence } } = await worker.recognize(imageBuffer);
      
      logger.info(`OCR completed with confidence: ${confidence}%`);
      return {
        text: text.trim(),
        confidence,
        raw: text
      };
    } catch (error) {
      logger.error('OCR processing failed:', error);
      throw new Error('Failed to process image with OCR');
    }
  }

  parseReceiptText(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const result = {
      amount: null,
      date: null,
      merchant: null,
      items: [],
      tax: null,
      total: null,
      confidence: 0
    };

    let confidenceFactors = [];

    // Extract amount patterns
    const amountPatterns = [
      /(?:total|amount|balance|due)[\s:]*[\$]?[\s]*([0-9]+[.,][0-9]{2})/i,
      /[\$]?\s*([0-9]+[.,][0-9]{2})\s*$/,
      /(?:total|amount):?\s*[\$]?\s*([0-9]+[.,][0-9]{2})/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        if (amount > 0 && (!result.amount || amount > result.amount)) {
          result.amount = amount;
          confidenceFactors.push(0.8);
        }
      }
    }

    // If no structured amount found, look for any currency patterns
    if (!result.amount) {
      const currencyMatches = text.match(/[\$]?\s*([0-9]+[.,][0-9]{2})/g);
      if (currencyMatches) {
        const amounts = currencyMatches.map(match => 
          parseFloat(match.replace(/[\$,]/g, ''))
        ).filter(amount => amount > 0);
        
        if (amounts.length > 0) {
          result.amount = Math.max(...amounts);
          confidenceFactors.push(0.6);
        }
      }
    }

    // Extract date patterns
    const datePatterns = [
      /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/,
      /(?:date|on)[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[1]);
          if (!isNaN(date.getTime()) && date <= new Date()) {
            result.date = date;
            confidenceFactors.push(0.7);
            break;
          }
        } catch (error) {
          // Continue to next pattern
        }
      }
    }

    // Extract merchant (usually first non-empty line that doesn't look like a date/amount)
    if (lines.length > 0) {
      const potentialMerchants = lines.slice(0, 3).filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 2 && 
               !trimmed.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/) && // Not a date
               !trimmed.match(/[\$]?\s*([0-9]+[.,][0-9]{2})/) && // Not an amount
               !trimmed.match(/^(receipt|invoice|total|subtotal|tax|change)/i); // Not a header
      });

      if (potentialMerchants.length > 0) {
        result.merchant = potentialMerchants[0].trim();
        confidenceFactors.push(0.5);
      }
    }

    // Extract line items
    result.items = lines
      .filter(line => {
        // Look for lines that might be items with prices
        return line.match(/[\$]?\s*([0-9]+[.,][0-9]{2})\s*$/);
      })
      .map(line => {
        const priceMatch = line.match(/[\$]?\s*([0-9]+[.,][0-9]{2})\s*$/);
        return {
          description: line.replace(priceMatch[0], '').trim(),
          amount: parseFloat(priceMatch[1].replace(',', ''))
        };
      });

    if (result.items.length > 0) {
      confidenceFactors.push(0.4);
    }

    // Calculate overall confidence
    if (confidenceFactors.length > 0) {
      result.confidence = confidenceFactors.reduce((sum, conf) => sum + conf, 0) / confidenceFactors.length;
    } else {
      result.confidence = 0.1; // Minimal confidence if nothing was found
    }

    logger.debug(`Receipt parsing completed with ${Math.round(result.confidence * 100)}% confidence`);
    return result;
  }

  async processReceipt(imageBuffer) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting receipt OCR processing');
      
      const ocrResult = await this.extractTextFromImage(imageBuffer);
      const parsedData = this.parseReceiptText(ocrResult.text);

      const processingTime = Date.now() - startTime;
      
      logger.info(`Receipt processing completed in ${processingTime}ms with ${Math.round(parsedData.confidence * 100)}% confidence`);

      return {
        success: true,
        data: parsedData,
        rawText: ocrResult.text,
        confidence: parsedData.confidence,
        processingTime,
        ocrConfidence: ocrResult.confidence
      };
    } catch (error) {
      logger.error('Receipt processing failed:', error);
      
      return {
        success: false,
        error: error.message,
        data: null,
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  async processMultipleReceipts(imageBuffers) {
    const results = [];
    
    for (const [index, buffer] of imageBuffers.entries()) {
      try {
        logger.info(`Processing receipt ${index + 1}/${imageBuffers.length}`);
        const result = await this.processReceipt(buffer);
        results.push({
          index,
          ...result
        });
      } catch (error) {
        logger.error(`Failed to process receipt ${index + 1}:`, error);
        results.push({
          index,
          success: false,
          error: error.message,
          data: null,
          confidence: 0
        });
      }
    }
    
    return results;
  }

  // Cleanup workers
  async cleanup() {
    for (const [name, worker] of this.workers) {
      try {
        await worker.terminate();
        logger.info(`OCR worker ${name} terminated`);
      } catch (error) {
        logger.error(`Error terminating OCR worker ${name}:`, error);
      }
    }
    this.workers.clear();
  }

  // Get service status
  getStatus() {
    return {
      workers: this.workers.size,
      initialized: this.workers.has('default'),
      memory: process.memoryUsage()
    };
  }
}

module.exports = new OCRService();