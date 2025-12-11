// Price Feed Module
// Fetches token prices from CoinGecko API

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
    await this.updatePrices();
    
    // Update prices every minute
    setInterval(() => {
      this.updatePrices();
    }, this.updateInterval);
  },

  // Get ETH price from CoinGecko
  async getETHPrice() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      const data = await response.json();
      return data.ethereum?.usd || 0;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return 0;
    }
  },

  // Calculate ADRIAN price based on pool ratio
  async getADRIANPrice() {
    try {
      // ADRIAN price is derived from ETH price and pool ratio
      const ethPrice = this.prices.ETH || await this.getETHPrice();
      
      // Pool ratio: approximately 1 ETH = 130,000 ADRIAN
      // So 1 ADRIAN = ETH_PRICE / 130,000
      const poolRatio = 130000;
      const adrianPrice = ethPrice / poolRatio;
      
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

