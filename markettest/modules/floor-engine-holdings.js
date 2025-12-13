// FloorENGINE Holdings Module
// Manages balance display, cheapest NFT card, and progress bar

const FloorEngineHoldings = {
  isInitialized: false,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the holdings module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Holdings module...');
    
    this.isInitialized = true;
    console.log('✅ FloorENGINE Holdings module initialized');
  },

  // Update holdings display
  async update(balance, engineListings = [], cheapestUserListing = null, nftData = [], getImageUrl = null) {
    try {
      console.log('🔄 FloorEngineHoldings.update called with:', { balance, engineListingsCount: engineListings.length, cheapestUserListing: !!cheapestUserListing });
      
      // Ensure holdings panel is visible
      const holdingsPanel = document.getElementById('floorEngineHoldingsPanel');
      if (!holdingsPanel) {
        console.error('❌ floorEngineHoldingsPanel not found');
        return;
      }
      
      const panelBody = holdingsPanel.querySelector('.panel-body');
      if (!panelBody) {
        console.error('❌ panel-body not found in floorEngineHoldingsPanel');
        return;
      }
      
      const panelBodyContent = panelBody.innerHTML.trim();
      const isPlaceholder = panelBodyContent === '<!-- Holdings content is managed by FloorEngineHoldings module -->' || 
                           panelBodyContent === '' ||
                           (panelBodyContent.includes('Holdings content is managed') && !panelBodyContent.includes('floor-engine-hero-card'));
      
      if (isPlaceholder) {
          console.log('📝 Inserting holdings HTML content');
          // Insert holdings content
          panelBody.innerHTML = `
            <!-- Hero and Cheapest Cards Container -->
            <div class="floor-engine-cards-row mb-4">
              <!-- Hero Currently Holding -->
              <div class="floor-engine-hero-card">
                <div class="floor-hero-label mb-2">FloorENGINE is currently holding</div>
                <div class="d-flex align-items-baseline flex-wrap gap-4">
                  <div class="floor-hero-value" id="floorEngineEthHolding">0</div>
                  <div class="floor-hero-suffix" id="floorEngineNftHolding">+ 0 NFTs</div>
                </div>
                <!-- FloorENGINE Info (moved from header) -->
                <div class="d-flex flex-wrap align-items-center gap-3 mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
                  <!-- Address Pill -->
                  <div class="floor-engine-pill address-pill">
                    <span id="floorEngineAddress" class="me-2">0x...</span>
                    <i class="bi bi-clipboard" onclick="copyFloorEngineAddress()" style="cursor: pointer;"></i>
                  </div>
                  <!-- Holding Pill -->
                  <div class="floor-engine-pill holding-pill">
                    <span>Holding</span>
                    <span class="badge bg-dark text-white ms-2" id="floorEngineHoldingCount">0</span>
                  </div>
                  <!-- Sold Pill -->
                  <div class="floor-engine-pill sold-pill">
                    <span>Sold</span>
                    <span class="badge bg-dark text-white ms-2" id="floorEngineSoldCount">0</span>
                  </div>
                </div>
              </div>

              <!-- Cheapest Listing Card -->
              <div class="floor-engine-cheapest-card" id="cheapestListingCard" style="display: none;">
                <div class="d-flex flex-column flex-lg-row gap-4 align-items-center">
                  <!-- Left: Image -->
                  <div class="floor-cheapest-image-wrapper position-relative">
                    <img id="cheapestListingImage" src="" alt="Cheapest NFT" class="floor-cheapest-image">
                    <div class="floor-cheapest-badge" id="cheapestListingBadge">#0</div>
                  </div>
                  <!-- Right: Info -->
                  <div class="flex-grow-1 w-100">
                    <div class="d-flex justify-content-between align-items-start">
                      <div class="flex-grow-1">
                        <div class="floor-cheapest-label mb-2">Cheapest FloorENGINE NFT on Market</div>
                        <div class="floor-cheapest-price" id="cheapestListingPrice">0 $ADRIAN</div>
                        <div class="d-flex align-items-center gap-2 mt-3">
                          <span class="text-muted">Owner:</span>
                          <div class="floor-engine-pill owner-pill">
                            <span id="cheapestListingOwner">0x...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pixelated Progress Bar -->
            <div class="floor-engine-pixel-bar-container">
              <div class="floor-engine-pixel-bar" id="floorEnginePixelBar">
                <!-- Pixel bars will be generated dynamically -->
              </div>
              <div class="floor-engine-pixel-bar-info d-flex justify-content-between align-items-center mt-2">
                <small class="text-muted">
                  <span id="pixelBarBalance">0</span> $ADRIAN / <span id="pixelBarTarget">0</span> $ADRIAN
                </small>
                <small class="text-muted" id="pixelBarPercentage">0%</small>
              </div>
            </div>
          `;
        }
      }

      // Update hero card with balance and NFTs
      const ethHoldingEl = document.getElementById('floorEngineEthHolding');
      if (ethHoldingEl) {
        ethHoldingEl.textContent = balance.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
      }

      const nftHoldingEl = document.getElementById('floorEngineNftHolding');
      if (nftHoldingEl) {
        nftHoldingEl.textContent = `+ ${engineListings.length} NFTs`;
      }

      // Update cheapest listing card
      if (cheapestUserListing) {
        this.updateCheapestCard(cheapestUserListing, nftData, getImageUrl);
      } else {
        const cheapestCard = document.getElementById('cheapestListingCard');
        if (cheapestCard) {
          cheapestCard.style.display = 'none';
        }
      }

      // Update progress bar
      this.updateProgressBar(balance, cheapestUserListing);
    } catch (error) {
      console.error('Error updating FloorENGINE holdings:', error);
    }
  },

  // Update cheapest listing card
  updateCheapestCard(cheapestUserListing, nftData = [], getImageUrl = null) {
    try {
      const cheapestCard = document.getElementById('cheapestListingCard');
      if (!cheapestCard) return;

      cheapestCard.style.display = 'flex';

      const tokenId = cheapestUserListing.tokenId;
      const ethers5 = window.ethers5Backup || window.ethers;
      const priceFormatted = parseFloat(ethers5.utils.formatUnits(cheapestUserListing.price.toString(), 18));
      
      // Update badge
      const badgeEl = document.getElementById('cheapestListingBadge');
      if (badgeEl) {
        badgeEl.textContent = `#${tokenId}`;
      }
      
      // Update price
      const priceEl = document.getElementById('cheapestListingPrice');
      if (priceEl) {
        priceEl.textContent = 
          `${priceFormatted.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} $ADRIAN`;
      }
      
      // Update owner
      const ownerEl = document.getElementById('cheapestListingOwner');
      if (ownerEl) {
        const ownerShort = `${cheapestUserListing.seller.substring(0, 6)}...${cheapestUserListing.seller.substring(38)}`;
        ownerEl.textContent = ownerShort;
      }
      
      // Update image
      const imageEl = document.getElementById('cheapestListingImage');
      if (imageEl) {
        let imgUrl = `./adrianpunksimages/${tokenId}.png`;
        if (nftData && nftData.length > 0) {
          const nft = nftData.find(n => {
            const nftId = parseInt(n.name.split('#')[1]);
            return nftId === tokenId;
          });
          if (nft && getImageUrl) {
            imgUrl = getImageUrl(nft);
          }
        }
        imageEl.src = imgUrl;
      }
    } catch (error) {
      console.error('Error updating cheapest card:', error);
    }
  },

  // Update progress bar
  updateProgressBar(currentBalance, cheapestUserListing = null) {
    try {
      const pixelBar = document.getElementById('floorEnginePixelBar');
      const balanceText = document.getElementById('pixelBarBalance');
      const targetText = document.getElementById('pixelBarTarget');
      const percentageText = document.getElementById('pixelBarPercentage');

      if (!pixelBar || !balanceText || !targetText || !percentageText) return;

      if (!cheapestUserListing) {
        balanceText.textContent = currentBalance.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
        targetText.textContent = '0';
        percentageText.textContent = '0%';
        pixelBar.innerHTML = '';
        return;
      }

      const ethers5 = window.ethers5Backup || window.ethers;
      const targetPrice = parseFloat(ethers5.utils.formatUnits(cheapestUserListing.price.toString(), 18));
      const percentage = Math.min(100, (currentBalance / targetPrice) * 100);
      
      // Update texts
      balanceText.textContent = currentBalance.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      targetText.textContent = targetPrice.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });
      percentageText.textContent = `${percentage.toFixed(1)}%`;

      // Generate pixel bars (20 bars total)
      const numBars = 20;
      const filledBars = Math.floor((percentage / 100) * numBars);
      
      pixelBar.innerHTML = '';
      for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'floor-engine-pixel-bar-pixel';
        if (i < filledBars) {
          bar.classList.add('active');
        }
        pixelBar.appendChild(bar);
      }
    } catch (error) {
      console.error('Error updating progress bar:', error);
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FloorEngineHoldings.init();
  });
} else {
  FloorEngineHoldings.init();
}

