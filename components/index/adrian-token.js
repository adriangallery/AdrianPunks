// $ADRIAN Token Module for index.html
// Displays $ADRIAN token information

const AdrianToken = {
  isInitialized: false,

  // Initialize the module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing $ADRIAN Token module...');
    
    this.isInitialized = true;
    console.log('✅ $ADRIAN Token module initialized');
    
    // Render content
    this.render();
  },

  // Render the $ADRIAN token section
  render() {
    const container = document.getElementById('adrianTokenSection');
    if (!container) return;

    container.innerHTML = `
      <div class="mt-4">
        <h4>$ADRIAN Token</h4>
        <p>The original token that started it all. Primary currency for minting and trading, used across AdrianGallery's ecosystem and integrated with multiple dApps.</p>
      </div>
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AdrianToken = AdrianToken;
}

