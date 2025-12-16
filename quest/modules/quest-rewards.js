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
  
  // Wait for contracts to be available
  async waitForContracts() {
    const maxAttempts = 10;
    let attempts = 0;
    
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
  
  // Update rewards display
  async updateRewardsDisplay() {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        this.showNotConnected();
        return;
      }
      
      const container = document.getElementById('rewardsContent');
      if (!container) return;
      
      // Get user's NFTs
      const nftBalance = await this.nftContract.balanceOf(this.userAccount);
      const balance = nftBalance.toNumber();
      
      if (balance === 0) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">You don\'t own any NFTs</p>';
        return;
      }
      
      // Get rewards for each staked NFT
      const rewards = [];
      let totalRewards = 0;
      
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
          const tokenIdNum = tokenId.toNumber();
          
          // Check if staked
          const stakeInfo = await this.questContract.stakes(tokenIdNum);
          if (!stakeInfo.stakeStart.gt(0)) {
            continue; // Skip unstaked NFTs
          }
          
          // Get reward breakdown (may fail if token is not staked or method doesn't exist)
          let pendingReward = 0;
          try {
            const rewardBreakdown = await this.questContract.getTokenRewardBreakdown(tokenIdNum);
            pendingReward = parseFloat(ethers.utils.formatUnits(rewardBreakdown[0], 18));
          } catch (error) {
            // Token might not be staked or method might not be available
            // Skip this token
            continue;
          }
          
          if (pendingReward > 0) {
            totalRewards += pendingReward;
            
            // Find NFT metadata
            const nftMeta = this.nftData.find(nft => {
              if (nft.name) {
                const parts = nft.name.split('#');
                return parts.length === 2 && parseInt(parts[1]) === tokenIdNum;
              }
              return false;
            });
            
            rewards.push({
              tokenId: tokenIdNum,
              reward: pendingReward,
              image: nftMeta ? nftMeta.image : `../market/adrianpunksimages/${tokenIdNum}.png`
            });
          }
        } catch (error) {
          console.warn(`Error getting rewards for token ${i}:`, error);
        }
      }
      
      // Render rewards
      this.renderRewards(rewards, totalRewards, container);
    } catch (error) {
      console.error('Error updating rewards display:', error);
      const container = document.getElementById('rewardsContent');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Error loading rewards</p>';
      }
    }
  },
  
  // Render rewards list
  renderRewards(rewards, totalRewards, container) {
    if (rewards.length === 0) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">No pending rewards</p>';
      return;
    }
    
    const totalRewardsFormatted = totalRewards >= 1000 
      ? (totalRewards / 1000).toFixed(2) + 'K'
      : totalRewards.toFixed(2);
    
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
        const rewardFormatted = reward.reward >= 1000 
          ? (reward.reward / 1000).toFixed(2) + 'K'
          : reward.reward.toFixed(2);
        
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
      this.updateRewardsDisplay();
      
      // Update stats
      if (window.QuestStats) {
        window.QuestStats.updateStats();
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Error claiming rewards: ' + error.message);
    }
  },
  
  // Claim all rewards
  async claimAll() {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Get all staked NFTs with rewards
      const nftBalance = await this.nftContract.balanceOf(this.userAccount);
      const balance = nftBalance.toNumber();
      const tokensToClaim = [];
      
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
          const tokenIdNum = tokenId.toNumber();
          
          const stakeInfo = await this.questContract.stakes(tokenIdNum);
          if (!stakeInfo.stakeStart.gt(0)) continue;
          
          const rewardBreakdown = await this.questContract.getTokenRewardBreakdown(tokenIdNum);
          const pendingReward = parseFloat(ethers.utils.formatUnits(rewardBreakdown[0], 18));
          
          if (pendingReward > 0) {
            tokensToClaim.push(tokenIdNum);
          }
        } catch (error) {
          console.warn(`Error checking token ${i}:`, error);
        }
      }
      
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
      
      // Claim all (one by one)
      for (const tokenId of tokensToClaim) {
        try {
          const claimTx = await this.questContract.claimRewards(tokenId);
          await claimTx.wait();
        } catch (error) {
          console.error(`Error claiming token ${tokenId}:`, error);
        }
      }
      
      alert(`Successfully claimed rewards for ${tokensToClaim.length} NFT(s)`);
      this.updateRewardsDisplay();
      
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
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuestRewards = QuestRewards;
}

