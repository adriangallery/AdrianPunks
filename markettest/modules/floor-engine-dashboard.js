// FloorENGINE Dashboard Master Module
// Coordinates all FloorENGINE modules: Header, Holdings, and Sales

const FloorEngineDashboard = {
  isInitialized: false,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the dashboard
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Dashboard...');
    
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
    supabaseClient = null,
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

      const dashboard = document.getElementById('floorEngineDashboard');
      if (!dashboard) {
        console.warn('⚠️ floorEngineDashboard element not found');
        return;
      }

      // Show dashboard
      dashboard.style.display = 'block';

      // Get sold count
      const soldCount = await this.getSoldCount(supabaseClient);
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
      if (supabaseClient) {
        // Get formatAdrianAmountNoDecimals from global scope or use the one from FloorEngineSales
        const formatAdrianAmountNoDecimals = window.formatAdrianAmountNoDecimals || 
          ((value) => FloorEngineSales.formatAdrianAmountNoDecimals(value));
        await FloorEngineSales.update(supabaseClient, formatAdrianAmountNoDecimals);
      }
    } catch (error) {
      console.error('Error updating FloorENGINE dashboard:', error);
    }
  },

  // Get sold count from Supabase
  async getSoldCount(supabaseClient) {
    try {
      if (!supabaseClient) {
        console.warn('Supabase client not initialized');
        return 0;
      }

      const { data, error, count } = await supabaseClient
        .from('trade_events')
        .select('*', { count: 'exact', head: false })
        .eq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
        .eq('is_contract_owned', true);

      if (error) {
        console.error('Error fetching sold count from Supabase:', error);
        return 0;
      }

      return count !== null ? count : (data?.length || 0);
    } catch (error) {
      console.error('Error getting FloorENGINE sold count:', error);
      return 0;
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FloorEngineDashboard.init();
  });
} else {
  FloorEngineDashboard.init();
}

