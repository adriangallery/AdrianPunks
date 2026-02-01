// FloorENGINE Excerpt Module for index.html
// Displays real-time FloorENGINE data (read-only excerpt)

// Helper function to convert scientific notation to string
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

const FloorENGINEExcerpt = {
  isInitialized: false,
  updateInterval: null,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the FloorENGINE excerpt
  async init() {
    if (this.isInitialized) return;

    console.log('🔄 Initializing FloorENGINE Excerpt...');

    // Initialize database
    try {
      await window.Database.init();
    } catch (error) {
      console.warn('Database not available for FloorENGINE excerpt:', error);
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
      if (window.ethereum) {
        const ethers5 = window.ethers5Backup || window.ethers;
        if (ethers5 && ethers5.utils && ethers5.utils.formatUnits) {
          try {
            const provider = new ethers5.providers.Web3Provider(window.ethereum);
            const tokenAddress = '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea';
            const tokenABI = ['function balanceOf(address) view returns (uint256)'];
            const tokenContract = new ethers5.Contract(tokenAddress, tokenABI, provider);
            const balanceRaw = await tokenContract.balanceOf(this.FLOOR_ENGINE_ADDRESS);
            balance = parseFloat(ethers5.utils.formatUnits(balanceRaw, 18));
          } catch (error) {
            console.warn('Could not fetch FloorENGINE balance:', error);
          }
        }
      }

      // Get holdings and sold count from Database
      if (window.Database && window.Database.isInitialized) {
        try {
          // Get holdings count from punk_listings where is_contract_owned = true
          const engineListings = await window.Database.query(
            `SELECT token_id
             FROM punk_listings
             WHERE is_contract_owned = 1`
          );

          if (engineListings) {
            holdingCount = engineListings.length;
          }

          // Get sold count
          soldCount = await window.Database.queryCount(
            `SELECT COUNT(*) as count
             FROM trade_events
             WHERE LOWER(seller) = LOWER(?)
             AND is_contract_owned = 1`,
            [this.FLOOR_ENGINE_ADDRESS]
          );

        } catch (error) {
          console.warn('Could not fetch FloorENGINE data from Database:', error);
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

      if (window.Database && window.Database.isInitialized) {
        try {
          const ethers5 = window.ethers5Backup || window.ethers;

          // Get cheapest user listing (not from engine) - this is what FloorENGINE can sweep
          const punkListings = await window.Database.query(
            `SELECT token_id, price_wei
             FROM punk_listings
             WHERE is_contract_owned = 0
             AND is_listed = 1
             ORDER BY price_wei ASC
             LIMIT 1`
          );

          if (punkListings && punkListings.length > 0) {
            const userCheapest = punkListings[0];
            cheapestTokenId = userCheapest.token_id;

            // Get image URL - use correct path from index.html root
            const gifIds = ['1', '13', '221', '369', '420', '555', '69', '690', '777', '807', '911'];
            const tokenIdStr = String(cheapestTokenId);
            const extension = gifIds.includes(tokenIdStr) ? 'gif' : 'png';
            cheapestImage = `./market/adrianpunksimages/${tokenIdStr}.${extension}`;

            // Format price
            if (ethers5 && ethers5.utils && userCheapest.price_wei) {
              try {
                const priceWeiStr = scientificToFixed(userCheapest.price_wei);
                const priceEth = parseFloat(ethers5.utils.formatUnits(priceWeiStr, 18));
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
        } catch (error) {
          console.warn('Could not fetch cheapest listing:', error);
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
