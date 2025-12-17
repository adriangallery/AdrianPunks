// Activity Excerpt Module for index.html
// Displays ecosystem statistics and activity

// Helper function to convert scientific notation to string
function scientificToFixed(num) {
  if (typeof num === 'string') {
    // If it's already a string, check if it's in scientific notation
    if (num.includes('e+') || num.includes('e-') || num.includes('E+') || num.includes('E-')) {
      // Convert scientific notation to fixed string
      const [base, exponent] = num.toLowerCase().split('e');
      const exp = parseInt(exponent);
      const [intPart, decPart = ''] = base.split('.');
      const fullDec = intPart + decPart;
      
      if (exp > 0) {
        // Positive exponent: move decimal right
        const totalLength = fullDec.length;
        const newDecPos = exp;
        if (newDecPos >= totalLength) {
          // No decimal point needed
          return fullDec + '0'.repeat(newDecPos - totalLength);
        } else {
          const newInt = fullDec.slice(0, newDecPos);
          const newDec = fullDec.slice(newDecPos);
          return newInt + (newDec ? '.' + newDec : '');
        }
      } else {
        // Negative exponent: move decimal left
        return '0.' + '0'.repeat(-exp - 1) + fullDec.replace(/^0+/, '');
      }
    }
    return num;
  }
  // If it's a number, convert to string without scientific notation
  if (typeof num === 'number') {
    // Use toFixed for very large numbers
    if (num > 1e15 || num < -1e15) {
      // For very large numbers, try to preserve precision
      const str = num.toString();
      if (str.includes('e')) {
        // Use BigInt if possible, otherwise use a workaround
        try {
          return num.toLocaleString('fullwide', { useGrouping: false });
        } catch (e) {
          // Fallback: convert manually
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

const ActivityExcerpt = {
  isInitialized: false,
  updateInterval: null,
  supabaseClient: null,
  ERC20_ADDRESS: '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea',

  // Initialize the activity excerpt
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Activity Excerpt...');
    
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
        console.warn('Supabase not available for activity excerpt:', error);
      }
    }
    
    this.isInitialized = true;
    console.log('✅ Activity Excerpt initialized');
    
    // Load initial data
    await this.updateDisplay();
    
    // Set up auto-update (every 30 seconds)
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 30000);
  },

  // Helper function to format wei string (handles scientific notation)
  formatWeiString(value) {
    if (!value) return '0';
    const str = String(value);
    if (str.includes('e+') || str.includes('e-') || str.includes('E+') || str.includes('E-')) {
      return scientificToFixed(str);
    }
    return str;
  },

  // Update the display with current ERC20 activity data
  async updateDisplay() {
    try {
      const container = document.getElementById('activityExcerptContent');
      if (!container) return;

      let totalTransactions = 0;
      let totalVolume = 0;
      let totalSupply = '--';
      let adrianPrice = '--';

      // Get price from PriceManager if available
      if (window.PriceManager && window.PriceManager.prices) {
        const adrianPriceRaw = window.PriceManager.prices.ADRIAN;
        if (adrianPriceRaw && adrianPriceRaw !== '--') {
          // Format to 8 decimal places
          adrianPrice = parseFloat(adrianPriceRaw).toFixed(8);
        } else {
          adrianPrice = '--';
        }
      }

      // Get ERC20 transaction data from Supabase
      if (this.supabaseClient) {
        try {
          const ethers5 = window.ethers5Backup || window.ethers;
          
          // Get total transactions count from erc20_transfers
          const { count: txCount } = await this.supabaseClient
            .from('erc20_transfers')
            .select('*', { count: 'exact', head: true })
            .eq('contract_address', this.ERC20_ADDRESS);
          
          if (txCount !== null) {
            totalTransactions = txCount;
          }

          // Get total volume (sum of all transfer amounts)
          const { data: transfers } = await this.supabaseClient
            .from('erc20_transfers')
            .select('value_wei')
            .eq('contract_address', this.ERC20_ADDRESS);
          
          if (transfers && transfers.length > 0 && ethers5) {
            let totalWei = ethers5.BigNumber.from(0);
            transfers.forEach(transfer => {
              if (transfer.value_wei) {
                try {
                  // Convert to string to avoid overflow with scientific notation
                  const valueStr = this.formatWeiString(transfer.value_wei);
                  totalWei = totalWei.add(ethers5.BigNumber.from(valueStr));
                } catch (e) {
                  console.warn('Error processing transfer value:', e);
                }
              }
            });
            const totalTokens = parseFloat(ethers5.utils.formatUnits(totalWei, 18));
            totalVolume = totalTokens;
          }

          // Get total supply directly from ERC20 contract
          if (ethers5) {
            try {
              // Create a read-only provider (Alchemy or public RPC)
              let readProvider;
              if (window.ethereum) {
                readProvider = new ethers5.providers.Web3Provider(window.ethereum);
              } else {
                // Fallback to public RPC
                const rpcUrl = window.ALCHEMY_RPC_URL || 'https://mainnet.base.org';
                readProvider = new ethers5.providers.JsonRpcProvider(rpcUrl, {
                  name: "base",
                  chainId: 8453
                });
              }
              
              // ERC20 ABI with totalSupply function
              const tokenABI = [
                "function totalSupply() view returns (uint256)"
              ];
              
              const tokenContract = new ethers5.Contract(this.ERC20_ADDRESS, tokenABI, readProvider);
              const totalSupplyWei = await tokenContract.totalSupply();
              const supplyFormatted = parseFloat(ethers5.utils.formatUnits(totalSupplyWei, 18));
              
              totalSupply = supplyFormatted >= 1000000 
                ? (supplyFormatted / 1000000).toFixed(1) + 'M'
                : supplyFormatted >= 1000 
                ? (supplyFormatted / 1000).toFixed(1) + 'K'
                : supplyFormatted.toFixed(1);
            } catch (error) {
              console.warn('Error reading totalSupply from contract:', error);
            }
          }
        } catch (error) {
          console.warn('Could not fetch ERC20 activity data from Supabase:', error);
        }
      }

      // Format volume (already in $ADRIAN tokens)
      const formattedVolume = totalVolume >= 1000000 
        ? (totalVolume / 1000000).toFixed(1) + 'M $ADRIAN'
        : totalVolume >= 1000 
        ? (totalVolume / 1000).toFixed(1) + 'K $ADRIAN'
        : totalVolume.toFixed(2) + ' $ADRIAN';

      // Render excerpt
      container.innerHTML = `
        <div class="excerpt-section">
          <div class="excerpt-item">
            <span class="excerpt-label">Total Transactions</span>
            <span class="excerpt-value">${totalTransactions.toLocaleString()}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Total Volume</span>
            <span class="excerpt-value">${formattedVolume}</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">Total Supply</span>
            <span class="excerpt-value">${totalSupply} $ADRIAN</span>
          </div>
          <div class="excerpt-item">
            <span class="excerpt-label">$ADRIAN Price</span>
            <span class="excerpt-value">$${adrianPrice}</span>
          </div>
        </div>
        <div class="excerpt-footer">
          <a href="/activity/" class="btn btn-primary btn-sm w-100">View Activity</a>
        </div>
      `;
    } catch (error) {
      console.error('Error updating activity excerpt:', error);
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
  window.ActivityExcerpt = ActivityExcerpt;
}

