// Quest Armory Module
// Manages equipment/armory functionality

const QuestArmory = {
  isInitialized: false,
  questContract: null,
  nftContract: null,
  userAccount: null,
  
  // Initialize the armory module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Armory...');
    
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    this.isInitialized = true;
    console.log('✅ Quest Armory initialized');
    
    // Wait for contracts
    this.waitForContracts();
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
        this.userAccount = window.userAccount;
        
        clearInterval(checkContracts);
        this.updateArmoryDisplay();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkContracts);
        this.showNotConnected();
      }
    }, 1000);
  },
  
  // Show not connected message
  showNotConnected() {
    const container = document.getElementById('armoryContent');
    if (container) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Please connect your wallet to view armory</p>';
    }
  },
  
  // Update armory display
  async updateArmoryDisplay() {
    try {
      if (!this.questContract || !this.nftContract || !this.userAccount) {
        this.showNotConnected();
        return;
      }
      
      const container = document.getElementById('armoryContent');
      if (!container) return;
      
      // Get user's NFTs
      const nftBalance = await this.nftContract.balanceOf(this.userAccount);
      const balance = nftBalance.toNumber();
      
      if (balance === 0) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">You don\'t own any NFTs</p>';
        return;
      }
      
      // Get armory info for each NFT
      const armories = [];
      
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await this.nftContract.tokenOfOwnerByIndex(this.userAccount, i);
          const tokenIdNum = tokenId.toNumber();
          
          // Get armory info (this might need to be adjusted based on actual contract interface)
          try {
            const armoryInfo = await this.questContract.tokenArmory(tokenIdNum);
            armories.push({
              tokenId: tokenIdNum,
              weaponId: armoryInfo.weaponId ? armoryInfo.weaponId.toString() : '0',
              armorId: armoryInfo.armorId ? armoryInfo.armorId.toString() : '0',
              extraItems: armoryInfo.extraItems ? armoryInfo.extraItems.map(i => i.toString()) : []
            });
          } catch (error) {
            // Armory might not be available for this token
            armories.push({
              tokenId: tokenIdNum,
              weaponId: '0',
              armorId: '0',
              extraItems: []
            });
          }
        } catch (error) {
          console.warn(`Error getting armory for token ${i}:`, error);
        }
      }
      
      // Render armory
      this.renderArmory(armories, container);
    } catch (error) {
      console.error('Error updating armory display:', error);
      const container = document.getElementById('armoryContent');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Error loading armory. Armory functionality may not be fully implemented.</p>';
      }
    }
  },
  
  // Render armory list
  renderArmory(armories, container) {
    if (armories.length === 0) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">No armory data available</p>';
      return;
    }
    
    const html = armories.map(armory => {
      const hasEquipment = armory.weaponId !== '0' || armory.armorId !== '0' || armory.extraItems.length > 0;
      
      return `
        <div class="card mb-2" style="background: var(--card-bg); border-color: var(--border-color);">
          <div class="card-body p-2">
            <div style="font-weight: 600; margin-bottom: 0.5rem;">NFT #${armory.tokenId}</div>
            <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.5rem;">
              ${hasEquipment 
                ? `Weapon: ${armory.weaponId !== '0' ? '#' + armory.weaponId : 'None'}<br>
                   Armor: ${armory.armorId !== '0' ? '#' + armory.armorId : 'None'}<br>
                   Extra: ${armory.extraItems.length > 0 ? armory.extraItems.length + ' items' : 'None'}`
                : 'No equipment equipped'}
            </div>
            <button 
              class="btn-quest" 
              onclick="QuestArmory.openArmoryModal(${armory.tokenId})"
              style="width: 100%; font-size: 0.85rem;"
            >
              Manage Equipment
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    container.innerHTML = html;
  },
  
  // Open armory modal (placeholder - would need full implementation)
  openArmoryModal(tokenId) {
    alert(`Armory management for NFT #${tokenId} - Full implementation needed`);
    // TODO: Implement full armory management modal
  },
  
  // Cleanup
  destroy() {
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuestArmory = QuestArmory;
}

