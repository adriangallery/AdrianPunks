// Quest Rewards Module
// Manages rewards display and claiming

const QuestRewards = {
  isInitialized: false,
  updateInterval: null,
  questContract: null,
  tokenContract: null,
  nftContract: null,
  userAccount: null,
  nftData: [],
  readProvider: null,
  cache: {
    data: null,
    timestamp: 0,
    ttl: 10000 // 10 seconds cache
  },
  updateDebounceTimer: null,
  
  // Initialize the rewards module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Rewards...');
    
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    // Load NFT metadata
    await this.loadNFTData();
    
    this.isInitialized = true;
    console.log('✅ Quest Rewards initialized');
    
    // Wait for contracts
    this.waitForContracts();
  },
  
  // Load NFT metadata
  async loadNFTData() {
    try {
      const response = await fetch('../punkquest/adrianpunks.json');
      const data = await response.json();
      this.nftData = data.collection || [];
    } catch (error) {
      console.warn('Error loading NFT data:', error);
      this.nftData = [];
    }
  },
  
  // Initialize read-only provider
  initReadProvider() {
    try {
      const ethers5 = window.ethers5Backup || window.ethers;
      if (!ethers5 || !ethers5.providers) return;
      
      const rpcUrl = window.QUEST_CONFIG.RPC_URL || window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      this.readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
        name: "base",
        chainId: 8453
      });
    } catch (error) {
      console.warn('Error initializing read provider:', error);
    }
  },
  
  // Wait for contracts to be available
  async waitForContracts() {
    const maxAttempts = 10;
    let attempts = 0;
    
    // Initialize read provider
    this.initReadProvider();
    
    const checkContracts = setInterval(() => {
      attempts++;
      
      if (window.questContract && window.nftContract && window.userAccount) {
        this.questContract = window.questContract;
        this.nftContract = window.nftContract;
        this.tokenContract = window.tokenContract;
        this.userAccount = window.userAccount;
        
        clearInterval(checkContracts);
        this.updateRewardsDisplay();
        
        // Set up auto-update (every 30 seconds)
        this.updateInterval = setInterval(() => {
          this.updateRewardsDisplay();
        }, 30000);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkContracts);
        this.showNotConnected();
      }
    }, 1000);
  },
  
  // Show not connected message
  showNotConnected() {
    const container = document.getElementById('rewardsContent');
    if (container) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Please connect your wallet to view rewards</p>';
    }
  },
  
  // Retry with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const errorMsg = error?.message || error?.toString() || '';
        const isRpcError = errorMsg.includes('429') || 
                          errorMsg.includes('rate limit') || 
                          errorMsg.includes('Internal JSON-RPC error') ||
                          errorMsg.includes('Too Many Requests') ||
                          errorMsg.includes('timeout') ||
                          errorMsg.includes('TIMEOUT');
        
        if (attempt === maxRetries - 1 || !isRpcError) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  
  // Check if cache is valid
  isCacheValid() {
    return this.cache.data && (Date.now() - this.cache.timestamp) < this.cache.ttl;
  },
  
  // Fetch rewards using Multicall3 (optimized)
  async fetchRewardsWithMulticall() {
    const ethers5 = window.ethers5Backup || window.ethers;
    if (!ethers5 || !ethers5.Contract) {
      throw new Error('Ethers not available');
    }
    
    // Use read provider if available, otherwise fallback to contract provider
    const provider = this.readProvider || this.questContract?.provider || 
                     (window.ethereum ? new ethers5.providers.Web3Provider(window.ethereum) : null);
    
    if (!provider) {
      throw new Error('No provider available');
    }
    
    // Create read-only contracts
    const nftReadContract = new ethers5.Contract(
      window.QUEST_CONFIG.NFT_ADDRESS,
      window.QUEST_CONFIG.NFT_ABI,
      provider
    );
    
    const questReadContract = new ethers5.Contract(
      window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
      window.QUEST_CONFIG.QUEST_ABI,
      provider
    );
    
    const multicallContract = new ethers5.Contract(
      window.QUEST_CONFIG.MULTICALL3_ADDRESS,
      window.QUEST_CONFIG.MULTICALL3_ABI,
      provider
    );
    
    // Step 1: Get balance
    const nftBalance = await this.retryWithBackoff(
      () => nftReadContract.balanceOf(this.userAccount),
      3,
      1000
    );
    const balance = nftBalance.toNumber();
    
    if (balance === 0) {
      return { rewards: [], totalRewards: 0 };
    }
    
    // Step 2: Get all token IDs using Multicall (in chunks of 50)
    const CHUNK_SIZE = 50;
    const tokenIds = [];
    
    for (let chunkStart = 0; chunkStart < balance; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, balance);
      const tokenIdCalls = [];
      
      for (let i = chunkStart; i < chunkEnd; i++) {
        tokenIdCalls.push({
          target: window.QUEST_CONFIG.NFT_ADDRESS,
          allowFailure: true,
          callData: nftReadContract.interface.encodeFunctionData('tokenOfOwnerByIndex', [this.userAccount, i])
        });
      }
      
      const tokenIdResults = await this.retryWithBackoff(
        () => Promise.race([
          multicallContract.aggregate3(tokenIdCalls),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        ]),
        3,
        1000
      );
      
      const chunkTokenIds = tokenIdResults
        .filter(result => result.success)
        .map(result => {
          try {
            const decoded = nftReadContract.interface.decodeFunctionResult('tokenOfOwnerByIndex', result.returnData);
            return decoded[0].toNumber();
          } catch (e) {
            return null;
          }
        })
        .filter(id => id !== null);
      
      tokenIds.push(...chunkTokenIds);
      
      // Small delay between chunks to avoid overwhelming RPC
      if (chunkEnd < balance) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (tokenIds.length === 0) {
      return { rewards: [], totalRewards: 0 };
    }
    
    // Step 3: Get stakes info using Multicall (in chunks)
    const stakeInfoMap = new Map();
    
    for (let chunkStart = 0; chunkStart < tokenIds.length; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, tokenIds.length);
      const stakeCalls = [];
      
      for (let i = chunkStart; i < chunkEnd; i++) {
        stakeCalls.push({
          target: window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          allowFailure: true,
          callData: questReadContract.interface.encodeFunctionData('stakes', [tokenIds[i]])
        });
      }
      
      const stakeResults = await this.retryWithBackoff(
        () => Promise.race([
          multicallContract.aggregate3(stakeCalls),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        ]),
        3,
        1000
      );
      
      for (let i = 0; i < stakeResults.length; i++) {
        if (stakeResults[i].success) {
          try {
            const decoded = questReadContract.interface.decodeFunctionResult('stakes', stakeResults[i].returnData);
            stakeInfoMap.set(tokenIds[chunkStart + i], {
              stakeStart: decoded[0],
              lastClaim: decoded[1]
            });
          } catch (e) {
            // Skip this token
          }
        }
      }
      
      if (chunkEnd < tokenIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Filter only staked tokens
    const stakedTokenIds = tokenIds.filter(tokenId => {
      const stakeInfo = stakeInfoMap.get(tokenId);
      const isStaked = stakeInfo && stakeInfo.stakeStart.gt(0);
      if (isStaked) {
        console.log(`Token #${tokenId} is staked - stakeStart: ${stakeInfo.stakeStart.toString()}, lastClaim: ${stakeInfo.lastClaim.toString()}`);
      }
      return isStaked;
    });
    
    console.log(`Found ${stakedTokenIds.length} staked tokens out of ${tokenIds.length} total tokens`);
    
    if (stakedTokenIds.length === 0) {
      return { rewards: [], totalRewards: 0 };
    }
    
    // Step 4: Get rewards using Multicall (in chunks) - use getTokenDetailedInfo for consistency with punkquest
    const rewards = [];
    let totalRewards = 0; // Sum rewards in tokens (not wei)
    
    for (let chunkStart = 0; chunkStart < stakedTokenIds.length; chunkStart += CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, stakedTokenIds.length);
      const rewardCalls = [];
      
      for (let i = chunkStart; i < chunkEnd; i++) {
        // Use getTokenDetailedInfo instead of pendingTotalReward directly
        // This matches how punkquest/index.html reads rewards (index 6 = pending)
        rewardCalls.push({
          target: window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          allowFailure: true,
          callData: questReadContract.interface.encodeFunctionData('getTokenDetailedInfo', [stakedTokenIds[i]])
        });
      }
      
      const rewardResults = await this.retryWithBackoff(
        () => Promise.race([
          multicallContract.aggregate3(rewardCalls),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
        ]),
        3,
        1000
      );
      
        for (let i = 0; i < rewardResults.length; i++) {
          const tokenId = stakedTokenIds[chunkStart + i];
          if (rewardResults[i].success) {
            try {
              // Decode getTokenDetailedInfo result: (stakeStart, lastClaim, fast, itemsBonus, spec, fix, pending)
              // We need index 6 (pending reward)
              // IMPORTANT: The reward value is already in ADRIAN tokens (not wei), matching punkquest/index.html
              const decoded = questReadContract.interface.decodeFunctionResult('getTokenDetailedInfo', rewardResults[i].returnData);
              const reward = decoded[6]; // pending reward is at index 6
              const rewardAmount = Number(reward); // Value is already in tokens, not wei
            
            // Always add to total if reward > 0
            // The reward is already in tokens, so we sum directly
            if (rewardAmount > 0) {
              totalRewards = totalRewards + rewardAmount;
            }
            
            const nftMeta = this.nftData.find(nft => {
              if (nft.name) {
                const parts = nft.name.split('#');
                return parts.length === 2 && parseInt(parts[1]) === tokenId;
              }
              return false;
            });
            
            // Show all staked tokens, even with very small rewards
            // The user should see all their staked NFTs
            rewards.push({
              tokenId: tokenId,
              reward: rewardAmount,
              image: nftMeta ? nftMeta.image : `../market/adrianpunksimages/${tokenId}.png`
            });
          } catch (e) {
            console.warn(`Error decoding reward for token #${tokenId}:`, e);
            // Skip this token
          }
        } else {
          console.warn(`Failed to get reward for token #${tokenId} - result not successful`);
        }
      }
      
      if (chunkEnd < stakedTokenIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      rewards: rewards.sort((a, b) => a.tokenId - b.tokenId),
      totalRewards: totalRewards // Already in tokens, not wei
    };
  },
  
  // Update rewards display (optimized with Multicall3 and caching)
  async updateRewardsDisplay(force = false) {
    // Debounce rapid calls
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    return new Promise((resolve) => {
      this.updateDebounceTimer = setTimeout(async () => {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        this.showNotConnected();
            resolve();
        return;
      }
      
      const container = document.getElementById('rewardsContent');
          if (!container) {
            resolve();
            return;
          }
          
          // Check cache first (unless forced)
          if (!force && this.isCacheValid()) {
            this.renderRewards(this.cache.data.rewards, this.cache.data.totalRewards, container);
            resolve();
            return;
          }
          
          // Fetch rewards using Multicall3
          let rewardsData;
          try {
            rewardsData = await this.fetchRewardsWithMulticall();
          } catch (error) {
            // Fallback to individual calls if Multicall3 fails
            const errorMsg = error?.message || error?.toString() || '';
            const isRpcError = errorMsg.includes('429') || 
                              errorMsg.includes('rate limit') || 
                              errorMsg.includes('Internal JSON-RPC error') ||
                              errorMsg.includes('Too Many Requests') ||
                              errorMsg.includes('timeout') ||
                              errorMsg.includes('TIMEOUT');
            
            if (isRpcError) {
              // Use cached data if available, otherwise show error
              if (this.cache.data) {
                this.renderRewards(this.cache.data.rewards, this.cache.data.totalRewards, container);
                resolve();
                return;
              }
            }
            
            // Try fallback to individual calls (slower but more reliable)
            console.warn('Multicall3 failed, falling back to individual calls:', error);
            rewardsData = await this.fetchRewardsFallback();
          }
          
          // Update cache
          this.cache.data = rewardsData;
          this.cache.timestamp = Date.now();
          
          // Render rewards
          this.renderRewards(rewardsData.rewards, rewardsData.totalRewards, container);
          resolve();
        } catch (error) {
          // Suppress RPC errors
          const errorMsg = error?.message || error?.toString() || '';
          const isRpcError = errorMsg.includes('429') || 
                            errorMsg.includes('rate limit') || 
                            errorMsg.includes('Internal JSON-RPC error') ||
                            errorMsg.includes('Too Many Requests') ||
                            errorMsg.includes('timeout') ||
                            errorMsg.includes('TIMEOUT');
          
          if (!isRpcError) {
            console.error('Error updating rewards display:', error);
            const container = document.getElementById('rewardsContent');
            if (container) {
              container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Error loading rewards</p>';
            }
          } else if (this.cache.data) {
            // Use cached data on RPC errors
            const container = document.getElementById('rewardsContent');
            if (container) {
              this.renderRewards(this.cache.data.rewards, this.cache.data.totalRewards, container);
            }
          }
          resolve();
        }
      }, force ? 0 : 300); // 300ms debounce
    });
  },
  
  // Fallback to individual calls (slower but more reliable)
  async fetchRewardsFallback() {
    const ethers5 = window.ethers5Backup || window.ethers;
    const rewards = [];
    let totalRewards = 0;
    
    try {
      const nftBalance = await this.nftContract.balanceOf(this.userAccount);
      const balance = nftBalance.toNumber();
      
      if (balance === 0) {
        return { rewards: [], totalRewards: 0 };
      }
      
      // Process in smaller batches to avoid overwhelming
      const BATCH_SIZE = 10;
      for (let batchStart = 0; batchStart < balance; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, balance);
        
        for (let i = batchStart; i < batchEnd; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
          const tokenIdNum = tokenId.toNumber();
          
          // Check if staked
          const stakeInfo = await this.questContract.stakes(tokenIdNum);
          if (!stakeInfo.stakeStart.gt(0)) {
            continue;
          }
          
            // Get reward using getTokenDetailedInfo (matches how punkquest reads rewards)
            // IMPORTANT: The reward value is already in ADRIAN tokens (not wei), matching punkquest/index.html
            const tokenInfo = await this.questContract.getTokenDetailedInfo(tokenIdNum);
            const pendingReward = tokenInfo[6]; // pending reward is at index 6
            const rewardAmount = Number(pendingReward); // Value is already in tokens, not wei
            
            if (rewardAmount > 0) {
              totalRewards += rewardAmount;
              
            const nftMeta = this.nftData.find(nft => {
              if (nft.name) {
                const parts = nft.name.split('#');
                return parts.length === 2 && parseInt(parts[1]) === tokenIdNum;
              }
              return false;
            });
            
            rewards.push({
              tokenId: tokenIdNum,
                reward: rewardAmount,
              image: nftMeta ? nftMeta.image : `../market/adrianpunksimages/${tokenIdNum}.png`
            });
          }
        } catch (error) {
            // Suppress RPC errors
            const errorMsg = error?.message || error?.toString() || '';
            if (!errorMsg.includes('429') && 
                !errorMsg.includes('rate limit') && 
                !errorMsg.includes('Internal JSON-RPC error') &&
                !errorMsg.includes('Too Many Requests')) {
              // Only log non-RPC errors
            }
          }
        }
        
        // Small delay between batches
        if (batchEnd < balance) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      // Suppress RPC errors
      const errorMsg = error?.message || error?.toString() || '';
      if (!errorMsg.includes('429') && 
          !errorMsg.includes('rate limit') && 
          !errorMsg.includes('Internal JSON-RPC error') &&
          !errorMsg.includes('Too Many Requests')) {
        throw error;
      }
    }
    
    return {
      rewards: rewards.sort((a, b) => a.tokenId - b.tokenId),
      totalRewards: totalRewards
    };
  },
  
  // Format reward amount with proper precision (matching punkquest/game.html formatReward)
  formatReward(amount) {
    if (amount === 0) return '0.0000';
    if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + 'K';
    }
    // Use toLocaleString with 4 decimal places like punkquest/game.html
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 4, 
      maximumFractionDigits: 4 
    });
  },
  
  // Render rewards list
  renderRewards(rewards, totalRewards, container) {
    if (rewards.length === 0) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">No pending rewards</p>';
      return;
    }
    
    const totalRewardsFormatted = this.formatReward(totalRewards);
    
    const html = `
      <div class="mb-3" style="padding: 1rem; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 0.5rem;">Total Pending</div>
        <div style="font-size: 1.5rem; font-weight: 600;">${totalRewardsFormatted} $ADRIAN</div>
        <button 
          class="btn-quest btn-quest-primary" 
          onclick="QuestRewards.claimAll()"
          style="margin-top: 0.75rem; width: 100%;"
        >
          Claim All
        </button>
      </div>
      ${rewards.map(reward => {
        const rewardFormatted = this.formatReward(reward.reward);
        
        return `
          <div class="card mb-2" style="background: var(--card-bg); border-color: var(--border-color);">
            <div class="card-body p-2">
              <div class="d-flex align-items-center gap-2">
                <img src="${reward.image}" alt="NFT #${reward.tokenId}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center">
                    <span style="font-weight: 600;">#${reward.tokenId}</span>
                    <span style="font-weight: 600; color: #10b981;">${rewardFormatted} $ADRIAN</span>
                  </div>
                  <button 
                    class="btn-quest btn-quest-primary" 
                    onclick="QuestRewards.claim(${reward.tokenId})"
                    style="margin-top: 0.5rem; width: 100%; font-size: 0.85rem;"
                  >
                    Claim
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    `;
    
    container.innerHTML = html;
  },
  
  // Claim rewards for a specific NFT
  async claim(tokenId) {
    try {
      if (!this.questContract || !this.tokenContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Get claim fee
      const claimFee = await this.questContract.claimFee();
      
      // Check allowance
      const allowance = await this.tokenContract.allowance(this.userAccount, window.QUEST_CONFIG.PUNKQUEST_ADDRESS);
      
      if (allowance.lt(claimFee)) {
        // Need to approve
        const approveTx = await this.tokenContract.approve(
          window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          claimFee
        );
        await approveTx.wait();
      }
      
      // Claim
      const claimTx = await this.questContract.claimRewards(tokenId);
      await claimTx.wait();
      
      alert(`Successfully claimed rewards for NFT #${tokenId}`);
      // Clear cache and force refresh
      this.cache.data = null;
      this.cache.timestamp = 0;
      this.updateRewardsDisplay(true);
      
      // Update stats
      if (window.QuestStats) {
        window.QuestStats.updateStats();
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Error claiming rewards: ' + error.message);
    }
  },
  
  // Claim all rewards (optimized with Multicall3)
  async claimAll() {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Use optimized fetch to get tokens with rewards
      let rewardsData;
      try {
        rewardsData = await this.fetchRewardsWithMulticall();
        } catch (error) {
        // Fallback to individual calls
        console.warn('Multicall3 failed in claimAll, using fallback:', error);
        rewardsData = await this.fetchRewardsFallback();
      }
      
      const tokensToClaim = rewardsData.rewards.map(r => r.tokenId);
      
      if (tokensToClaim.length === 0) {
        alert('No rewards to claim');
        return;
      }
      
      // Get claim fee
      const claimFee = await this.questContract.claimFee();
      const totalFee = claimFee.mul(tokensToClaim.length);
      
      // Check allowance
      const allowance = await this.tokenContract.allowance(this.userAccount, window.QUEST_CONFIG.PUNKQUEST_ADDRESS);
      
      if (allowance.lt(totalFee)) {
        const approveTx = await this.tokenContract.approve(
          window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          totalFee
        );
        await approveTx.wait();
      }
      
      // Claim all (one by one - transactions must be signed)
      let successCount = 0;
      for (const tokenId of tokensToClaim) {
        try {
          const claimTx = await this.questContract.claimRewards(tokenId);
          await claimTx.wait();
          successCount++;
        } catch (error) {
          console.error(`Error claiming token ${tokenId}:`, error);
        }
      }
      
      if (successCount > 0) {
        alert(`Successfully claimed rewards for ${successCount} NFT(s)`);
        // Clear cache and force refresh
        this.cache.data = null;
        this.cache.timestamp = 0;
        this.updateRewardsDisplay(true);
      } else {
        alert('Failed to claim any rewards');
      }
      
      // Update stats
      if (window.QuestStats) {
        window.QuestStats.updateStats();
      }
    } catch (error) {
      console.error('Error claiming all rewards:', error);
      alert('Error claiming rewards: ' + error.message);
    }
  },
  
  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
    this.cache.data = null;
    this.cache.timestamp = 0;
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuestRewards = QuestRewards;
}

