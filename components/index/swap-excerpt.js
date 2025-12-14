// Swap Excerpt Module for index.html
// Displays real-time swap data (read-only excerpt)

const SwapExcerpt = {
  isInitialized: false,
  updateInterval: null,
  lastQuote: null,

  // Initialize the swap excerpt
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Swap Excerpt...');
    
    // Wait for swap modules to be available
    let retries = 0;
    const maxRetries = 20;
    while (retries < maxRetries) {
      if (window.QuoteManager && window.PriceManager && window.WalletManager) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!window.QuoteManager || !window.PriceManager) {
      console.warn('Swap modules not available for excerpt');
      return;
    }
    
    this.isInitialized = true;
    console.log('✅ Swap Excerpt initialized');
    
    // Load initial data
    await this.updateDisplay();
    
    // Set up auto-update (every 10 seconds)
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 10000);
  },

  // Update the display with current swap data
  async updateDisplay() {
    try {
      const container = document.getElementById('swapExcerptContent');
      if (!container) return;

      // Get current price from PriceManager
      let adrianPrice = '--';
      let ethPrice = '--';
      let ratio = '--';
      
      if (window.PriceManager && window.PriceManager.prices) {
        adrianPrice = window.PriceManager.prices.ADRIAN || '--';
        ethPrice = window.PriceManager.prices.ETH || '--';
      }

      // Get ratio from QuoteManager
      if (window.QuoteManager && window.QuoteManager.cachedRatio) {
        const ratioNumber = Number(window.QuoteManager.cachedRatio) / Number(10n ** 18n);
        ratio = ratioNumber.toLocaleString('en-US', { maximumFractionDigits: 0 });
      }

      // Get last quote if available
      if (window.QuoteManager && window.QuoteManager.lastQuote) {
        this.lastQuote = window.QuoteManager.lastQuote;
      }

      // Get user balance if wallet is connected
      let ethBalance = '--';
      let adrianBalance = '--';
      
      if (window.WalletManager && window.WalletManager.isConnected) {
        ethBalance = parseFloat(window.WalletManager.getBalance('ETH') || '0').toFixed(4);
        adrianBalance = parseFloat(window.WalletManager.getBalance('ADRIAN') || '0').toFixed(2);
      }

      // Render excerpt
      container.innerHTML = `
        <div class="excerpt-section">
          <div class="excerpt-item">
            <span class="excerpt-label">$ADRIAN Price</span>
            <span class="excerpt-value">$${adrianPrice}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">ETH Price</span>
            <span class="excerpt-value">$${ethPrice}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Ratio</span>
            <span class="excerpt-value">${ratio} ADRIAN/ETH</span>
          </div>
          ${window.WalletManager && window.WalletManager.isConnected ? `
            <div class="excerpt-item">
              <span class="excerpt-label">Your ETH</span>
              <span class="excerpt-value">${ethBalance}</span>
            </div>
            <div class="excerpt-item">
              <span class="excerpt-label">Your $ADRIAN</span>
              <span class="excerpt-value">${adrianBalance}</span>
            </div>
          ` : ''}
        </div>
        <div class="excerpt-footer">
          <a href="/swap/" class="btn btn-primary btn-sm w-100">Go to Swap</a>
        </div>
      `;
    } catch (error) {
      console.error('Error updating swap excerpt:', error);
    }
  },

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SwapExcerpt = SwapExcerpt;
}

