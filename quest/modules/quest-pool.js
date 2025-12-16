// Quest Pool Module
// Manages the vertical pixelated pool display showing contract balance

const QuestPool = {
  isInitialized: false,
  updateInterval: null,
  tokenContract: null,
  questContractAddress: null,
  maxAmount: 10_000_000, // 10M $ADRIAN
  
  // Initialize the pool module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Pool...');
    
    // Get config
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    this.questContractAddress = window.QUEST_CONFIG.PUNKQUEST_ADDRESS;
    this.maxAmount = window.QUEST_CONFIG.POOL_MAX_AMOUNT;
    
    // Initialize contracts if provider is available
    if (window.ethereum && window.ethers) {
      try {
        const provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.tokenContract = new window.ethers.Contract(
          window.QUEST_CONFIG.TOKEN_ADDRESS,
          window.QUEST_CONFIG.TOKEN_ABI,
          provider
        );
      } catch (error) {
        console.warn('Error initializing token contract:', error);
      }
    }
    
    this.isInitialized = true;
    console.log('✅ Quest Pool initialized');
    
    // Load initial data
    await this.updatePool();
    
    // Set up auto-update
    this.updateInterval = setInterval(() => {
      this.updatePool();
    }, window.QUEST_CONFIG.POOL_UPDATE_INTERVAL || 30000);
  },
  
  // Update the pool display
  async updatePool() {
    try {
      const ethers5 = window.ethers5Backup || window.ethers;
      if (!ethers5 || !ethers5.providers) {
        this.updateDisplay(0, this.maxAmount);
        return;
      }
      
      // Try to use read-only provider first (faster, no MetaMask rate limits)
      const rpcUrl = window.QUEST_CONFIG.RPC_URL || window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      
      try {
        const readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
          name: "base",
          chainId: 8453
        });
        
        const tokenReadContract = new ethers5.Contract(
          window.QUEST_CONFIG.TOKEN_ADDRESS,
          window.QUEST_CONFIG.TOKEN_ABI,
          readProvider
        );
        
        // Get contract balance (simple read) with timeout
        const balanceWei = await Promise.race([
          tokenReadContract.balanceOf(this.questContractAddress),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        
        const balance = parseFloat(ethers5.utils.formatUnits(balanceWei, 18));
        this.updateDisplay(balance, this.maxAmount);
      } catch (rpcError) {
        // If RPC fails (429 rate limit, etc.), silently fail and keep last known value
        // Don't spam console with rate limit errors
        if (rpcError.message && !rpcError.message.includes('429') && !rpcError.message.includes('rate limit')) {
          console.warn('RPC error updating pool (will retry):', rpcError.message);
        }
        // Keep displaying last known value instead of resetting to 0
      }
    } catch (error) {
      // Only log unexpected errors
      if (error.message && !error.message.includes('429') && !error.message.includes('rate limit')) {
        console.error('Error updating pool:', error);
      }
      // Don't reset display on error, keep last known value
    }
  },
  
  // Update the visual display
  updateDisplay(currentBalance, maxAmount) {
    try {
      const barsContainer = document.getElementById('questPoolBars');
      const balanceText = document.getElementById('questPoolBalance');
      const maxText = document.getElementById('questPoolMax');
      const percentageText = document.getElementById('questPoolPercentage');
      
      if (!barsContainer) return;
      
      // Calculate percentage
      const percentage = Math.min(100, (currentBalance / maxAmount) * 100);
      
      // Update text displays
      if (balanceText) {
        balanceText.textContent = currentBalance.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
      }
      
      if (maxText) {
        const maxFormatted = maxAmount >= 1_000_000 
          ? (maxAmount / 1_000_000).toFixed(0) + 'M'
          : maxAmount >= 1_000
          ? (maxAmount / 1_000).toFixed(0) + 'K'
          : maxAmount.toFixed(0);
        maxText.textContent = maxFormatted;
      }
      
      if (percentageText) {
        percentageText.textContent = `${percentage.toFixed(1)}%`;
      }
      
      // Generate pixel bars (20 bars total)
      const numBars = 20;
      const filledBars = (percentage / 100) * numBars;
      const fullFilledBars = Math.floor(filledBars);
      const partialAmount = filledBars - fullFilledBars;
      const hasPartial = partialAmount > 0.01 && percentage < 100; // Use small threshold to avoid floating point issues
      
      // Determine color based on percentage
      let colorClass = 'red';
      if (percentage >= window.QUEST_CONFIG.POOL_GREEN_THRESHOLD) {
        colorClass = 'green';
      } else if (percentage >= window.QUEST_CONFIG.POOL_YELLOW_THRESHOLD) {
        colorClass = 'yellow';
      }
      
      barsContainer.innerHTML = '';
      
      for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'quest-pool-bar';
        
        if (i < fullFilledBars) {
          // Fully filled bar
          bar.classList.add('active', colorClass);
        } else if (i === fullFilledBars && hasPartial) {
          // Partially filled bar
          bar.classList.add('active', colorClass, 'partial');
          const partialWidth = (partialAmount * 100);
          bar.style.setProperty('--partial-width', `${partialWidth}%`);
        } else {
          // Empty bar
          // No additional classes needed
        }
        
        barsContainer.appendChild(bar);
      }
    } catch (error) {
      console.error('Error updating pool display:', error);
    }
  },
  
  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuestPool = QuestPool;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.QUEST_CONFIG) {
      QuestPool.init();
    }
  });
} else {
  if (window.QUEST_CONFIG) {
    QuestPool.init();
  }
}

