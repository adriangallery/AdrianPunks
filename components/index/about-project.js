// About Project Module for index.html
// Displays project description

const AboutProject = {
  isInitialized: false,

  // Initialize the module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing About Project module...');
    
    this.isInitialized = true;
    console.log('✅ About Project module initialized');
    
    // Render content
    this.render();
  },

  // Render the about project section
  render() {
    const container = document.getElementById('aboutProjectSection');
    if (!container) return;

    container.innerHTML = `
      <h3 class="mt-4">About the Project</h3>
      <p>The project is built on the BASE blockchain, ensuring security and transparency for all transactions. Our marketplace provides a seamless experience for collectors to trade and interact with their digital assets, featuring the innovative FloorENGINE™ system for automated floor price management and an integrated swap widget for instant ETH ↔ $ADRIAN trading.</p>
      
      <p>With FloorENGINE™ tracking holdings and sales, real-time swap functionality powered by Uniswap V4, and comprehensive ecosystem statistics, AdrianPunks offers a complete Web3 experience. Join our growing community and become part of the AdrianPunks ecosystem today!</p>

      <div class="info-grid mt-4">
        <!-- FloorENGINE Card -->
        <div class="info-card">
          <h4>FloorENGINE™</h4>
          <ul>
            <li>Automated floor price management</li>
            <li>Real-time holdings tracking</li>
            <li>Engine sweeps history</li>
            <li>Progress bar visualization</li>
            <li>Contract: <code style="font-size: 0.85rem;">0x0351F7cBA83277E891D4a85Da498A7eACD764D58</code></li>
          </ul>
          <a href="/market/" class="btn btn-primary btn-sm mt-2">View FloorENGINE</a>
        </div>

        <!-- Swap Card -->
        <div class="info-card">
          <h4>Swap $ADRIAN</h4>
          <ul>
            <li>Trade ETH ↔ $ADRIAN instantly</li>
            <li>Integrated with Uniswap V4</li>
            <li>10% protocol fee on all swaps</li>
            <li>Available in Market & Swap page</li>
          </ul>
          <a href="/swap/" class="btn btn-primary btn-sm mt-2">Go to Swap</a>
        </div>

        <!-- Activity Card -->
        <div class="info-card">
          <h4>Ecosystem Stats</h4>
          <ul>
            <li>Real-time $ADRIAN statistics</li>
            <li>Transaction history</li>
            <li>Price charts and analytics</li>
            <li>Community metrics</li>
          </ul>
          <a href="/activity/" class="btn btn-primary btn-sm mt-2">View Stats</a>
        </div>
      </div>
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AboutProject = AboutProject;
}

