// FloorENGINE Dashboard Master Module
// Coordinates all FloorENGINE modules: Header, Holdings, and Sales

const FloorEngineDashboard = {
  isInitialized: false,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the dashboard
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Dashboard...');
    
    // Wait for all modules to be available
    let retries = 0;
    const maxRetries = 10;
    while (retries < maxRetries) {
      if (typeof FloorEngineHeader !== 'undefined' && 
          typeof FloorEngineHoldings !== 'undefined' && 
          typeof FloorEngineSales !== 'undefined') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (typeof FloorEngineHeader === 'undefined' || 
        typeof FloorEngineHoldings === 'undefined' || 
        typeof FloorEngineSales === 'undefined') {
      console.error('❌ FloorENGINE modules not available after waiting');
      return;
    }
    
    // Wait for all modules to be ready
    await Promise.all([
      FloorEngineHeader.init(),
      FloorEngineHoldings.init(),
      FloorEngineSales.init()
    ]);
    
    this.isInitialized = true;
    console.log('✅ FloorENGINE Dashboard initialized');
  },

  // Update the entire dashboard
  async update({
    balance = 0,
    engineListings = [],
    cheapestUserListing = null,
    activeListingsData = [],
    nftData = [],
    getImageUrl = null,
    tokenReadContract = null
  }) {
    try {
      console.log('🔄 FloorEngineDashboard.update called with:', {
        balance,
        engineListingsCount: engineListings.length,
        cheapestUserListing: !!cheapestUserListing,
        nftDataCount: nftData?.length || 0,
        hasGetImageUrl: !!getImageUrl
      });

      if (!this.isInitialized) {
        await this.init();
      }

      // El elemento floorEngineDashboard ya no existe
      // Los paneles individuales (Holdings, Sales) ya están visibles
      // Continuar con la actualización de los módulos

      // Get sold count
      const soldCount = await this.getSoldCount();
      console.log('📊 Sold count:', soldCount);

      // Update header
      await FloorEngineHeader.update(engineListings, soldCount);

      // Update holdings
      await FloorEngineHoldings.update(
        balance,
        engineListings,
        cheapestUserListing,
        nftData || [],
        getImageUrl
      );

      // Update sales
      // Get formatAdrianAmountNoDecimals from global scope or use the one from FloorEngineSales
      const formatAdrianAmountNoDecimals = window.formatAdrianAmountNoDecimals ||
        ((value) => FloorEngineSales.formatAdrianAmountNoDecimals(value));
      await FloorEngineSales.update(formatAdrianAmountNoDecimals);
    } catch (error) {
      console.error('Error updating FloorENGINE dashboard:', error);
    }
  },

  // Get sold count from SQLite
  async getSoldCount() {
    try {
      if (!window.DatabaseManager) {
        console.warn('DatabaseManager not initialized');
        return 0;
      }

      const count = await window.DatabaseManager.queryCount(
        `SELECT COUNT(*) as count
         FROM trade_events
         WHERE seller = ?
           AND is_contract_owned = 1`,
        [this.FLOOR_ENGINE_ADDRESS.toLowerCase()]
      );

      return count;
    } catch (error) {
      console.error('Error getting FloorENGINE sold count:', error);
      return 0;
    }
  }
};

// Auto-initialize when DOM is ready and modules are loaded
function initializeDashboard() {
  if (typeof FloorEngineHeader !== 'undefined' && 
      typeof FloorEngineHoldings !== 'undefined' && 
      typeof FloorEngineSales !== 'undefined') {
    FloorEngineDashboard.init();
  } else {
    // Retry after a short delay
    setTimeout(initializeDashboard, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
  });
} else {
  initializeDashboard();
}

