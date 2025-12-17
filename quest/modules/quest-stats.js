// Quest Stats Module
// Manages user and quest statistics display

const QuestStats = {
  isInitialized: false,
  updateInterval: null,
  questContract: null,
  tokenContract: null,
  nftContract: null,
  userAccount: null,
  
  // Initialize the stats module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Stats...');
    
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    this.isInitialized = true;
    console.log('✅ Quest Stats initialized');
    
    // Wait for contracts to be initialized
    this.waitForContracts();
  },
  
  // Wait for contracts to be available
  async waitForContracts() {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkContracts = setInterval(() => {
      attempts++;
      
      // Check if contracts are available from global scope
      if (window.questContract && window.tokenContract && window.userAccount) {
        this.questContract = window.questContract;
        this.tokenContract = window.tokenContract;
        this.nftContract = window.nftContract;
        this.userAccount = window.userAccount;
        
        clearInterval(checkContracts);
        this.updateStats();
        
        // Set up auto-update (every 30 seconds)
        this.updateInterval = setInterval(() => {
          this.updateStats();
        }, 30000);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkContracts);
        console.warn('Contracts not available after max attempts');
      }
    }, 1000);
  },
  
  // Update statistics display
  async updateStats() {
    try {
      if (!this.questContract) {
        // Try to get from global scope
        if (window.questContract) {
          this.questContract = window.questContract;
          this.tokenContract = window.tokenContract;
          this.nftContract = window.nftContract;
          this.userAccount = window.userAccount;
        } else {
          return;
        }
      }
      
      // Update user stats
      await this.updateUserStats();
      
      // Update quest info
      await this.updateQuestInfo();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  },
  
  // Update user statistics
  async updateUserStats() {
    try {
      if (!this.userAccount || !this.nftContract || !this.questContract) return;
      
      // Get staked count
      let stakedCount = 0;
      try {
        const nftBalance = await this.nftContract.balanceOf(this.userAccount);
        const balance = nftBalance.toNumber();
        
        // Check which NFTs are staked
        for (let i = 0; i < balance; i++) {
          try {
            const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
            const stakeInfo = await this.questContract.stakes(tokenId);
            if (stakeInfo.stakeStart.gt(0)) {
              stakedCount++;
            }
          } catch (e) {
            // Token might not be staked
          }
        }
      } catch (error) {
        console.warn('Error getting staked count:', error);
      }
      
      // Update staked count
      const stakedCountEl = document.getElementById('stakedCount');
      if (stakedCountEl) {
        stakedCountEl.textContent = stakedCount;
      }
      
      // Total Rewards is now calculated and updated by QuestRewards module
      // We just need to wait for it to be available or use the cached value
      if (window.QuestRewards && window.QuestRewards.currentTotalRewards !== undefined) {
        window.QuestRewards.updateTotalRewardsInStats();
      } else {
        // If QuestRewards hasn't loaded yet, show 0 temporarily
        const totalRewardsEl = document.getElementById('totalRewards');
        if (totalRewardsEl) {
          totalRewardsEl.textContent = '0.0000 $ADRIAN';
        }
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  },
  
  // Update quest information
  async updateQuestInfo() {
    try {
      if (!this.questContract) return;
      
      // Get total staked
      try {
        const totalStaked = await this.questContract.totalStaked();
        const totalStakedEl = document.getElementById('totalStaked');
        if (totalStakedEl) {
          totalStakedEl.textContent = totalStaked.toString();
        }
      } catch (error) {
        console.warn('Error getting total staked:', error);
      }
      
      // Get fees
      try {
        const activationFee = await this.questContract.activationFee();
        const exitFee = await this.questContract.exitFee();
        const claimFee = await this.questContract.claimFee();
        
        const activationFeeEl = document.getElementById('activationFee');
        if (activationFeeEl) {
          const fee = parseFloat(ethers.utils.formatUnits(activationFee, 18));
          activationFeeEl.textContent = fee >= 1000 
            ? (fee / 1000).toFixed(1) + 'K $ADRIAN'
            : fee.toFixed(1) + ' $ADRIAN';
        }
        
        const exitFeeEl = document.getElementById('exitFee');
        if (exitFeeEl) {
          const fee = parseFloat(ethers.utils.formatUnits(exitFee, 18));
          exitFeeEl.textContent = fee >= 1000 
            ? (fee / 1000).toFixed(1) + 'K $ADRIAN'
            : fee.toFixed(1) + ' $ADRIAN';
        }
        
        const claimFeeEl = document.getElementById('claimFee');
        if (claimFeeEl) {
          const fee = parseFloat(ethers.utils.formatUnits(claimFee, 18));
          claimFeeEl.textContent = fee >= 1000 
            ? (fee / 1000).toFixed(1) + 'K $ADRIAN'
            : fee.toFixed(1) + ' $ADRIAN';
        }
      } catch (error) {
        console.warn('Error getting fees:', error);
      }
    } catch (error) {
      console.error('Error updating quest info:', error);
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
  window.QuestStats = QuestStats;
}

