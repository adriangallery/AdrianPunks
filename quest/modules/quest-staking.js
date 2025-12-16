// Quest Staking Module
// Manages staking and unstaking of NFTs

const QuestStaking = {
  isInitialized: false,
  updateInterval: null,
  questContract: null,
  nftContract: null,
  tokenContract: null,
  userAccount: null,
  nftData: [],
  
  // Initialize the staking module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Staking...');
    
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    // Load NFT metadata
    await this.loadNFTData();
    
    this.isInitialized = true;
    console.log('✅ Quest Staking initialized');
    
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
        this.updateStakingDisplay();
        
        // Set up auto-update (every 30 seconds)
        this.updateInterval = setInterval(() => {
          this.updateStakingDisplay();
        }, 30000);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkContracts);
        this.showNotConnected();
      }
    }, 1000);
  },
  
  // Show not connected message
  showNotConnected() {
    const container = document.getElementById('stakingContent');
    if (container) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Please connect your wallet to view your NFTs</p>';
    }
  },
  
  // Update staking display
  async updateStakingDisplay() {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        this.showNotConnected();
        return;
      }
      
      const container = document.getElementById('stakingContent');
      if (!container) return;
      
      // Get user's NFTs
      const nftBalance = await this.nftContract.balanceOf(this.userAccount);
      const balance = nftBalance.toNumber();
      
      if (balance === 0) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">You don\'t own any NFTs</p>';
        return;
      }
      
      // Get staking info for each NFT
      const nfts = [];
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
          const tokenIdNum = tokenId.toNumber();
          const stakeInfo = await this.questContract.stakes(tokenIdNum);
          const isStaked = stakeInfo.stakeStart.gt(0);
          
          // Find NFT metadata
          const nftMeta = this.nftData.find(nft => {
            if (nft.name) {
              const parts = nft.name.split('#');
              return parts.length === 2 && parseInt(parts[1]) === tokenIdNum;
            }
            return false;
          });
          
          nfts.push({
            tokenId: tokenIdNum,
            isStaked: isStaked,
            stakeStart: stakeInfo.stakeStart,
            lastClaim: stakeInfo.lastClaim,
            image: nftMeta ? nftMeta.image : `../market/adrianpunksimages/${tokenIdNum}.png`
          });
        } catch (error) {
          console.warn(`Error getting info for token ${i}:`, error);
        }
      }
      
      // Render NFTs
      this.renderNFTs(nfts, container);
    } catch (error) {
      console.error('Error updating staking display:', error);
      const container = document.getElementById('stakingContent');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Error loading NFTs</p>';
      }
    }
  },
  
  // Render NFTs in grid format
  renderNFTs(nfts, container) {
    if (nfts.length === 0) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7; text-align: center; padding: 2rem;">No NFTs found</p>';
      return;
    }
    
    // Sort: staked first, then by token ID
    nfts.sort((a, b) => {
      if (a.isStaked !== b.isStaked) {
        return a.isStaked ? -1 : 1;
      }
      return a.tokenId - b.tokenId;
    });
    
    const html = `
      <div class="quest-nft-grid">
        ${nfts.map(nft => {
          const cardClass = nft.isStaked ? 'quest-nft-card staked' : 'quest-nft-card';
          const badgeClass = nft.isStaked ? 'quest-nft-badge staked' : 'quest-nft-badge unstaked';
          const buttonClass = nft.isStaked ? 'quest-nft-button unstake' : 'quest-nft-button stake';
          const badgeText = nft.isStaked ? 'Staked' : 'Available';
          const buttonText = nft.isStaked ? 'Unstake' : 'Stake';
          const action = nft.isStaked ? 'unstake' : 'stake';
          
          return `
            <div class="${cardClass}" data-token-id="${nft.tokenId}">
              <img 
                src="${nft.image}" 
                alt="NFT #${nft.tokenId}" 
                class="quest-nft-image"
                onerror="this.src='../market/adrianpunksimages/${nft.tokenId}.png'"
              >
              <div class="quest-nft-body">
                <div class="quest-nft-header">
                  <span class="quest-nft-id">#${nft.tokenId}</span>
                  <span class="${badgeClass}">${badgeText}</span>
                </div>
                <button 
                  class="${buttonClass}"
                  onclick="QuestStaking.${action}(${nft.tokenId})"
                >
                  ${buttonText}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    container.innerHTML = html;
  },
  
  // Stake an NFT
  async stake(tokenId) {
    try {
      if (!this.questContract || !this.tokenContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Get activation fee
      const activationFee = await this.questContract.activationFee();
      
      // Check allowance
      const allowance = await this.tokenContract.allowance(this.userAccount, window.QUEST_CONFIG.PUNKQUEST_ADDRESS);
      
      if (allowance.lt(activationFee)) {
        // Need to approve
        const approveTx = await this.tokenContract.approve(
          window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          activationFee
        );
        await approveTx.wait();
      }
      
      // Stake
      const stakeTx = await this.questContract.stake(tokenId);
      await stakeTx.wait();
      
      alert(`Successfully staked NFT #${tokenId}`);
      this.updateStakingDisplay();
      
      // Update stats
      if (window.QuestStats) {
        window.QuestStats.updateStats();
      }
    } catch (error) {
      console.error('Error staking:', error);
      alert('Error staking NFT: ' + error.message);
    }
  },
  
  // Unstake an NFT
  async unstake(tokenId) {
    try {
      if (!this.questContract || !this.tokenContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Get exit fee
      const exitFee = await this.questContract.exitFee();
      
      // Check allowance
      const allowance = await this.tokenContract.allowance(this.userAccount, window.QUEST_CONFIG.PUNKQUEST_ADDRESS);
      
      if (allowance.lt(exitFee)) {
        // Need to approve
        const approveTx = await this.tokenContract.approve(
          window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          exitFee
        );
        await approveTx.wait();
      }
      
      // Unstake
      const unstakeTx = await this.questContract.unstake(tokenId);
      await unstakeTx.wait();
      
      alert(`Successfully unstaked NFT #${tokenId}`);
      this.updateStakingDisplay();
      
      // Update stats
      if (window.QuestStats) {
        window.QuestStats.updateStats();
      }
    } catch (error) {
      console.error('Error unstaking:', error);
      alert('Error unstaking NFT: ' + error.message);
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
  window.QuestStaking = QuestStaking;
}

