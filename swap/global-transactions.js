// Global Swap Transactions Module
// Fetches and displays global swap transactions from Supabase database

const GlobalTransactionsManager = {
  supabaseClient: null,
  swaps: [],
  isLoading: false,
  cache: {
    data: null,
    timestamp: 0,
    ttl: 60000 // 60 seconds cache
  },

  // Initialize Supabase client
  async init() {
    try {
      console.log('🔄 Initializing global transactions manager...');
      
      // Check if Supabase is available (from activity/supabase-config.js)
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase credentials not found. Global transactions will not be available.');
        console.log('SUPABASE_URL:', window.SUPABASE_URL);
        console.log('SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? 'Found' : 'Missing');
        return;
      }

      // Wait for Supabase library to load (with retries)
      let retries = 10;
      while (typeof supabase === 'undefined' && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }

      // Initialize Supabase client
      if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        this.supabaseClient = supabase.createClient(
          window.SUPABASE_URL,
          window.SUPABASE_ANON_KEY
        );
        console.log('✅ Global transactions manager initialized');
        console.log('📡 Supabase client created');
        
        // Load initial swaps
        await this.loadGlobalSwaps();
      } else {
        if (typeof supabase === 'undefined') {
          console.error('❌ Supabase library not loaded after retries. Please check @supabase/supabase-js script.');
        } else {
          console.error('❌ Supabase credentials not found. Global transactions will not be available.');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing global transactions manager:', error);
    }
  },

  // Load global swaps from database
  async loadGlobalSwaps(limit = 20) {
    if (this.isLoading) return;
    if (!this.supabaseClient) return;

    // Check cache
    const now = Date.now();
    if (this.cache.data && (now - this.cache.timestamp) < this.cache.ttl) {
      this.swaps = this.cache.data;
      this.updateUI();
      return;
    }

    this.isLoading = true;
    this.showLoading();

    try {
      const swapperAddress = CONFIG.SWAPPER_ADDRESS.toLowerCase();
      const adrianAddress = CONFIG.ADRIAN_ADDRESS.toLowerCase();
      const taxRecipients = CONFIG.TAX_RECIPIENT_ADDRESSES;

      console.log('🔍 Querying Supabase for swaps...', {
        swapperAddress,
        adrianAddress,
        limit: limit * 10
      });

      // Query transfers involving swapper contract
      // Get more results to account for filtering
      // Note: We query all transfers and filter in JavaScript for better control
      const { data: transfers, error } = await this.supabaseClient
        .from('erc20_transfers')
        .select('*')
        .eq('contract_address', adrianAddress)
        .order('block_number', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * 10); // Get more to filter

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log(`📥 Received ${transfers?.length || 0} transfers from database`);

      // Filter to only transfers involving swapper contract
      const swapperTransfers = transfers ? transfers.filter(t => {
        const from = t.from_address.toLowerCase();
        const to = t.to_address.toLowerCase();
        return from === swapperAddress || to === swapperAddress;
      }) : [];

      console.log(`🔍 Found ${swapperTransfers.length} transfers involving swapper contract`);

      if (!swapperTransfers || swapperTransfers.length === 0) {
        console.log('ℹ️ No swaps found in database');
        this.swaps = [];
        this.updateUI();
        return;
      }

      // Group transfers by tx_hash
      const grouped = this.groupSwapsByTxHash(swapperTransfers);

      // Filter out tax transfers and identify swaps
      const swaps = this.filterAndIdentifySwaps(grouped, swapperAddress, taxRecipients);

      // Limit to requested number
      this.swaps = swaps.slice(0, limit);

      // Update cache
      this.cache.data = this.swaps;
      this.cache.timestamp = now;

      // Update UI
      this.updateUI();

      console.log(`📊 Loaded ${this.swaps.length} global swaps`);

    } catch (error) {
      console.error('Error loading global swaps:', error);
      this.showError('Failed to load global swaps');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  },

  // Group transfers by transaction hash
  groupSwapsByTxHash(transfers) {
    const grouped = {};
    
    transfers.forEach(transfer => {
      const txHash = transfer.tx_hash;
      if (!grouped[txHash]) {
        grouped[txHash] = [];
      }
      grouped[txHash].push(transfer);
    });

    return Object.values(grouped);
  },

  // Filter tax transfers and identify swap direction
  filterAndIdentifySwaps(groupedSwaps, swapperAddress, taxRecipients) {
    const swaps = [];

    groupedSwaps.forEach(group => {
      // Filter out groups that only contain tax transfers
      const hasUserTransfer = group.some(t => {
        const from = t.from_address.toLowerCase();
        const to = t.to_address.toLowerCase();
        return !taxRecipients.includes(from) && !taxRecipients.includes(to);
      });

      if (!hasUserTransfer) {
        return; // Skip tax-only transfers
      }

      // Find main swap transfer (user ↔ swapper, not tax)
      const mainTransfer = group.find(t => {
        const from = t.from_address.toLowerCase();
        const to = t.to_address.toLowerCase();
        return from !== swapperAddress && !taxRecipients.includes(to);
      }) || group.find(t => {
        const from = t.from_address.toLowerCase();
        const to = t.to_address.toLowerCase();
        return to !== swapperAddress && !taxRecipients.includes(from);
      }) || group[0];

      // Determine swap direction
      const fromAddr = mainTransfer.from_address.toLowerCase();
      const toAddr = mainTransfer.to_address.toLowerCase();
      
      let fromToken, toToken, amount;
      
      // Helper to format wei to ether
      const formatEther = (wei) => {
        if (typeof ethers !== 'undefined' && ethers.formatEther) {
          return ethers.formatEther(wei || '0');
        }
        // Fallback if ethers not available
        const weiBigInt = BigInt(wei || '0');
        const divisor = BigInt('1000000000000000000'); // 10^18
        const eth = Number(weiBigInt) / Number(divisor);
        return eth.toString();
      };

      if (fromAddr === swapperAddress) {
        // Swapper sending ADRIAN to user = ETH → ADRIAN (buy)
        fromToken = 'ETH';
        toToken = 'ADRIAN';
        amount = formatEther(mainTransfer.value_wei);
      } else if (toAddr === swapperAddress) {
        // User sending ADRIAN to swapper = ADRIAN → ETH (sell)
        fromToken = 'ADRIAN';
        toToken = 'ETH';
        amount = formatEther(mainTransfer.value_wei);
      } else {
        // Fallback: try to determine from other transfers in group
        const swapperTransfer = group.find(t => 
          t.from_address.toLowerCase() === swapperAddress || 
          t.to_address.toLowerCase() === swapperAddress
        );
        
        if (swapperTransfer) {
          if (swapperTransfer.from_address.toLowerCase() === swapperAddress) {
            fromToken = 'ETH';
            toToken = 'ADRIAN';
          } else {
            fromToken = 'ADRIAN';
            toToken = 'ETH';
          }
          amount = formatEther(swapperTransfer.value_wei);
        } else {
          return; // Skip if we can't determine
        }
      }

      swaps.push({
        hash: mainTransfer.tx_hash,
        from: fromToken,
        to: toToken,
        amount: amount,
        timestamp: new Date(mainTransfer.created_at).getTime(),
        user: fromAddr === swapperAddress ? mainTransfer.to_address : mainTransfer.from_address,
        blockNumber: mainTransfer.block_number
      });
    });

    // Sort by timestamp (newest first)
    swaps.sort((a, b) => b.timestamp - a.timestamp);

    return swaps;
  },

  // Update UI with swaps
  updateUI() {
    const container = document.getElementById('globalTransactions');
    const list = document.getElementById('globalTransactionsList');

    if (!container || !list) {
      console.warn('⚠️ Global transactions UI elements not found');
      return;
    }

    console.log(`🔄 Updating UI with ${this.swaps.length} swaps`);

    if (this.swaps.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Build HTML
    list.innerHTML = this.swaps.map(swap => {
      const date = new Date(swap.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Format amount
      const amountDisplay = parseFloat(swap.amount).toFixed(4);

      return `
        <div class="transaction-item">
          <div>
            <div class="transaction-type">${swap.from} → ${swap.to}</div>
            <div class="transaction-amount">${amountDisplay} ${swap.from}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${date}</div>
            <a href="${CONFIG.EXPLORER.tx(swap.hash)}" target="_blank" class="transaction-link">
              View on BaseScan ↗
            </a>
          </div>
        </div>
      `;
    }).join('');
  },

  // Show loading state
  showLoading() {
    const container = document.getElementById('globalTransactions');
    const loading = document.getElementById('globalTransactionsLoading');
    
    if (container) {
      container.style.display = 'block';
    }
    if (loading) {
      loading.style.display = 'block';
    }
  },

  // Hide loading state
  hideLoading() {
    const loading = document.getElementById('globalTransactionsLoading');
    if (loading) {
      loading.style.display = 'none';
    }
  },

  // Show error message
  showError(message) {
    const container = document.getElementById('globalTransactions');
    const list = document.getElementById('globalTransactionsList');
    
    if (container && list) {
      container.style.display = 'block';
      list.innerHTML = `<div class="text-center text-muted py-3">${message}</div>`;
    }
  },

  // Refresh swaps (clear cache and reload)
  async refresh() {
    this.cache.data = null;
    this.cache.timestamp = 0;
    await this.loadGlobalSwaps();
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.GlobalTransactionsManager = GlobalTransactionsManager;
}

