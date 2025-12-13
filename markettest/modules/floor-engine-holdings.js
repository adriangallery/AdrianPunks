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
        bar.className = 'pixel-bar-segment';
        if (i < filledBars) {
          bar.classList.add('filled');
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

