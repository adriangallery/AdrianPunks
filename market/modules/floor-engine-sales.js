// FloorENGINE Sales Module
// Manages the sales section with grid/table view and sales data

const FloorEngineSales = {
  isInitialized: false,
  salesViewMode: 'grid',
  allSalesData: [],
  salesExpanded: false,
  FLOOR_ENGINE_ADDRESS: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',

  // Initialize the sales module
  async init() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing FloorENGINE Sales module...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('✅ FloorENGINE Sales module initialized');
  },

  // Setup event listeners
  setupEventListeners() {
    // View mode toggles
    const gridBtn = document.getElementById('salesViewGrid');
    const tableBtn = document.getElementById('salesViewTable');
    
    if (gridBtn) {
      gridBtn.addEventListener('click', () => this.setViewMode('grid'));
    }
    
    if (tableBtn) {
      tableBtn.addEventListener('click', () => this.setViewMode('table'));
    }
  },

  // Set view mode (grid or table)
  setViewMode(mode) {
    this.salesViewMode = mode;
    const gridBtn = document.getElementById('salesViewGrid');
    const tableBtn = document.getElementById('salesViewTable');
    
    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (tableBtn) tableBtn.classList.toggle('active', mode === 'table');
    
    this.updateDisplay(this.allSalesData);
  },

  // Toggle expand/collapse
  toggleExpand() {
    this.salesExpanded = !this.salesExpanded;
    this.updateDisplay(this.allSalesData);
  },

  // Format ADRIAN amount without decimals
  formatAdrianAmountNoDecimals(value, decimals = 18) {
    if (!value) return '0';
    const ethers5 = window.ethers5Backup || window.ethers;
    let numValue;
    
    if (typeof value === 'bigint' || value.toString().includes('n')) {
      numValue = Number(value) / Math.pow(10, decimals);
    } else {
      numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    }
    
    return Math.round(numValue).toLocaleString('en-US');
  },

  // Get FloorENGINE sales from SQLite
  async getSales() {
    try {
      if (!window.DatabaseManager) {
        console.error('DatabaseManager not initialized');
        return [];
      }

      // Get all sales from FloorENGINE
      const salesData = await window.DatabaseManager.query(
        `SELECT * FROM trade_events
         WHERE seller = ?
           AND is_contract_owned = 1
         ORDER BY created_at DESC`,
        [this.FLOOR_ENGINE_ADDRESS.toLowerCase()]
      );

      if (!salesData || salesData.length === 0) {
        return [];
      }

      // Get all sweep_events to match with sales
      const sweepData = await window.DatabaseManager.query(
        `SELECT token_id, buy_price_wei, created_at
         FROM sweep_events
         ORDER BY created_at ASC`
      );

      // Match each sale with its corresponding sweep event
      const salesWithImages = salesData.map(sale => {
        const tokenId = sale.token_id;
        const imageUrl = `./adrianpunksimages/${tokenId}.png`;
        const saleTimestamp = new Date(sale.created_at);
        
        // Find the most recent sweep_event for this token_id that occurred BEFORE the sale
        let paidAmount = BigInt('0');
        if (sweepData) {
          const tokenSweeps = sweepData
            .filter(sweep => sweep.token_id === tokenId)
            .sort((a, b) => {
              return new Date(b.created_at) - new Date(a.created_at);
            });
          
          if (tokenSweeps.length > 0) {
            const sweepBeforeSale = tokenSweeps.find(sweep => {
              const sweepTimestamp = new Date(sweep.created_at);
              return sweepTimestamp <= saleTimestamp;
            });
            
            if (sweepBeforeSale) {
              paidAmount = BigInt(sweepBeforeSale.buy_price_wei || '0');
            } else {
              paidAmount = BigInt(tokenSweeps[0].buy_price_wei || '0');
              console.warn(`Token #${tokenId}: Using sweep event after sale date as fallback. Sale: ${sale.created_at}, Sweep: ${tokenSweeps[0].created_at}`);
            }
          }
        }
        
        const soldAmount = BigInt(sale.price_wei || '0');
        const profitAmount = soldAmount - paidAmount;

        return {
          tokenId: tokenId,
          imageUrl: imageUrl,
          paidAmount: paidAmount,
          soldAmount: soldAmount,
          profitAmount: profitAmount,
          timestamp: sale.created_at,
          saleId: sale.id
        };
      });

      return salesWithImages;
    } catch (error) {
      console.error('Error getting FloorENGINE sales:', error);
      return [];
    }
  },

  // Update sales section
  async update() {
    try {
      const sales = await this.getSales();
      this.allSalesData = sales;
      
      const salesSection = document.getElementById('floorEngineSalesSection');
      if (!salesSection) return;

      if (sales.length === 0) {
        salesSection.style.display = 'none';
        return;
      }

      salesSection.style.display = 'block';

      // Calculate totals
      const totalSoldCount = sales.length;
      const totalSoldAmount = sales.reduce((sum, sale) => sum + sale.soldAmount, BigInt('0'));
      const totalPaidAmount = sales.reduce((sum, sale) => sum + sale.paidAmount, BigInt('0'));
      const totalProfitAmount = totalSoldAmount - totalPaidAmount;

      // Update summary
      const totalCountEl = document.getElementById('salesTotalCount');
      const totalAmountEl = document.getElementById('salesTotalAmount');
      const totalProfitEl = document.getElementById('salesTotalProfit');
      
      if (totalCountEl) totalCountEl.textContent = totalSoldCount;
      if (totalAmountEl) totalAmountEl.textContent = this.formatAdrianAmountNoDecimals(totalSoldAmount);
      if (totalProfitEl) totalProfitEl.textContent = this.formatAdrianAmountNoDecimals(totalProfitAmount);

      // Update display
      this.updateDisplay(sales);
    } catch (error) {
      console.error('Error updating sales section:', error);
    }
  },

  // Update sales display
  updateDisplay(sales = null) {
    const salesGrid = document.getElementById('salesGrid');
    if (!salesGrid) return;

    if (!sales) {
      sales = this.allSalesData;
    }

    if (sales.length === 0) {
      salesGrid.innerHTML = '<div class="sales-empty-state">No sales recorded yet.</div>';
      return;
    }

    // Determine how many sales to show
    const isMobile = window.innerWidth < 1024;
    const maxInitial = isMobile ? 4 : 6; // Desktop: show 6 punks (one row) by default
    const salesToShow = this.salesExpanded ? sales : sales.slice(0, maxInitial);
    const hasMore = sales.length > maxInitial;

    const tokenLabel = '$A';

    if (this.salesViewMode === 'table') {
      // Table view
      salesGrid.className = 'sales-list';
      salesGrid.innerHTML = `
        <div class="sales-list-header">
          <div class="sales-list-col-image">Punk</div>
          <div class="sales-list-col-token">Token ID</div>
          <div class="sales-list-col-paid">Paid</div>
          <div class="sales-list-col-sold">Sold</div>
          <div class="sales-list-col-profit">Profit</div>
        </div>
        ${salesToShow.map(sale => {
          const paidFormatted = this.formatAdrianAmountNoDecimals(sale.paidAmount);
          const soldFormatted = this.formatAdrianAmountNoDecimals(sale.soldAmount);
          const profitFormatted = this.formatAdrianAmountNoDecimals(sale.profitAmount);
          const profitClass = sale.profitAmount >= 0 ? 'profit-positive' : 'profit-negative';
          
          return `
            <div class="sales-list-row">
              <div class="sales-list-col-image">
                <img src="${sale.imageUrl}" alt="AdrianPunk #${sale.tokenId}" class="sales-list-image" onerror="this.src='./adrianpunksimages/1.png'">
              </div>
              <div class="sales-list-col-token">#${sale.tokenId}</div>
              <div class="sales-list-col-paid">${paidFormatted} ${tokenLabel}</div>
              <div class="sales-list-col-sold">${soldFormatted} ${tokenLabel}</div>
              <div class="sales-list-col-profit ${profitClass}">${sale.profitAmount >= 0 ? '+' : ''}${profitFormatted} ${tokenLabel}</div>
            </div>
          `;
        }).join('')}
        ${hasMore && !this.salesExpanded ? `
          <div class="sales-expand-container">
            <button class="sales-expand-btn" onclick="FloorEngineSales.toggleExpand()">
              Show ${sales.length - maxInitial} more sales
            </button>
          </div>
        ` : ''}
        ${this.salesExpanded && hasMore ? `
          <div class="sales-expand-container">
            <button class="sales-expand-btn" onclick="FloorEngineSales.toggleExpand()">
              Show less
            </button>
          </div>
        ` : ''}
      `;
    } else {
      // Grid view
      salesGrid.className = 'sales-grid';
      salesGrid.innerHTML = salesToShow.map(sale => {
        const paidFormatted = this.formatAdrianAmountNoDecimals(sale.paidAmount);
        const soldFormatted = this.formatAdrianAmountNoDecimals(sale.soldAmount);
        const profitFormatted = this.formatAdrianAmountNoDecimals(sale.profitAmount);

        return `
          <div class="sales-card">
            <div class="sales-card-image-wrapper">
              <img src="${sale.imageUrl}" alt="AdrianPunk #${sale.tokenId}" class="sales-card-image" onerror="this.src='./adrianpunksimages/1.png'">
              <div class="sales-card-token-badge">#${sale.tokenId}</div>
            </div>
            <div class="sales-card-info">
              <div class="sales-card-row">
                <div class="sales-card-label">Paid:</div>
                <div class="sales-card-value">
                  ${paidFormatted}
                  <span class="sales-card-unit">${tokenLabel}</span>
                </div>
              </div>
              <div class="sales-card-row">
                <div class="sales-card-label">Sold:</div>
                <div class="sales-card-value">
                  ${soldFormatted}
                  <span class="sales-card-unit">${tokenLabel}</span>
                </div>
              </div>
              <div class="sales-card-profit ${sale.profitAmount < 0 ? 'negative' : ''}">
                ${sale.profitAmount >= 0 ? '+' : ''}${profitFormatted} ${tokenLabel}
              </div>
            </div>
          </div>
        `;
      }).join('') + 
      (hasMore && !this.salesExpanded ? `
        <div class="sales-expand-card">
          <button class="sales-expand-btn" onclick="FloorEngineSales.toggleExpand()">
            Show ${sales.length - maxInitial} more sales
          </button>
        </div>
      ` : '') +
      (this.salesExpanded && hasMore ? `
        <div class="sales-expand-card">
          <button class="sales-expand-btn" onclick="FloorEngineSales.toggleExpand()">
            Show less
          </button>
        </div>
      ` : '');
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FloorEngineSales.init();
  });
} else {
  FloorEngineSales.init();
}

// Global functions for onclick handlers
window.setSalesViewMode = (mode) => FloorEngineSales.setViewMode(mode);
window.toggleSalesExpand = () => FloorEngineSales.toggleExpand();

