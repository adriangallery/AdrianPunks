// Quest Store Module
// Manages store functionality for purchasing items

const QuestStore = {
  isInitialized: false,
  questContract: null,
  tokenContract: null,
  userAccount: null,
  items: [],
  
  // Initialize the store module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Quest Store...');
    
    if (!window.QUEST_CONFIG) {
      console.error('QUEST_CONFIG not found');
      return;
    }
    
    this.isInitialized = true;
    console.log('✅ Quest Store initialized');
    
    // Wait for contracts
    this.waitForContracts();
  },
  
  // Wait for contracts to be available
  async waitForContracts() {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkContracts = setInterval(() => {
      attempts++;
      
      if (window.questContract && window.tokenContract && window.userAccount) {
        this.questContract = window.questContract;
        this.tokenContract = window.tokenContract;
        this.userAccount = window.userAccount;
        
        clearInterval(checkContracts);
        this.loadStoreItems();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkContracts);
        this.showNotConnected();
      }
    }, 1000);
  },
  
  // Show not connected message
  showNotConnected() {
    const container = document.getElementById('storeContent');
    if (container) {
      container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Please connect your wallet to view store</p>';
    }
  },
  
  // Load store items
  async loadStoreItems() {
    try {
      if (!this.questContract) {
        this.showNotConnected();
        return;
      }
      
      const container = document.getElementById('storeContent');
      if (!container) return;
      
      // Try to get items from contract
      // Note: This depends on the contract having a way to list items
      // For now, we'll show a placeholder
      container.innerHTML = `
        <p style="color: var(--text-color); opacity: 0.7; margin-bottom: 1rem;">
          Store functionality requires contract methods to list available items.
        </p>
        <p style="color: var(--text-color); opacity: 0.7; font-size: 0.9rem;">
          Items can be purchased using $ADRIAN tokens. Check the contract for available items and their prices.
        </p>
        <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">Example Item</div>
          <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.75rem;">
            Price: 1,000 $ADRIAN<br>
            Bonus: +5% reward rate
          </div>
          <button 
            class="btn-quest btn-quest-primary" 
            onclick="QuestStore.purchaseItem(1)"
            style="width: 100%;"
            disabled
          >
            Purchase (Coming Soon)
          </button>
        </div>
      `;
      
      // TODO: Implement actual item loading from contract
      // This would require contract methods like:
      // - getItem(uint256 itemId) returns (Item)
      // - getAvailableItems() returns (uint256[])
      // etc.
      
    } catch (error) {
      console.error('Error loading store items:', error);
      const container = document.getElementById('storeContent');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-color); opacity: 0.7;">Error loading store</p>';
      }
    }
  },
  
  // Purchase an item
  async purchaseItem(itemId) {
    try {
      if (!this.questContract || !this.tokenContract || !this.userAccount) {
        alert('Please connect your wallet');
        return;
      }
      
      // Get item info
      // const item = await this.questContract.items(itemId);
      // const price = item.price;
      
      // Check allowance
      // const allowance = await this.tokenContract.allowance(this.userAccount, window.QUEST_CONFIG.PUNKQUEST_ADDRESS);
      
      // if (allowance.lt(price)) {
      //   const approveTx = await this.tokenContract.approve(
      //     window.QUEST_CONFIG.PUNKQUEST_ADDRESS,
      //     price
      //   );
      //   await approveTx.wait();
      // }
      
      // Purchase
      // const purchaseTx = await this.questContract.purchaseItem(itemId);
      // await purchaseTx.wait();
      
      alert('Store purchase functionality - Full implementation needed');
      // TODO: Implement actual purchase logic
      
    } catch (error) {
      console.error('Error purchasing item:', error);
      alert('Error purchasing item: ' + error.message);
    }
  },
  
  // Cleanup
  destroy() {
    this.isInitialized = false;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuestStore = QuestStore;
}

