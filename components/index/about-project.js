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
    `;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AboutProject = AboutProject;
}

