// Collection Features Module for index.html
// Displays collection features information

const CollectionFeatures = {
  isInitialized: false,

  // Initialize the module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Collection Features module...');
    
    this.isInitialized = true;
    console.log('✅ Collection Features module initialized');
    
    // Render content
    this.render();
  },

  // Render the collection features section
  render() {
    const container = document.getElementById('collectionFeaturesSection');
    if (!container) return;

    container.innerHTML = `
      <div class="mt-4">
        <h4>Collection Features</h4>
        <ul>
          <li>Limited edition collection of 1,000 unique tokens</li>
          <li>Unique traits and attributes for each NFT</li>
          <li>Rarity-based system</li>
          <li>Community-driven development</li>
          <li>Created by <a href="https://x.com/halfxtiger" target="_blank">HalfXtiger</a></li>
        </ul>
      </div>
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.CollectionFeatures = CollectionFeatures;
}

