// Admin Panel Module for index.html
// Displays project announcements and ecosystem statistics

// Helper function to convert scientific notation to string (same as in other modules)
function scientificToFixed(num) {
  if (typeof num === 'string') {
    if (num.includes('e+') || num.includes('e-') || num.includes('E+') || num.includes('E-')) {
      const [base, exponent] = num.toLowerCase().split('e');
      const exp = parseInt(exponent);
      const [intPart, decPart = ''] = base.split('.');
      const fullDec = intPart + decPart;

      if (exp > 0) {
        const totalLength = fullDec.length;
        const newDecPos = exp;
        if (newDecPos >= totalLength) {
          return fullDec + '0'.repeat(newDecPos - totalLength);
        } else {
          const newInt = fullDec.slice(0, newDecPos);
          const newDec = fullDec.slice(newDecPos);
          return newInt + (newDec ? '.' + newDec : '');
        }
      } else {
        return '0.' + '0'.repeat(-exp - 1) + fullDec.replace(/^0+/, '');
      }
    }
    return num;
  }
  if (typeof num === 'number') {
    if (num > 1e15 || num < -1e15) {
      const str = num.toString();
      if (str.includes('e')) {
        try {
          return num.toLocaleString('fullwide', { useGrouping: false });
        } catch (e) {
          const [base, exp] = str.toLowerCase().split('e');
          const exponent = parseInt(exp);
          const [intPart, decPart = ''] = base.split('.');
          const fullNum = intPart + (decPart || '');
          if (exponent > 0) {
            return fullNum + '0'.repeat(exponent - (decPart?.length || 0));
          } else {
            return '0.' + '0'.repeat(-exponent - 1) + fullNum;
          }
        }
      }
      return str;
    }
    return num.toString();
  }
  return String(num);
}

const AdminPanel = {
  isInitialized: false,
  updateInterval: null,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the admin panel
  async init() {
    if (this.isInitialized) return;

    console.log('🔄 Initializing Admin Panel...');

    // Initialize database
    try {
      await window.Database.init();
    } catch (error) {
      console.warn('Database not available for admin panel:', error);
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

      if (!window.Database || !window.Database.isInitialized) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">Loading announcements...</p>';
        return;
      }

      // Get latest events from raw activity (listing_events and trade_events)
      const allEvents = [];

      try {
        // Get latest listing events
        const listingEvents = await window.Database.query(
          `SELECT event_type, token_id, timestamp
           FROM listing_events
           ORDER BY timestamp DESC
           LIMIT 5`
        );

        if (listingEvents && listingEvents.length > 0) {
          listingEvents.forEach(event => {
            allEvents.push({
              type: event.event_type,
              tokenId: event.token_id,
              timestamp: event.timestamp,
              title: `${event.event_type} #${event.token_id}`,
              content: `Token #${event.token_id} was ${event.event_type.toLowerCase()}`
            });
          });
        }

        // Get latest trade events
        const tradeEvents = await window.Database.query(
          `SELECT token_id, price_wei, timestamp, seller, buyer
           FROM trade_events
           ORDER BY timestamp DESC
           LIMIT 5`
        );

        if (tradeEvents && tradeEvents.length > 0) {
          tradeEvents.forEach(event => {
            const ethers5 = window.ethers5Backup || window.ethers;
            let priceFormatted = '--';
            if (event.price_wei && ethers5) {
              try {
                const priceWeiStr = scientificToFixed(event.price_wei);
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
              timestamp: event.timestamp,
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
          // Get token image if it's a trade event
          const tokenImage = event.type === 'Trade' && event.tokenId
            ? `<img src="../market/adrianpunksimages/${event.tokenId}.png" alt="Token #${event.tokenId}" style="height: 0.85rem; width: auto; border-radius: 4px; margin-left: 0.5rem; object-fit: cover; vertical-align: middle; display: inline-block;">`
            : '';
          return `
            <div class="announcement-item ${isNew ? 'new' : ''}">
              ${isNew ? '<span class="badge bg-success">New</span>' : ''}
              <div class="announcement-content">
                <h6 class="announcement-title">${event.title}</h6>
                <p class="announcement-text">${event.content}${tokenImage}</p>
                <small class="announcement-date">${this.formatDate(event.timestamp)}</small>
              </div>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error loading announcements from Database:', error);
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
        floorPrice: '--'
      };

      if (!window.Database || !window.Database.isInitialized) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: var(--text-color); opacity: 0.7;">Loading stats...</p>';
        return;
      }

      try {
        const ethers5 = window.ethers5Backup || window.ethers;

        // Get total volume from trade_events (sum of all prices)
        const trades = await window.Database.query(
          `SELECT price_wei FROM trade_events`
        );

        if (trades && trades.length > 0 && ethers5) {
          let totalWei = ethers5.BigNumber.from(0);
          trades.forEach(trade => {
            if (trade.price_wei) {
              try {
                // Convert to string to avoid overflow with scientific notation
                const valueStr = scientificToFixed(trade.price_wei);
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
        const txCount = await window.Database.queryCount(
          `SELECT COUNT(*) as count FROM trade_events`
        );

        if (txCount !== null) {
          stats.totalTransactions = txCount;
        }

        // Get floor price from cheapest listing
        // Try punk_listings first
        let cheapestListing = null;
        try {
          const punkListings = await window.Database.query(
            `SELECT price_wei
             FROM punk_listings
             WHERE is_listed = 1
             ORDER BY price_wei ASC
             LIMIT 1`
          );

          if (punkListings && punkListings.length > 0) {
            cheapestListing = punkListings[0];
          }
        } catch (e) {
          console.warn('Error fetching floor price from punk_listings:', e);
        }

        if (cheapestListing && cheapestListing.price_wei && ethers5) {
          try {
            const priceWei = scientificToFixed(cheapestListing.price_wei);
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

      } catch (error) {
        console.warn('Could not fetch all stats from Database:', error);
      }

      // Format volume
      const formattedVolume = stats.totalVolume >= 1000000
        ? (stats.totalVolume / 1000000).toFixed(1) + 'M $ADRIAN'
        : stats.totalVolume >= 1000
        ? (stats.totalVolume / 1000).toFixed(1) + 'K $ADRIAN'
        : stats.totalVolume.toFixed(2) + ' $ADRIAN';

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
