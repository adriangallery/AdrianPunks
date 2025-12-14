// Admin Panel Module for index.html
// Displays project announcements and ecosystem statistics

const AdminPanel = {
  isInitialized: false,
  updateInterval: null,
  supabaseClient: null,

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

  // Load announcements from Supabase
  async loadAnnouncements() {
    try {
      const container = document.getElementById('adminAnnouncements');
      if (!container) return;

      // For now, show placeholder announcements
      // In the future, this can load from a Supabase 'announcements' table
      const announcements = [
        {
          title: 'Mint Completed Successfully',
          date: new Date().toISOString().split('T')[0],
          content: 'All 1,000 AdrianPunks NFTs have been minted!',
          isNew: true
        },
        {
          title: 'FloorENGINE Active',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          content: 'FloorENGINE is actively managing floor prices and holdings.',
          isNew: false
        },
        {
          title: 'Swap Widget Available',
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          content: 'Trade ETH ↔ $ADRIAN directly from the marketplace.',
          isNew: false
        }
      ];

      // Render announcements
      container.innerHTML = announcements.map(announcement => {
        const isNew = this.isNewAnnouncement(announcement.date);
        return `
          <div class="announcement-item ${isNew ? 'new' : ''}">
            ${isNew ? '<span class="badge bg-success">New</span>' : ''}
            <div class="announcement-content">
              <h6 class="announcement-title">${announcement.title}</h6>
              <p class="announcement-text">${announcement.content}</p>
              <small class="announcement-date">${this.formatDate(announcement.date)}</small>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  },

  // Load ecosystem statistics
  async loadStats() {
    try {
      const container = document.getElementById('adminStats');
      if (!container) return;

      // Get stats from various sources
      const stats = {
        totalMinted: 1000,
        totalListed: 0,
        floorPrice: 0,
        totalVolume: 0
      };

      // Try to get real data from Supabase if available
      if (this.supabaseClient) {
        try {
          // Get total listed count
          const { count: listedCount } = await this.supabaseClient
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
          
          if (listedCount !== null) {
            stats.totalListed = listedCount;
          }
        } catch (error) {
          console.warn('Could not fetch stats from Supabase:', error);
        }
      }

      // Render stats
      container.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Total Minted</span>
          <span class="stat-value">${stats.totalMinted.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Currently Listed</span>
          <span class="stat-value">${stats.totalListed.toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Floor Price</span>
          <span class="stat-value">${stats.floorPrice > 0 ? stats.floorPrice.toLocaleString() + ' $ADRIAN' : '--'}</span>
        </div>
      `;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  },

  // Check if announcement is new (< 7 days)
  isNewAnnouncement(dateString) {
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

