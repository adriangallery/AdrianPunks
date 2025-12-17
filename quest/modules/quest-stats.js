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
      
      // Calculate total rewards using Multicall for optimization
      let totalRewards = 0;
      try {
        const nftBalance = await this.nftContract.balanceOf(this.userAccount);
        const balance = nftBalance.toNumber();
        
        if (balance === 0) {
          const totalRewardsEl = document.getElementById('totalRewards');
          if (totalRewardsEl) {
            totalRewardsEl.textContent = '0 $ADRIAN';
          }
          return;
        }
        
        // Get all token IDs first
        const tokenIds = [];
        for (let i = 0; i < balance; i++) {
          try {
            const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
            // Check if token is staked
            const stakeInfo = await this.questContract.stakes(tokenId);
            if (stakeInfo.stakeStart.gt(0)) {
              tokenIds.push(tokenId);
            }
          } catch (e) {
            // Skip this token
          }
        }
        
        if (tokenIds.length === 0) {
          const totalRewardsEl = document.getElementById('totalRewards');
          if (totalRewardsEl) {
            totalRewardsEl.textContent = '0 $ADRIAN';
          }
          return;
        }
        
        // Use Multicall to get all rewards in one call
        const ethers5 = window.ethers5Backup || window.ethers;
        if (!ethers5 || !ethers5.Contract) {
          // Fallback to individual calls if ethers not available
          throw new Error('Ethers not available');
        }
        
        // Use read-only provider (Alchemy) instead of MetaMask to avoid rate limits
        const rpcUrl = window.QUEST_CONFIG.RPC_URL || window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
        const readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
          name: "base",
          chainId: 8453
        });
        const multicall = new ethers5.Contract(
          window.QUEST_CONFIG.MULTICALL3_ADDRESS,
          window.QUEST_CONFIG.MULTICALL3_ABI,
          readProvider
        );
        
        // Prepare calls for all staked tokens
        const calls = tokenIds.map(tokenId => ({
          target: window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          allowFailure: true,
          callData: this.questContract.interface.encodeFunctionData('pendingTotalReward', [tokenId])
        }));
        
        // Execute all calls in one transaction
        const results = await multicall.aggregate3(calls);
        const rewards = results
          .filter(result => result.success)
          .map(result => {
            try {
              const decoded = this.questContract.interface.decodeFunctionResult('pendingTotalReward', result.returnData);
              return decoded[0];
            } catch (e) {
              return ethers5.BigNumber.from(0);
            }
          });
        
        // Sum all rewards
        const total = rewards.reduce((acc, reward) => {
          try {
            return acc.add(reward);
          } catch (e) {
            return acc;
          }
        }, ethers5.BigNumber.from(0));
        
        totalRewards = parseFloat(ethers5.utils.formatUnits(total, 18));
      } catch (error) {
        console.warn('Error calculating total rewards (falling back to individual calls):', error);
        // Fallback to individual calls if Multicall fails
        try {
          const nftBalance = await this.nftContract.balanceOf(this.userAccount);
          const balance = nftBalance.toNumber();
          const ethers5 = window.ethers5Backup || window.ethers;
          
          for (let i = 0; i < balance; i++) {
            try {
              const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
              const stakeInfo = await this.questContract.stakes(tokenId);
              if (stakeInfo.stakeStart.gt(0)) {
                const pendingReward = await this.questContract.pendingTotalReward(tokenId);
                totalRewards += parseFloat(ethers5.utils.formatUnits(pendingReward, 18));
              }
            } catch (e) {
              // Skip this token
            }
          }
        } catch (fallbackError) {
          console.warn('Error in fallback reward calculation:', fallbackError);
        }
      }
      
      // Update total rewards
      const totalRewardsEl = document.getElementById('totalRewards');
      if (totalRewardsEl) {
        totalRewardsEl.textContent = totalRewards >= 1000000 
          ? (totalRewards / 1000000).toFixed(1) + 'M $ADRIAN'
          : totalRewards >= 1000 
          ? (totalRewards / 1000).toFixed(1) + 'K $ADRIAN'
          : totalRewards.toFixed(2) + ' $ADRIAN';
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

