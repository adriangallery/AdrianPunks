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
  
  // Update staking display (optimized with Multicall3)
  async updateStakingDisplay() {
    try {
      if (!this.userAccount) {
        this.showNotConnected();
        return;
      }
      
      const container = document.getElementById('stakingContent');
      if (!container) return;
      
      // Show loading state
      container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner-border" role="status" style="color: var(--text-color);"></div><p style="margin-top: 1rem; opacity: 0.7; color: var(--text-color);">Loading NFTs...</p></div>';
      
      // Use read-only provider (faster, no MetaMask rate limits)
      const ethers5 = window.ethers5Backup || window.ethers;
      if (!ethers5 || !ethers5.providers) {
        throw new Error('Ethers v5 not available');
      }
      
      const rpcUrl = window.QUEST_CONFIG.RPC_URL || window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
      const readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
        name: "base",
        chainId: 8453
      });
      
      const nftReadContract = new ethers5.Contract(
        window.QUEST_CONFIG.NFT_ADDRESS,
        window.QUEST_CONFIG.NFT_ABI,
        readProvider
      );
      
      const questReadContract = new ethers5.Contract(
        window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
        window.QUEST_CONFIG.QUEST_ABI,
        readProvider
      );
      
      const multicallContract = new ethers5.Contract(
        window.QUEST_CONFIG.MULTICALL3_ADDRESS,
        window.QUEST_CONFIG.MULTICALL3_ABI,
        readProvider
      );
      
      // Step 1: Get balance
      const balance = await nftReadContract.balanceOf(this.userAccount);
      const totalTokens = balance.toNumber();
      
      if (totalTokens === 0) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7; text-align: center; padding: 2rem;">You don\'t own any NFTs</p>';
        return;
      }
      
      console.log(`Loading ${totalTokens} tokens using Multicall3...`);
      
      // Step 2: Multicall to get all tokenIds in one batch
      const tokenIdCalls = [];
      for (let i = 0; i < totalTokens; i++) {
        tokenIdCalls.push({
          target: window.QUEST_CONFIG.NFT_ADDRESS,
          allowFailure: true,
          callData: nftReadContract.interface.encodeFunctionData('tokenOfOwnerByIndex', [this.userAccount, i])
        });
      }
      
      const tokenIdResults = await multicallContract.callStatic.aggregate3(tokenIdCalls);
      const tokenIds = tokenIdResults
        .filter(result => result.success)
        .map(result => {
          const decoded = nftReadContract.interface.decodeFunctionResult('tokenOfOwnerByIndex', result.returnData);
          return decoded[0].toNumber();
        });
      
      console.log(`Retrieved ${tokenIds.length} token IDs via Multicall3`);
      
      // Step 3: Multicall to get all staking info in one batch
      const stakeCalls = [];
      for (const tokenId of tokenIds) {
        stakeCalls.push({
          target: window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
          allowFailure: true,
          callData: questReadContract.interface.encodeFunctionData('stakes', [tokenId])
        });
      }
      
      const stakeResults = await multicallContract.callStatic.aggregate3(stakeCalls);
      
      // Step 4: Process results
      const nfts = [];
      for (let i = 0; i < tokenIds.length; i++) {
        try {
          const tokenId = tokenIds[i];
          const stakeResult = stakeResults[i];
          
          let isStaked = false;
          let stakeStart = ethers5.BigNumber.from(0);
          let lastClaim = ethers5.BigNumber.from(0);
          
          if (stakeResult.success) {
            const decoded = questReadContract.interface.decodeFunctionResult('stakes', stakeResult.returnData);
            stakeStart = decoded.stakeStart;
            lastClaim = decoded.lastClaim;
            isStaked = stakeStart.gt(0);
          }
          
          // Find NFT metadata
          const nftMeta = this.nftData.find(nft => {
            if (nft.name) {
              const parts = nft.name.split('#');
              return parts.length === 2 && parseInt(parts[1]) === tokenId;
            }
            return false;
          });
          
          nfts.push({
            tokenId: tokenId,
            isStaked: isStaked,
            stakeStart: stakeStart,
            lastClaim: lastClaim,
            image: nftMeta ? nftMeta.image : `../market/adrianpunksimages/${tokenId}.png`
          });
        } catch (error) {
          console.warn(`Error processing token ${tokenIds[i]}:`, error);
        }
      }
      
      console.log(`Processed ${nfts.length} NFTs`);
      
      // Render NFTs
      this.renderNFTs(nfts, container);
    } catch (error) {
      console.error('Error updating staking display:', error);
      const container = document.getElementById('stakingContent');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7; text-align: center; padding: 2rem;">Error loading NFTs: ' + (error.message || 'Unknown error') + '</p>';
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

