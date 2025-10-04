const axios = require('axios');
const logger = require('../utils/logger');

class CurrencyService {
  constructor() {
    this.exchangeRates = {};
    this.lastUpdated = null;
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.fallbackRates = {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CAD: 1.25,
      AUD: 1.35,
      CHF: 0.92,
      CNY: 6.45,
      INR: 74.0
    };
  }

  async getExchangeRates(baseCurrency = 'USD') {
    // Return cached rates if still valid
    if (this.lastUpdated && 
        (Date.now() - this.lastUpdated < this.cacheDuration) && 
        this.exchangeRates[baseCurrency]) {
      logger.debug('Using cached exchange rates');
      return this.exchangeRates[baseCurrency];
    }

    try {
      logger.info(`Fetching fresh exchange rates for base: ${baseCurrency}`);
      
      // Using ExchangeRate-API (free tier)
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
        timeout: 5000
      });
      
      const rates = response.data.rates;
      
      // Cache the rates
      this.exchangeRates[baseCurrency] = rates;
      this.lastUpdated = Date.now();
      
      logger.info(`Successfully fetched exchange rates for ${baseCurrency}`);
      return rates;
    } catch (error) {
      logger.error('Error fetching exchange rates from API:', error.message);
      
      // Fallback to cached rates even if expired
      if (this.exchangeRates[baseCurrency]) {
        logger.warn('Using expired cached exchange rates as fallback');
        return this.exchangeRates[baseCurrency];
      }
      
      // Final fallback to static rates
      logger.warn('Using static fallback exchange rates');
      return this.fallbackRates;
    }
  }

  async convertAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates[toCurrency];
      
      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }

      const converted = amount * rate;
      logger.debug(`Converted ${amount} ${fromCurrency} to ${converted} ${toCurrency} (rate: ${rate})`);
      
      return this.roundCurrency(converted);
    } catch (error) {
      logger.error(`Currency conversion failed: ${amount} ${fromCurrency} to ${toCurrency}`, error);
      
      // Fallback conversion using USD as intermediate
      if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
        try {
          const toUSD = await this.convertAmount(amount, fromCurrency, 'USD');
          return await this.convertAmount(toUSD, 'USD', toCurrency);
        } catch (fallbackError) {
          logger.error('Fallback conversion also failed:', fallbackError);
        }
      }
      
      throw new Error(`Unable to convert ${amount} ${fromCurrency} to ${toCurrency}`);
    }
  }

  async convertToCompanyCurrency(amount, fromCurrency, companyCurrency) {
    return this.convertAmount(amount, fromCurrency, companyCurrency);
  }

  roundCurrency(amount) {
    // Round to 2 decimal places for currencies
    return Math.round(amount * 100) / 100;
  }

  async getSupportedCurrencies() {
    try {
      const rates = await this.getExchangeRates('USD');
      return Object.keys(rates).sort();
    } catch (error) {
      logger.error('Error getting supported currencies:', error);
      return Object.keys(this.fallbackRates).sort();
    }
  }

  async validateCurrency(currencyCode) {
    try {
      const supportedCurrencies = await this.getSupportedCurrencies();
      return supportedCurrencies.includes(currencyCode.toUpperCase());
    } catch (error) {
      logger.error('Error validating currency:', error);
      return Object.keys(this.fallbackRates).includes(currencyCode.toUpperCase());
    }
  }

  getCurrencySymbol(currencyCode) {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹'
    };
    
    return symbols[currencyCode] || currencyCode;
  }

  formatCurrency(amount, currencyCode, locale = 'en-US') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const symbol = this.getCurrencySymbol(currencyCode);
      return `${symbol}${this.roundCurrency(amount).toFixed(2)}`;
    }
  }

  // Force refresh of exchange rates (for admin purposes)
  async forceRefreshRates(baseCurrency = 'USD') {
    this.lastUpdated = null;
    delete this.exchangeRates[baseCurrency];
    
    return await this.getExchangeRates(baseCurrency);
  }

  // Get conversion rate between two currencies
  async getConversionRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = await this.getExchangeRates(fromCurrency);
    return rates[toCurrency] || null;
  }

  // Batch convert multiple amounts
  async batchConvert(conversions) {
    const results = [];
    
    for (const conversion of conversions) {
      try {
        const convertedAmount = await this.convertAmount(
          conversion.amount,
          conversion.fromCurrency,
          conversion.toCurrency
        );
        
        results.push({
          ...conversion,
          convertedAmount,
          success: true
        });
      } catch (error) {
        results.push({
          ...conversion,
          convertedAmount: null,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new CurrencyService();