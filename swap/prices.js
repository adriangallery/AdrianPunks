// Price Feed Module
// Fetches token prices from GeckoTerminal API
//
// ANTI-SANDWICH BOT PROTECTION:
// - NO hardcoded fallback ratios
// - Uses real-time contract ratio (via QuoteManager) for ADRIAN price calculation
// - Falls back to GeckoTerminal direct price if ratio unavailable
// - Returns 0 if no valid data (never uses stale/hardcoded values)

const PriceManager = {
  prices: {
    ETH: 0,
    ADRIAN: 0
  },
  lastUpdate: 0,
  updateInterval: 60000, // 60 segundos
  isUpdating: false,

  // Initialize price manager
  async init() {
    // Show initial prices (0.00) immediately
    this.updatePriceDisplay();
    
    await this.updatePrices();
    
    // Update prices every minute
    setInterval(() => {
      this.updatePrices();
    }, this.updateInterval);
  },

  // Get ETH price (GeckoTerminal) fallback 0
  async getETHPrice() {
    try {
      // WETH on Base
      const wethAddress = '0x4200000000000000000000000000000000000006';
      const url = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${wethAddress}`;
      const res = await fetch(url, { headers: { 'accept': 'application/json' } });
      const data = await res.json();
      const price = Number(data?.data?.attributes?.price_usd || 0);
      if (!isFinite(price) || price <= 0) throw new Error('Invalid price');
      return price;
    } catch (error) {
      console.error('Error fetching ETH price (GeckoTerminal):', error);
      return 0;
    }
  },

  // Calculate ADRIAN price based on real pool ratio from contract
  async getADRIANPrice() {
    try {
      // ADRIAN price is derived from ETH price and pool ratio; fallback GeckoTerminal
      const ethPrice = this.prices.ETH || await this.getETHPrice();
      
      // Try to get real-time ratio - no hardcoded fallbacks!
      let adrianPerEth = null;
      
      // Priority 1: Use cached ratio from QuoteManager (fetched from contract)
      if (window.QuoteManager && window.QuoteManager.cachedRatio) {
        // Convert BigInt to number safely (avoid overflow)
        adrianPerEth = Number(window.QuoteManager.cachedRatio) / Number(10n ** 18n);
        console.log('📊 Using cached contract ratio:', adrianPerEth.toLocaleString(), 'ADRIAN per ETH');
      }
      // Priority 2: Calculate from last quote
      else if (window.QuoteManager && window.QuoteManager.lastQuote) {
        const quote = window.QuoteManager.lastQuote;
        
        if (quote.fromSymbol === 'ADRIAN' && quote.toSymbol === 'ETH') {
          const adrianAmount = parseFloat(quote.amountIn);
          const ethAmount = parseFloat(quote.amountOut);
          if (adrianAmount > 0 && ethAmount > 0) {
            adrianPerEth = adrianAmount / ethAmount;
            console.log('📊 Using ratio from last quote:', adrianPerEth.toLocaleString(), 'ADRIAN per ETH');
          }
        } else if (quote.fromSymbol === 'ETH' && quote.toSymbol === 'ADRIAN') {
          const ethAmount = parseFloat(quote.amountIn);
          const adrianAmount = parseFloat(quote.amountOut);
          if (adrianAmount > 0 && ethAmount > 0) {
            adrianPerEth = adrianAmount / ethAmount;
            console.log('📊 Using ratio from last quote:', adrianPerEth.toLocaleString(), 'ADRIAN per ETH');
          }
        }
      }
      
      // If no ratio available, try GeckoTerminal direct
      if (!adrianPerEth || adrianPerEth === 0) {
        try {
          const adrianAddress = '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea';
          const url = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${adrianAddress}`;
          const res = await fetch(url, { headers: { 'accept': 'application/json' } });
          const data = await res.json();
          const price = Number(data?.data?.attributes?.price_usd || 0);
          if (!isFinite(price) || price <= 0) throw new Error('Invalid price');
          return price;
        } catch (e) {
          console.log('⏳ No pool ratio available yet - waiting for first quote');
          return 0;
        }
      }
      
      // Calculate price: 1 ADRIAN = ETH_PRICE / adrianPerEth
      const adrianPrice = ethPrice / adrianPerEth;
      
      return adrianPrice;
    } catch (error) {
      console.error('Error calculating ADRIAN price:', error);
      return 0;
    }
  },

  // Update all prices
  async updatePrices() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    try {
      // Get ETH price
      const ethPrice = await this.getETHPrice();
      this.prices.ETH = ethPrice;
      
      // Calculate ADRIAN price
      const adrianPrice = await this.getADRIANPrice();
      this.prices.ADRIAN = adrianPrice;
      
      this.lastUpdate = Date.now();
      
      console.log('💰 Prices updated:', {
        ETH: `$${ethPrice.toFixed(2)}`,
        ADRIAN: `$${adrianPrice.toFixed(8)}`
      });
      
      // Update price display cards
      this.updatePriceDisplay();
      
      // Update UI if amounts are present
      this.updateValueDisplays();
      
    } catch (error) {
      console.error('Error updating prices:', error);
    } finally {
      this.isUpdating = false;
    }
  },

  // Get price for a token
  getPrice(symbol) {
    return this.prices[symbol] || 0;
  },

  // Calculate USD value
  calculateUSDValue(amount, symbol) {
    const price = this.getPrice(symbol);
    const value = parseFloat(amount) * price;
    return isNaN(value) ? 0 : value;
  },

  // Update price display cards
  updatePriceDisplay() {
    const ethDisplay = document.getElementById('priceDisplayETH');
    const adrianDisplay = document.getElementById('priceDisplayADRIAN');
    
    if (ethDisplay) {
      ethDisplay.textContent = `$${this.prices.ETH.toFixed(2)}`;
    }
    
    if (adrianDisplay) {
      adrianDisplay.textContent = `$${this.prices.ADRIAN.toFixed(8)}`;
    }
  },

  // Update value displays in UI
  updateValueDisplays() {
    // From token value
    const fromAmount = document.getElementById('fromAmount');
    const fromSymbol = document.getElementById('fromTokenSymbol');
    const fromValueUSD = document.getElementById('fromValueUSD');
    
    if (fromAmount && fromSymbol && fromValueUSD && fromAmount.value) {
      const value = this.calculateUSDValue(fromAmount.value, fromSymbol.textContent);
      fromValueUSD.textContent = value.toFixed(2);
    }
    
    // To token value
    const toAmount = document.getElementById('toAmount');
    const toSymbol = document.getElementById('toTokenSymbol');
    const toValueUSD = document.getElementById('toValueUSD');
    
    if (toAmount && toSymbol && toValueUSD && toAmount.value) {
      const value = this.calculateUSDValue(toAmount.value, toSymbol.textContent);
      toValueUSD.textContent = value.toFixed(2);
    }
  },

  // Format price for display
  formatPrice(price) {
    if (price === 0) return '$0.00';
    if (price < 0.01) return `$${price.toFixed(8)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PriceManager = PriceManager;
}

