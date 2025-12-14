// Mint Completed Module for index.html
// Displays mint completion information

const MintCompleted = {
  isInitialized: false,

  // Initialize the module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Mint Completed module...');
    
    this.isInitialized = true;
    console.log('✅ Mint Completed module initialized');
    
    // Render content
    this.render();
  },

  // Render the mint completed section
  render() {
    const container = document.getElementById('mintCompletedSection');
    if (!container) return;

    container.innerHTML = `
      <ul>
        <li>✅ 1,000 NFTs minted</li>
        <li>💰 Price: 100,000 $ADRIAN each</li>
        <li>📊 Total raised: 100,000,000 $ADRIAN</li>
        <li>🎉 Mint successfully completed</li>
      </ul>
      <a href="/market/" class="btn btn-primary btn-sm mt-2 w-100">View Collection</a>
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MintCompleted = MintCompleted;
}

