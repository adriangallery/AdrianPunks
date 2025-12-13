// FloorENGINE Header Module
// Manages the FloorENGINE header with address, holding count, and sold count

const FloorEngineHeader = {
  isInitialized: false,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the header module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Header module...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('✅ FloorENGINE Header module initialized');
  },

  // Setup event listeners
  setupEventListeners() {
    // Copy address functionality
    const copyIcon = document.querySelector('#floorEngineAddress + .bi-clipboard');
    if (copyIcon) {
      copyIcon.addEventListener('click', () => this.copyAddress());
    }
  },

  // Update header with current data
  async update(engineListings = [], soldCount = 0) {
    try {
      // Update address
      const addressEl = document.getElementById('floorEngineAddress');
      if (addressEl) {
        addressEl.textContent = `${this.FLOOR_ENGINE_ADDRESS.substring(0, 6)}...${this.FLOOR_ENGINE_ADDRESS.substring(38)}`;
      }

      // Update holding count
      const holdingCountEl = document.getElementById('floorEngineHoldingCount');
      if (holdingCountEl) {
        holdingCountEl.textContent = engineListings.length;
      }

      // Update sold count
      const soldCountEl = document.getElementById('floorEngineSoldCount');
      if (soldCountEl) {
        soldCountEl.textContent = soldCount;
      }
    } catch (error) {
      console.error('Error updating FloorENGINE header:', error);
    }
  },

  // Copy address to clipboard
  copyAddress() {
    navigator.clipboard.writeText(this.FLOOR_ENGINE_ADDRESS).then(() => {
      // Show feedback visual - find the icon next to the address
      const addressEl = document.getElementById('floorEngineAddress');
      if (addressEl) {
        const icon = addressEl.nextElementSibling;
        if (icon && icon.classList.contains('bi-clipboard')) {
          const originalClass = icon.className;
          icon.className = 'bi bi-check';
          setTimeout(() => {
            icon.className = originalClass;
          }, 1000);
        }
      }
    }).catch(err => {
      console.error('Failed to copy address:', err);
    });
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FloorEngineHeader.init();
  });
} else {
  FloorEngineHeader.init();
}

