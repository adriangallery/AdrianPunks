// Activity Excerpt Module for index.html
// Displays ecosystem statistics and activity

const ActivityExcerpt = {
  isInitialized: false,
  updateInterval: null,
  supabaseClient: null,

  // Initialize the activity excerpt
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Activity Excerpt...');
    
    // Get Supabase client
    if (window.supabaseClient) {
      this.supabaseClient = window.supabaseClient;
    } else {
      try {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          const { createClient } = supabase;
          this.supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
      } catch (error) {
        console.warn('Supabase not available for activity excerpt:', error);
      }
    }
    
    this.isInitialized = true;
    console.log('✅ Activity Excerpt initialized');
    
    // Load initial data
    await this.updateDisplay();
    
    // Set up auto-update (every 30 seconds)
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 30000);
  },

  // Update the display with current activity data
  async updateDisplay() {
    try {
      const container = document.getElementById('activityExcerptContent');
      if (!container) return;

      let totalTransactions = 0;
      let totalVolume = 0;
      let adrianPrice = '--';

      // Get price from PriceManager if available
      if (window.PriceManager && window.PriceManager.prices) {
        adrianPrice = window.PriceManager.prices.ADRIAN || '--';
      }

      // Get transaction data from Supabase
      if (this.supabaseClient) {
        try {
          // Get total transactions count
          const { count: txCount } = await this.supabaseClient
            .from('trade_events')
            .select('*', { count: 'exact', head: true });
          
          if (txCount !== null) {
            totalTransactions = txCount;
          }

          // Get total volume (sum of all trade amounts)
          const { data: trades } = await this.supabaseClient
            .from('trade_events')
            .select('price_wei');
          
          if (trades && trades.length > 0 && window.ethers) {
            let totalWei = ethers.BigNumber.from(0);
            trades.forEach(trade => {
              if (trade.price_wei) {
                try {
                  // Convert to string to avoid overflow with scientific notation
                  const valueStr = String(trade.price_wei);
                  totalWei = totalWei.add(ethers.BigNumber.from(valueStr));
                } catch (e) {
                  console.warn('Error processing trade price:', e);
                }
              }
            });
            const totalEth = parseFloat(ethers.utils.formatUnits(totalWei, 18));
            totalVolume = totalEth;
          }
        } catch (error) {
          console.warn('Could not fetch activity data from Supabase:', error);
        }
      }

      // Format volume
      const formattedVolume = totalVolume >= 1 
        ? totalVolume.toFixed(2) + ' ETH'
        : (totalVolume * 1000).toFixed(2) + ' mETH';

      // Render excerpt
      container.innerHTML = `
        <div class="excerpt-section">
          <div class="excerpt-item">
            <span class="excerpt-label">Total Transactions</span>
            <span class="excerpt-value">${totalTransactions.toLocaleString()}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Total Volume</span>
            <span class="excerpt-value">${formattedVolume}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">$ADRIAN Price</span>
            <span class="excerpt-value">$${adrianPrice}</span>
          </div>
        </div>
        <div class="excerpt-footer">
          <a href="/activity/" class="btn btn-primary btn-sm w-100">View Activity</a>
        </div>
      `;
    } catch (error) {
      console.error('Error updating activity excerpt:', error);
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
  window.ActivityExcerpt = ActivityExcerpt;
}

