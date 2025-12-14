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
      <div class="mb-4">
        <h3>Mint Completed</h3>
        <ul>
          <li>✅ 1,000 NFTs minteados</li>
          <li>💰 Precio: 100,000 $ADRIAN cada uno</li>
          <li>📊 Total recaudado: 100,000,000 $ADRIAN</li>
          <li>🎉 Mint finalizado exitosamente</li>
        </ul>
        <a href="/market/" class="btn btn-primary mt-2">View Collection</a>
      </div>
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MintCompleted = MintCompleted;
}

