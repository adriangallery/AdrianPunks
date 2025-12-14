// FloorENGINE Excerpt Module for index.html
// Displays real-time FloorENGINE data (read-only excerpt)

const FloorENGINEExcerpt = {
  isInitialized: false,
  updateInterval: null,
  supabaseClient: null,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the FloorENGINE excerpt
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Excerpt...');
    
    // Get Supabase client
    if (window.supabaseClient) {
      this.supabaseClient = window.supabaseClient;
    } else {
      try {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          const { createClient } = supabase;
          this.supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
      } catch (error) {
        console.warn('Supabase not available for FloorENGINE excerpt:', error);
      }
    }
    
    this.isInitialized = true;
    console.log('✅ FloorENGINE Excerpt initialized');
    
    // Load initial data
    await this.updateDisplay();
    
    // Set up auto-update (every 30 seconds)
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 30000);
  },

  // Update the display with current FloorENGINE data
  async updateDisplay() {
    try {
      const container = document.getElementById('floorengineExcerptContent');
      if (!container) return;

      let balance = 0;
      let holdingCount = 0;
      let soldCount = 0;
      let cheapestPrice = '--';

      // Get balance from contract if available
      if (window.ethereum && window.ethers) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const tokenAddress = '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea';
          const tokenABI = ['function balanceOf(address) view returns (uint256)'];
          const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
          const balanceRaw = await tokenContract.balanceOf(this.FLOOR_ENGINE_ADDRESS);
          balance = parseFloat(ethers.utils.formatUnits(balanceRaw, 18));
        } catch (error) {
          console.warn('Could not fetch FloorENGINE balance:', error);
        }
      }

      // Get holdings and sold count from Supabase
      if (this.supabaseClient) {
        try {
          // Get active listings count
          const { count: listingsCount } = await this.supabaseClient
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
            .eq('is_active', true);
          
          if (listingsCount !== null) {
            holdingCount = listingsCount;
          }

          // Get sold count
          const { count: soldCountData } = await this.supabaseClient
            .from('trade_events')
            .select('*', { count: 'exact', head: true })
            .eq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
            .eq('is_contract_owned', true);
          
          if (soldCountData !== null) {
            soldCount = soldCountData;
          }
        } catch (error) {
          console.warn('Could not fetch FloorENGINE data from Supabase:', error);
        }
      }

      // Format balance
      const formattedBalance = balance >= 1000000 
        ? (balance / 1000000).toFixed(1) + 'M'
        : balance >= 1000 
        ? (balance / 1000).toFixed(1) + 'K'
        : balance.toFixed(1);

      // Get cheapest listing with image (for sweep - must be user listing, not engine)
      let cheapestImage = '';
      let cheapestTokenId = null;
      let cheapestPriceFormatted = '--';
      
      if (this.supabaseClient) {
        try {
          // Get cheapest user listing (not from engine) - this is what FloorENGINE can sweep
          const { data: userCheapest } = await this.supabaseClient
            .from('listings')
            .select('token_id, price_wei')
            .neq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
            .eq('is_active', true)
            .order('price_wei', { ascending: true })
            .limit(1);
          
          if (userCheapest && userCheapest.length > 0 && userCheapest[0].token_id) {
            cheapestTokenId = userCheapest[0].token_id;
            // Get image URL - use correct path from index.html root
            const gifIds = ['1', '13', '221', '369', '420', '555', '69', '690', '777', '807', '911'];
            const tokenIdStr = String(cheapestTokenId);
            const extension = gifIds.includes(tokenIdStr) ? 'gif' : 'png';
            // Try multiple path formats
            cheapestImage = `./market/adrianpunksimages/${tokenIdStr}.${extension}`;
            
            if (window.ethers && userCheapest[0].price_wei) {
              try {
                const priceWeiStr = String(userCheapest[0].price_wei);
                const priceEth = parseFloat(window.ethers.utils.formatUnits(priceWeiStr, 18));
                cheapestPriceFormatted = priceEth >= 1000000 
                  ? (priceEth / 1000000).toFixed(1) + 'M'
                  : priceEth >= 1000 
                  ? (priceEth / 1000).toFixed(1) + 'K'
                  : priceEth.toFixed(2);
                cheapestPriceFormatted += ' $ADRIAN';
              } catch (e) {
                console.warn('Error formatting price:', e);
              }
            }
          } else {
            // If no user listings, try to get cheapest engine listing
            const { data: cheapestListing } = await this.supabaseClient
              .from('listings')
              .select('token_id, price_wei, seller')
              .eq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
              .eq('is_active', true)
              .order('price_wei', { ascending: true })
              .limit(1);
            
            if (cheapestListing && cheapestListing.length > 0 && cheapestListing[0].token_id) {
              cheapestTokenId = cheapestListing[0].token_id;
              // Get image URL - use correct path from index.html root
              const gifIds = ['1', '13', '221', '369', '420', '555', '69', '690', '777', '807', '911'];
              const tokenIdStr = String(cheapestTokenId);
              const extension = gifIds.includes(tokenIdStr) ? 'gif' : 'png';
              // Try multiple path formats
              cheapestImage = `./market/adrianpunksimages/${tokenIdStr}.${extension}`;
              
              // Format price
              if (window.ethers && cheapestListing[0].price_wei) {
                try {
                  const priceWeiStr = String(cheapestListing[0].price_wei);
                  const priceEth = parseFloat(window.ethers.utils.formatUnits(priceWeiStr, 18));
                  cheapestPriceFormatted = priceEth >= 1000000 
                    ? (priceEth / 1000000).toFixed(1) + 'M'
                    : priceEth >= 1000 
                    ? (priceEth / 1000).toFixed(1) + 'K'
                    : priceEth.toFixed(2);
                  cheapestPriceFormatted += ' $ADRIAN';
                } catch (e) {
                  console.warn('Error formatting price:', e);
                }
              }
            }
          }
        } catch (error) {
          console.warn('Could not fetch cheapest listing image:', error);
        }
      }

      // Render excerpt
      container.innerHTML = `
        <div class="excerpt-section">
          ${cheapestImage && cheapestTokenId ? `
            <div class="excerpt-image mb-3" style="text-align: center;">
              <img src="${cheapestImage}" alt="Cheapest NFT #${cheapestTokenId}" 
                   style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid var(--border-color);"
                   onerror="this.onerror=null; this.src='market/adrianpunksimages/${cheapestTokenId}.png'; this.onerror=function(){this.style.display='none';}">
              <div style="font-size: 0.75rem; color: var(--text-color); opacity: 0.7; margin-top: 0.5rem;">
                Cheapest: #${cheapestTokenId}
              </div>
            </div>
          ` : ''}
          <div class="excerpt-item">
            <span class="excerpt-label">Balance</span>
            <span class="excerpt-value">${formattedBalance} $ADRIAN</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Holdings</span>
            <span class="excerpt-value">${holdingCount} NFTs</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Sold</span>
            <span class="excerpt-value">${soldCount} NFTs</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Cheapest Listing</span>
            <span class="excerpt-value">${cheapestPriceFormatted}</span>
          </div>
        </div>
        <div class="excerpt-footer">
          <a href="/market/" class="btn btn-primary btn-sm w-100">View FloorENGINE</a>
        </div>
      `;
    } catch (error) {
      console.error('Error updating FloorENGINE excerpt:', error);
    }
  },

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.FloorENGINEExcerpt = FloorENGINEExcerpt;
}

