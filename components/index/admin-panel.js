// Admin Panel Module for index.html
// Displays project announcements and ecosystem statistics

const AdminPanel = {
  isInitialized: false,
  updateInterval: null,
  supabaseClient: null,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',
  TOKEN_ADDRESS: '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea',

  // Initialize the admin panel
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Admin Panel...');
    
    // Get Supabase client from global scope
    if (window.supabaseClient) {
      this.supabaseClient = window.supabaseClient;
    } else {
      // Try to initialize Supabase
      try {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          const { createClient } = supabase;
          this.supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }
      } catch (error) {
        console.warn('Supabase not available for admin panel:', error);
      }
    }
    
    this.isInitialized = true;
    console.log('✅ Admin Panel initialized');
    
    // Load initial data
    await this.loadAnnouncements();
    await this.loadStats();
    
    // Set up auto-update (every 30 seconds)
    this.updateInterval = setInterval(() => {
      this.loadAnnouncements();
      this.loadStats();
    }, 30000);
  },

  // Load announcements from raw activity
  async loadAnnouncements() {
    try {
      const container = document.getElementById('adminAnnouncements');
      if (!container) return;

      if (!this.supabaseClient) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">Loading announcements...</p>';
        return;
      }

      // Get latest events from raw activity (listing_events and trade_events)
      const allEvents = [];
      
      try {
        // Get latest listing events
        const { data: listingEvents } = await this.supabaseClient
          .from('listing_events')
          .select('event_type, token_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (listingEvents) {
          listingEvents.forEach(event => {
            allEvents.push({
              type: event.event_type,
              tokenId: event.token_id,
              timestamp: event.created_at,
              title: `${event.event_type} #${event.token_id}`,
              content: `Token #${event.token_id} was ${event.event_type.toLowerCase()}`
            });
          });
        }

        // Get latest trade events
        const { data: tradeEvents } = await this.supabaseClient
          .from('trade_events')
          .select('token_id, price_wei, created_at, seller, buyer')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (tradeEvents) {
          tradeEvents.forEach(event => {
            const ethers5 = window.ethers5Backup || window.ethers;
            let priceFormatted = '--';
            if (event.price_wei && ethers5) {
              try {
                const priceWeiStr = String(event.price_wei);
                const priceEth = parseFloat(ethers5.utils.formatUnits(priceWeiStr, 18));
                priceFormatted = priceEth >= 1000000 
                  ? (priceEth / 1000000).toFixed(1) + 'M'
                  : priceEth >= 1000 
                  ? (priceEth / 1000).toFixed(1) + 'K'
                  : priceEth.toFixed(1);
              } catch (e) {
                console.warn('Error formatting price:', e);
              }
            }
            
            allEvents.push({
              type: 'Trade',
              tokenId: event.token_id,
              timestamp: event.created_at,
              title: `Trade #${event.token_id}`,
              content: `Token #${event.token_id} sold for ${priceFormatted} $ADRIAN`
            });
          });
        }

        // Sort by timestamp and take latest 5
        allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestEvents = allEvents.slice(0, 5);

        if (latestEvents.length === 0) {
          container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">No recent activity</p>';
          return;
        }

        // Render announcements
        container.innerHTML = latestEvents.map(event => {
          const isNew = this.isNewAnnouncement(event.timestamp);
          return `
            <div class="announcement-item ${isNew ? 'new' : ''}">
              ${isNew ? '<span class="badge bg-success">New</span>' : ''}
              <div class="announcement-content">
                <h6 class="announcement-title">${event.title}</h6>
                <p class="announcement-text">${event.content}</p>
                <small class="announcement-date">${this.formatDate(event.timestamp)}</small>
              </div>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error loading announcements from Supabase:', error);
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">Error loading announcements</p>';
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  },

  // Load ecosystem statistics from ACTIVITY/ and MARKET/
  async loadStats() {
    try {
      const container = document.getElementById('adminStats');
      if (!container) return;

      const stats = {
        totalVolume: 0,
        totalTransactions: 0,
        floorPrice: '--',
        totalSupply: 0
      };

      if (!this.supabaseClient) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">Loading stats...</p>';
        return;
      }

      try {
        const ethers5 = window.ethers5Backup || window.ethers;
        
        // Get total volume from trade_events (sum of all prices)
        const { data: trades } = await this.supabaseClient
          .from('trade_events')
          .select('price_wei');
        
        if (trades && trades.length > 0 && ethers5) {
          let totalWei = ethers5.BigNumber.from(0);
          trades.forEach(trade => {
            if (trade.price_wei) {
              try {
                // Convert to string to avoid overflow with scientific notation
                const valueStr = String(trade.price_wei);
                totalWei = totalWei.add(ethers5.BigNumber.from(valueStr));
              } catch (e) {
                console.warn('Error processing trade price:', e);
              }
            }
          });
          const totalEth = parseFloat(ethers5.utils.formatUnits(totalWei, 18));
          stats.totalVolume = totalEth;
        }

        // Get total transactions count
        const { count: txCount } = await this.supabaseClient
          .from('trade_events')
          .select('*', { count: 'exact', head: true });
        
        if (txCount !== null) {
          stats.totalTransactions = txCount;
        }

        // Get floor price from cheapest listing (not from engine)
        const { data: cheapestListing } = await this.supabaseClient
          .from('listings')
          .select('price_wei')
          .neq('seller', this.FLOOR_ENGINE_ADDRESS.toLowerCase())
          .eq('is_active', true)
          .order('price_wei', { ascending: true })
          .limit(1);
        
        if (cheapestListing && cheapestListing.length > 0 && ethers5) {
          try {
            const priceWei = String(cheapestListing[0].price_wei);
            const priceEth = parseFloat(ethers5.utils.formatUnits(priceWei, 18));
          stats.floorPrice = priceEth >= 1000000 
            ? (priceEth / 1000000).toFixed(1) + 'M'
            : priceEth >= 1000 
            ? (priceEth / 1000).toFixed(1) + 'K'
            : priceEth.toFixed(1);
          stats.floorPrice += ' $ADRIAN';
          } catch (e) {
            console.warn('Error processing floor price:', e);
          }
        }

        // Get total supply from token stats (minted - burned)
        const { data: mints } = await this.supabaseClient
          .from('erc20_transfers')
          .select('value_wei')
          .eq('contract_address', this.TOKEN_ADDRESS.toLowerCase())
          .eq('from_address', '0x0000000000000000000000000000000000000000');
        
        const { data: burns } = await this.supabaseClient
          .from('erc20_transfers')
          .select('value_wei')
          .eq('contract_address', this.TOKEN_ADDRESS.toLowerCase())
          .eq('to_address', '0x0000000000000000000000000000000000000000');
        
        if (mints && burns && ethers5) {
          let totalMinted = ethers5.BigNumber.from(0);
          let totalBurned = ethers5.BigNumber.from(0);
          
          mints.forEach(mint => {
            if (mint.value_wei) {
              try {
                // Convert to string to avoid overflow with scientific notation
                const valueStr = String(mint.value_wei);
                totalMinted = totalMinted.add(ethers5.BigNumber.from(valueStr));
              } catch (e) {
                console.warn('Error processing mint:', e);
              }
            }
          });
          
          burns.forEach(burn => {
            if (burn.value_wei) {
              try {
                // Convert to string to avoid overflow with scientific notation
                const valueStr = String(burn.value_wei);
                totalBurned = totalBurned.add(ethers5.BigNumber.from(valueStr));
              } catch (e) {
                console.warn('Error processing burn:', e);
              }
            }
          });
          
          const totalSupply = totalMinted.sub(totalBurned);
          const supplyFormatted = parseFloat(ethers5.utils.formatUnits(totalSupply, 18));
          stats.totalSupply = supplyFormatted >= 1000000 
            ? (supplyFormatted / 1000000).toFixed(1) + 'M'
            : supplyFormatted >= 1000 
            ? (supplyFormatted / 1000).toFixed(1) + 'K'
            : supplyFormatted.toFixed(1);
        }
      } catch (error) {
        console.warn('Could not fetch all stats from Supabase:', error);
      }

      // Format volume
      const formattedVolume = stats.totalVolume >= 1 
        ? stats.totalVolume.toFixed(2) + ' ETH'
        : (stats.totalVolume * 1000).toFixed(2) + ' mETH';

      // Render stats
      container.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Volume</span>
          <span class="stat-value">${formattedVolume}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Total Transactions</span>
          <span class="stat-value">${stats.totalTransactions.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Floor Price</span>
          <span class="stat-value">${stats.floorPrice}</span>
        </div>
        ${stats.totalSupply ? `
        <div class="stat-item">
          <span class="stat-label">Total Supply</span>
          <span class="stat-value">${stats.totalSupply} $ADRIAN</span>
        </div>
        ` : ''}
      `;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  },

  // Check if announcement is new (< 7 days)
  isNewAnnouncement(dateString) {
    if (!dateString) return false;
    const announcementDate = new Date(dateString);
    const daysDiff = (Date.now() - announcementDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
  window.AdminPanel = AdminPanel;
}

