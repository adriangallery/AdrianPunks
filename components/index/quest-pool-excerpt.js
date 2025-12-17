// Quest Pool Excerpt Module for index.html
// Displays compact quest pool in sidebar

const QuestPoolExcerpt = {
  isInitialized: false,
  updateInterval: null,
  questContractAddress: null,
  maxAmount: 10_000_000, // 10M $ADRIAN
  
  // Initialize the quest pool excerpt
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Pool Excerpt...');
    
    // Load config from quest
    if (!window.QUEST_CONFIG) {
      // Try to load quest config
      try {
        const script = document.createElement('script');
        script.src = '../quest/config.js';
        script.onload = () => {
          if (window.QUEST_CONFIG) {
            this.initializePool();
          }
        };
        document.head.appendChild(script);
      } catch (error) {
        console.warn('Could not load QUEST_CONFIG:', error);
      }
    } else {
      this.initializePool();
    }
  },
  
  async initializePool() {
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    this.questContractAddress = window.QUEST_CONFIG.PUNKQUEST_ADDRESS;
    this.maxAmount = window.QUEST_CONFIG.POOL_MAX_AMOUNT;
    
    this.isInitialized = true;
    console.log('✅ Quest Pool Excerpt initialized');
    
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
      
      // Use read-only provider (faster, no MetaMask rate limits)
      const rpcUrl = window.QUEST_CONFIG.RPC_URL || window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      const readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
        name: "base",
        chainId: 8453
      });
      
      const tokenReadContract = new ethers5.Contract(
        window.QUEST_CONFIG.TOKEN_ADDRESS,
        window.QUEST_CONFIG.TOKEN_ABI,
        readProvider
      );
      
      // Get contract balance (simple read)
      const balanceWei = await tokenReadContract.balanceOf(this.questContractAddress);
      const balance = parseFloat(ethers5.utils.formatUnits(balanceWei, 18));
      
      this.updateDisplay(balance, this.maxAmount);
    } catch (error) {
      // Silently handle rate limits
      if (error.message && !error.message.includes('429') && !error.message.includes('rate limit')) {
        console.warn('Error updating quest pool:', error);
      }
    }
  },
  
  // Update the visual display
  updateDisplay(currentBalance, maxAmount) {
    try {
      const barsContainer = document.getElementById('questPoolExcerptBars');
      const balanceText = document.getElementById('questPoolExcerptBalance');
      const maxText = document.getElementById('questPoolExcerptMax');
      const percentageText = document.getElementById('questPoolExcerptPercentage');
      
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
      
      // Generate pixel bars (10 bars for compact version)
      const numBars = 10;
      const filledBars = (percentage / 100) * numBars;
      const fullFilledBars = Math.floor(filledBars);
      const hasPartial = filledBars % 1 !== 0 && percentage < 100;
      
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
          const partialHeight = ((filledBars - fullFilledBars) * 100);
          bar.style.setProperty('--partial-height', `${partialHeight}%`);
        } else {
          // Empty bar
          // No additional classes needed
        }
        
        barsContainer.appendChild(bar);
      }
    } catch (error) {
      console.error('Error updating quest pool display:', error);
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
  window.QuestPoolExcerpt = QuestPoolExcerpt;
}

