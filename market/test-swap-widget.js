// Test Swap Widget Module for market
// Reuses swap modules to provide simplified swap functionality
// Uses 'test' prefix for all IDs to avoid conflicts

const TestSwapWidget = {
  isInitialized: false,
  swapDirection: 'buy', // 'buy' = ETH→ADRIAN, 'sell' = ADRIAN→ETH
  priceUpdateInterval: null,

  // Initialize the widget
  async init() {
    if (this.isInitialized) {
      console.warn('TestSwapWidget already initialized');
      return;
    }

    console.log('🔄 Initializing Test Swap Widget...');

    try {
      // Wait for swap modules to be available
      if (typeof CONFIG === 'undefined' || typeof NetworkManager === 'undefined' || typeof WalletManager === 'undefined') {
        console.warn('⚠️ Swap modules not loaded yet, retrying...');
        setTimeout(() => this.init(), 1000);
        return;
      }

      // Initialize swap modules if not already initialized
      if (!NetworkManager.isInitialized) {
        await NetworkManager.init();
      }

      if (!WalletManager.isInitialized) {
        await WalletManager.init();
      }

      if (!PriceManager.isInitialized) {
        await PriceManager.init();
      }

      if (!QuoteManager.isInitialized) {
        await QuoteManager.init();
      }

      if (!SwapManager.isInitialized) {
        SwapManager.init();
      }

      // Setup event listeners
      this.setupEventListeners();

      // Check if wallet is already connected (from market)
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0 && !WalletManager.isConnected) {
            // Wallet is connected but WalletManager doesn't know - connect silently
            await WalletManager.connect(false);
          }
        } catch (error) {
          console.warn('Error checking wallet connection:', error);
        }
      }

      // Check if market wallet is connected (only in market context)
      const mainBtn = document.getElementById('mainConnectWalletButton');
      if (mainBtn && window.userAccount && !WalletManager.isConnected) {
        try {
          await WalletManager.connect(false);
        } catch (error) {
          console.warn('Error syncing with market wallet:', error);
        }
      }

      // Update widget when wallet is connected
      if (WalletManager.isConnected) {
        this.onWalletConnected();
      }

      // Listen for wallet connection changes from swap modules
      window.addEventListener('walletConnected', () => this.onWalletConnected());
      window.addEventListener('walletDisconnected', () => this.onWalletDisconnected());

      // Escuchar eventos del market
      window.addEventListener('marketWalletConnected', () => {
        this.syncButtonState();
      });

      window.addEventListener('marketWalletDisconnected', () => {
        this.syncButtonState();
      });

      // Check market wallet connection periodically
      this.checkMarketWalletConnection();

      // Set default value of 0.01 ETH
      this.setDefaultAmount();

      this.isInitialized = true;
      console.log('✅ Test Swap Widget initialized');

    } catch (error) {
      console.error('❌ Error initializing Test Swap Widget:', error);
    }
  },

  // Setup event listeners for widget elements
  setupEventListeners() {
    // From amount input
    const fromAmountInput = document.getElementById('testFromAmount');
    if (fromAmountInput) {
      fromAmountInput.addEventListener('input', () => this.handleAmountInput());
      fromAmountInput.addEventListener('blur', () => this.handleAmountInput());
    }

    // MAX button
    const maxBtn = document.getElementById('testMaxBtn');
    if (maxBtn) {
      maxBtn.addEventListener('click', () => this.handleMaxClick());
    }

    // Swap direction button
    const swapDirectionBtn = document.getElementById('testSwapDirectionBtn');
    if (swapDirectionBtn) {
      swapDirectionBtn.addEventListener('click', () => this.toggleSwapDirection());
    }

    // Swap/Approve button - unified handler
    const swapBtn = document.getElementById('testSwapBtn');
    if (swapBtn) {
      swapBtn.addEventListener('click', async () => {
        const span = swapBtn.querySelector('span');
        if (span && span.textContent.includes('Connect')) {
          // Connect wallet using WalletManager directly
          try {
            if (!WalletManager.isConnected) {
              await WalletManager.connect();
              this.onWalletConnected();
            }
          } catch (error) {
            console.error('Error connecting wallet:', error);
            const swapBtnText = document.getElementById('testSwapBtnText');
            if (swapBtnText) {
              swapBtnText.textContent = 'Connect Wallet';
            }
          }
        } else {
          // Execute swap
          await this.handleSwap();
        }
      });
    }

    const approveBtn = document.getElementById('testApproveBtn');
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleApprove());
    }
  },

  // Handle wallet connected
  onWalletConnected() {
    this.updateBalances();
    this.updateSwapButton();
    this.startPriceUpdates();
  },

  // Handle wallet disconnected
  onWalletDisconnected() {
    this.updateBalances();
    this.updateSwapButton();
    this.stopPriceUpdates();
    this.clearAmounts();
  },

  // Update balances display
  async updateBalances() {
    if (!WalletManager.isConnected) {
      const fromBalanceEl = document.getElementById('testFromBalance');
      const toBalanceEl = document.getElementById('testToBalance');
      const toBalanceHeaderEl = document.getElementById('testToBalanceHeader');
      const toTokenSymbolHeaderEl = document.getElementById('testToTokenSymbolHeader');
      if (fromBalanceEl) fromBalanceEl.textContent = '0.0000';
      if (toBalanceEl) toBalanceEl.textContent = '0.0000';
      if (toBalanceHeaderEl) toBalanceHeaderEl.textContent = '0.0000';
      if (toTokenSymbolHeaderEl) toTokenSymbolHeaderEl.textContent = this.swapDirection === 'buy' ? 'ADRIAN' : 'ETH';
      return;
    }

    try {
      await WalletManager.updateBalances();
      const balances = WalletManager.balances;

      const toBalanceHeaderEl = document.getElementById('testToBalanceHeader');
      const toTokenSymbolHeaderEl = document.getElementById('testToTokenSymbolHeader');
      
      if (this.swapDirection === 'buy') {
        // ETH → ADRIAN
        const fromBalanceEl = document.getElementById('testFromBalance');
        const toBalanceEl = document.getElementById('testToBalance');
        if (fromBalanceEl) fromBalanceEl.textContent = parseFloat(balances.ETH || '0').toFixed(4);
        if (toBalanceEl) toBalanceEl.textContent = parseFloat(balances.ADRIAN || '0').toFixed(4);
        if (toBalanceHeaderEl) toBalanceHeaderEl.textContent = parseFloat(balances.ADRIAN || '0').toFixed(4);
        if (toTokenSymbolHeaderEl) toTokenSymbolHeaderEl.textContent = 'ADRIAN';
      } else {
        // ADRIAN → ETH
        const fromBalanceEl = document.getElementById('testFromBalance');
        const toBalanceEl = document.getElementById('testToBalance');
        if (fromBalanceEl) fromBalanceEl.textContent = parseFloat(balances.ADRIAN || '0').toFixed(4);
        if (toBalanceEl) toBalanceEl.textContent = parseFloat(balances.ETH || '0').toFixed(4);
        if (toBalanceHeaderEl) toBalanceHeaderEl.textContent = parseFloat(balances.ETH || '0').toFixed(4);
        if (toTokenSymbolHeaderEl) toTokenSymbolHeaderEl.textContent = 'ETH';
      }
    } catch (error) {
      console.error('Error updating balances:', error);
    }
  },

  // Handle amount input
  async handleAmountInput() {
    const fromAmountInput = document.getElementById('testFromAmount');
    const toAmountInput = document.getElementById('testToAmount');
    
    if (!fromAmountInput || !toAmountInput) return;

    let amount = fromAmountInput.value.trim();
    
    // Allow user to type "." while writing, but clean invalid patterns
    // Only clean on blur or when processing, not while typing
    // For now, just prevent multiple dots
    if ((amount.match(/\./g) || []).length > 1) {
      // Multiple dots - remove extra ones
      const firstDotIndex = amount.indexOf('.');
      amount = amount.substring(0, firstDotIndex + 1) + amount.substring(firstDotIndex + 1).replace(/\./g, '');
      fromAmountInput.value = amount;
    }
    
    // If empty or just zero, clear output
    if (!amount || amount === '0' || amount === '0.0' || amount === '0.00') {
      toAmountInput.value = '';
      // Update USD values to 0
      const fromValueEl = document.getElementById('testFromValueUSD');
      const toValueEl = document.getElementById('testToValueUSD');
      if (fromValueEl) fromValueEl.textContent = '0.00';
      if (toValueEl) toValueEl.textContent = '0.00';
      this.updateSwapButton();
      return;
    }
    
    // Validate that amount is a valid number format (allow "." while typing)
    // Must match: optional digits, optional dot, optional digits
    // Allow "." alone or at start (user might be typing "0.5")
    if (!/^\d*\.?\d*$/.test(amount)) {
      // Invalid format, don't process but allow typing
      return;
    }
    
    // If amount is just "." or starts with "." and has no digits after, don't process quote yet
    // But allow the user to continue typing
    if (amount === '.' || (amount.startsWith('.') && amount.length === 1)) {
      // User is typing, don't process yet
      return;
    }
    
    // Update from USD value immediately when user types
    if (window.PriceManager) {
      const fromTokenSymbolEl = document.getElementById('testFromTokenSymbol');
      if (fromTokenSymbolEl) {
        const fromSymbol = fromTokenSymbolEl.textContent;
        const fromValueUSD = window.PriceManager.calculateUSDValue(amount, fromSymbol);
        const fromValueEl = document.getElementById('testFromValueUSD');
        if (fromValueEl) fromValueEl.textContent = fromValueUSD.toFixed(2);
      }
    }

    if (!WalletManager.isConnected) {
      this.updateSwapButton();
      return;
    }

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        toAmountInput.value = '';
        this.updateSwapButton();
        return;
      }

      // Get quote - QuoteManager.getQuote expects a string (decimal amount), not BigInt
      // It will convert to wei internally using ethers.parseEther()
      const originalEthers = window.ethers;
      const ethers6 = window.ethers6 || window.ethers;
      window.ethers = ethers6;
      
      try {
        // Pass the string amount, not the BigInt
        const quote = await QuoteManager.getQuote(amount);
        
        if (quote && quote.amountOut) {
          // Format output amount
          const amountOutNum = parseFloat(quote.amountOut);
          let formatted;
          if (amountOutNum >= 1000) {
            formatted = amountOutNum.toLocaleString('en-US', { maximumFractionDigits: 2 });
          } else if (amountOutNum >= 1) {
            formatted = amountOutNum.toLocaleString('en-US', { maximumFractionDigits: 4 });
          } else {
            formatted = amountOutNum.toFixed(6).replace(/\.?0+$/, '');
          }
          
          toAmountInput.value = formatted;
          
          // USD values are updated automatically by QuoteManager.updateFromValueUSD and updateToValueUSD
          // But we can also update them manually if needed
          if (window.PriceManager && quote.fromSymbol && quote.toSymbol) {
            const fromValueUSD = window.PriceManager.calculateUSDValue(amountNum, quote.fromSymbol);
            const toValueUSD = window.PriceManager.calculateUSDValue(amountOutNum, quote.toSymbol);
            this.updateUSDValues(fromValueUSD, toValueUSD);
          }
        } else {
          toAmountInput.value = '';
          this.updateUSDValues(0, 0);
        }
      } finally {
        // Restore ethers v5
        window.ethers = originalEthers;
      }

      this.updateSwapButton();
    } catch (error) {
      console.error('Error getting quote:', error);
      toAmountInput.value = '';
      this.updateSwapButton();
    }
  },

  // Calculate USD value
  async calculateUSDValue(amount, symbol) {
    try {
      if (symbol === 'ETH') {
        const ethPrice = PriceManager.prices?.ETH || await PriceManager.getETHPrice();
        return amount * parseFloat(ethPrice.replace('$', '').replace(/,/g, ''));
      } else if (symbol === 'ADRIAN') {
        const adrianPrice = PriceManager.prices?.ADRIAN || await PriceManager.getADRIANPrice();
        return amount * parseFloat(adrianPrice.replace('$', '').replace(/,/g, ''));
      }
    } catch (error) {
      console.error('Error calculating USD value:', error);
    }
    return 0;
  },

  // Update USD values display
  updateUSDValues(fromValue, toValue) {
    const fromValueEl = document.getElementById('testFromValueUSD');
    const toValueEl = document.getElementById('testToValueUSD');
    
    if (fromValueEl) {
      fromValueEl.textContent = fromValue.toFixed(2);
    }
    if (toValueEl) {
      toValueEl.textContent = toValue.toFixed(2);
    }
  },

  // Handle MAX button click
  handleMaxClick() {
    if (!WalletManager.isConnected) return;

    const fromAmountInput = document.getElementById('testFromAmount');
    if (!fromAmountInput) return;

    const balances = WalletManager.balances;
    let maxAmount;

    if (this.swapDirection === 'buy') {
      // ETH → ADRIAN: use ETH balance
      maxAmount = balances.ETH || '0';
    } else {
      // ADRIAN → ETH: use ADRIAN balance
      maxAmount = balances.ADRIAN || '0';
    }

    // Leave some ETH for gas (if buying)
    if (this.swapDirection === 'buy' && parseFloat(maxAmount) > 0.001) {
      maxAmount = (parseFloat(maxAmount) - 0.001).toString();
    }

    fromAmountInput.value = parseFloat(maxAmount).toFixed(6).replace(/\.?0+$/, '');
    this.handleAmountInput();
  },

  // Toggle swap direction
  toggleSwapDirection() {
    this.swapDirection = this.swapDirection === 'buy' ? 'sell' : 'buy';
    
    // Update token symbols
    const fromSymbol = document.getElementById('testFromTokenSymbol');
    const toSymbol = document.getElementById('testToTokenSymbol');
    const toTokenSymbolHeaderEl = document.getElementById('testToTokenSymbolHeader');
    
    if (this.swapDirection === 'buy') {
      if (fromSymbol) fromSymbol.textContent = 'ETH';
      if (toSymbol) toSymbol.textContent = 'ADRIAN';
      if (toTokenSymbolHeaderEl) toTokenSymbolHeaderEl.textContent = 'ADRIAN';
    } else {
      if (fromSymbol) fromSymbol.textContent = 'ADRIAN';
      if (toSymbol) toSymbol.textContent = 'ETH';
      if (toTokenSymbolHeaderEl) toTokenSymbolHeaderEl.textContent = 'ETH';
    }

    // Clear amounts
    this.clearAmounts();
    
    // Update balances
    this.updateBalances();
    
    // Update button
    this.updateSwapButton();
  },

  // Clear amounts
  clearAmounts() {
    const fromAmountInput = document.getElementById('testFromAmount');
    const toAmountInput = document.getElementById('testToAmount');
    
    if (fromAmountInput) fromAmountInput.value = '';
    if (toAmountInput) toAmountInput.value = '';
    
    this.updateUSDValues(0, 0);
  },

  // Set default amount (0.01 ETH)
  async setDefaultAmount() {
    const fromAmountInput = document.getElementById('testFromAmount');
    if (!fromAmountInput) return;

    // Only set default if input is empty
    if (!fromAmountInput.value || fromAmountInput.value.trim() === '') {
      // Check if wallet is connected and has enough balance
      if (WalletManager.isConnected) {
        const ethBalance = parseFloat(WalletManager.getBalance('ETH') || '0');
        // Only set default if user has at least 0.02 ETH (0.01 for swap + 0.01 for gas)
        if (ethBalance >= 0.02) {
          fromAmountInput.value = '0.01';
          // Trigger input handler to calculate quote
          this.handleAmountInput();
        } else {
          // Set a smaller default based on available balance (leave 50% for gas)
          const maxAmount = Math.max(0, (ethBalance * 0.5).toFixed(6));
          if (maxAmount > 0.0001) {
            fromAmountInput.value = maxAmount;
            this.handleAmountInput();
          }
        }
      } else {
        // Wallet not connected, set default anyway
        fromAmountInput.value = '0.01';
        this.handleAmountInput();
      }
    }
  },

  // Update swap button state
  updateSwapButton() {
    const swapBtn = document.getElementById('testSwapBtn');
    const approveSection = document.getElementById('testApproveSection');
    const fromAmountInput = document.getElementById('testFromAmount');
    
    if (!swapBtn) return;

    if (!WalletManager.isConnected) {
      swapBtn.disabled = false;
      const span = swapBtn.querySelector('span');
      if (span) {
        // Check if market wallet is connected
        if (window.userAccount) {
          // Market wallet is connected, trigger WalletManager connection
          span.textContent = 'Connect Wallet';
        } else {
          span.textContent = 'Connect Wallet';
        }
      }
      if (approveSection) approveSection.style.display = 'none';
      return;
    }

    const amount = fromAmountInput?.value.trim() || '';
    const hasAmount = amount && parseFloat(amount) > 0;

    if (!hasAmount) {
      swapBtn.disabled = true;
      const span = swapBtn.querySelector('span');
      if (span) span.textContent = 'Enter an amount';
      if (approveSection) approveSection.style.display = 'none';
      return;
    }

    // Check if approval is needed (only for selling ADRIAN)
    if (this.swapDirection === 'sell') {
      // Check allowance
      this.checkAllowance().then(needsApproval => {
        if (needsApproval) {
          swapBtn.disabled = true;
          if (approveSection) approveSection.style.display = 'block';
        } else {
          swapBtn.disabled = false;
          const span = swapBtn.querySelector('span');
          if (span) span.textContent = 'Swap';
          if (approveSection) approveSection.style.display = 'none';
        }
      });
    } else {
      // Buying ETH → ADRIAN: no approval needed
      swapBtn.disabled = false;
      const span = swapBtn.querySelector('span');
      if (span) span.textContent = 'Swap';
      if (approveSection) approveSection.style.display = 'none';
    }
  },

  // Check if approval is needed
  async checkAllowance() {
    if (this.swapDirection !== 'sell') return false;

    try {
      const fromAmountInput = document.getElementById('testFromAmount');
      const amount = fromAmountInput?.value.trim() || '';
      if (!amount || parseFloat(amount) <= 0) return false;

      const ethers6 = window.ethers6 || window.ethers;
      const amountInWei = ethers6.parseEther(amount);
      const allowance = await WalletManager.getAllowance(CONFIG.TOKENS.ADRIAN.address);
      
      return allowance < amountInWei;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return false;
    }
  },

  // Handle approve
  async handleApprove() {
    if (!WalletManager.isConnected) {
      if (typeof window.connectMetaMaskWallet === 'function') {
        window.connectMetaMaskWallet();
      } else {
        WalletManager.connectWallet();
      }
      return;
    }

    const approveBtn = document.getElementById('testApproveBtn');
    if (approveBtn) {
      approveBtn.disabled = true;
      const span = approveBtn.querySelector('span');
      if (span) span.textContent = 'Approving...';
    }

    try {
      const fromAmountInput = document.getElementById('testFromAmount');
      const amount = fromAmountInput?.value.trim() || '';
      
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }

      const ethers6 = window.ethers6 || window.ethers;
      const amountInWei = ethers6.parseEther(amount);
      
      // Temporarily use ethers6 for approval
      const originalEthers = window.ethers;
      window.ethers = ethers6;
      
      try {
        await WalletManager.approveToken(CONFIG.TOKENS.ADRIAN.address, amountInWei);
      } finally {
        window.ethers = originalEthers;
      }

      // Wait a bit for transaction to be mined
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update button state
      this.updateSwapButton();
      
      if (approveBtn) {
        approveBtn.disabled = false;
        const span = approveBtn.querySelector('span');
        if (span) span.textContent = 'Approve ADRIAN';
      }
    } catch (error) {
      console.error('Error approving:', error);
      if (approveBtn) {
        approveBtn.disabled = false;
        const span = approveBtn.querySelector('span');
        if (span) span.textContent = 'Approve ADRIAN';
      }
      alert('Error approving token: ' + error.message);
    }
  },

  // Handle swap
  async handleSwap() {
    if (!WalletManager.isConnected) {
      if (typeof window.connectMetaMaskWallet === 'function') {
        window.connectMetaMaskWallet();
      } else {
        WalletManager.connectWallet();
      }
      return;
    }

    const swapBtn = document.getElementById('testSwapBtn');
    if (swapBtn) {
      swapBtn.disabled = true;
      const span = swapBtn.querySelector('span');
      if (span) span.textContent = 'Swapping...';
    }

    try {
      const fromAmountInput = document.getElementById('testFromAmount');
      const amount = fromAmountInput?.value.trim() || '';
      
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Invalid amount');
      }
      
      // Check balance before executing swap
      const amountNum = parseFloat(amount);
      const ethBalance = parseFloat(WalletManager.getBalance('ETH') || '0');
      
      // For ETH swaps, need amount + gas (estimate ~0.001 ETH for gas)
      if (this.swapDirection === 'buy' && amountNum + 0.001 > ethBalance) {
        throw new Error(`Insufficient balance. You have ${ethBalance.toFixed(6)} ETH but need ${(amountNum + 0.001).toFixed(6)} ETH (including gas).`);
      }
      
      // For ADRIAN swaps, check ADRIAN balance
      if (this.swapDirection === 'sell') {
        const adrianBalance = parseFloat(WalletManager.getBalance('ADRIAN') || '0');
        if (amountNum > adrianBalance) {
          throw new Error(`Insufficient ADRIAN balance. You have ${adrianBalance.toFixed(2)} ADRIAN.`);
        }
        // Also need ETH for gas
        if (0.001 > ethBalance) {
          throw new Error(`Insufficient ETH for gas. You need at least 0.001 ETH for gas fees.`);
        }
      }

      // Get quote first (SwapManager needs QuoteManager.lastQuote)
      // QuoteManager.getQuote expects a string (decimal amount), not BigInt
      const originalEthers = window.ethers;
      const ethers6 = window.ethers6 || window.ethers;
      window.ethers = ethers6;
      
      try {
        // Pass the string amount, not the BigInt
        const quote = await QuoteManager.getQuote(amount);
        
        if (!quote) {
          throw new Error('Could not get quote');
        }

        // Execute swap using SwapManager (it uses QuoteManager.lastQuote)
        await SwapManager.executeSwap();
      } finally {
        window.ethers = originalEthers;
      }

      // Clear amounts after successful swap
      this.clearAmounts();
      
      // Update balances
      await this.updateBalances();
      
      // Update button
      this.updateSwapButton();

      if (swapBtn) {
        swapBtn.disabled = false;
        const span = swapBtn.querySelector('span');
        if (span) span.textContent = 'Swap';
      }
    } catch (error) {
      console.error('Error executing swap:', error);
      if (swapBtn) {
        swapBtn.disabled = false;
        const span = swapBtn.querySelector('span');
        if (span) span.textContent = 'Swap';
      }
      alert('Error executing swap: ' + error.message);
    }
  },

  // Start price updates
  startPriceUpdates() {
    this.stopPriceUpdates();
    this.priceUpdateInterval = setInterval(() => {
      if (WalletManager.isConnected) {
        this.updateBalances();
        const fromAmountInput = document.getElementById('testFromAmount');
        if (fromAmountInput?.value) {
          this.handleAmountInput();
        }
      }
    }, 10000); // Update every 10 seconds
  },

  // Stop price updates
  stopPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  },

  // Check market wallet connection periodically
  checkMarketWalletConnection() {
    // Only check if we're in market context (has mainConnectWalletButton)
    const mainBtn = document.getElementById('mainConnectWalletButton');
    if (!mainBtn) {
      // Not in market context, skip periodic checking
      return;
    }
    
    setInterval(async () => {
      if (window.userAccount && !WalletManager.isConnected) {
        try {
          await WalletManager.connect(false);
          this.onWalletConnected();
        } catch (error) {
          // Silently fail - wallet might not be ready
        }
      } else if (!window.userAccount && WalletManager.isConnected) {
        // Market wallet disconnected
        WalletManager.disconnect();
        this.onWalletDisconnected();
      }
      // Sincronizar estado del botón
      this.syncButtonState();
    }, 2000); // Check every 2 seconds
  },

  // Sincronizar estado del botón con el market
  syncButtonState() {
    const swapBtn = document.getElementById('testSwapBtn');
    const mainBtn = document.getElementById('mainConnectWalletButton');
    if (!swapBtn || !mainBtn) return;
    
    const span = swapBtn.querySelector('span');
    if (!span) return;
    
    // Si el market tiene wallet conectada pero WalletManager no, sincronizar
    if (window.userAccount && !WalletManager.isConnected) {
      WalletManager.connect(false).then(() => {
        this.onWalletConnected();
        this.updateSwapButton();
      }).catch(err => console.warn('Error syncing wallet:', err));
      return;
    }
    
    // Sincronizar texto del botón con el estado del market
    const mainBtnText = mainBtn.textContent.trim();
    if (mainBtnText.includes('Connected:') && span.textContent.includes('Connect')) {
      // Market tiene wallet pero el botón del swap aún muestra "Connect Wallet"
      if (WalletManager.isConnected) {
        this.updateSwapButton();
      }
    } else if (!mainBtnText.includes('Connected:') && !span.textContent.includes('Connect')) {
      // Market desconectó pero el botón del swap aún muestra estado conectado
      span.textContent = 'Connect Wallet';
      swapBtn.disabled = false;
    }
  }
};

// Initialize when DOM is ready and swap modules are loaded
function initializeTestSwapWidget() {
  // Check if ALL swap modules are available
  const modulesReady = typeof CONFIG !== 'undefined' && 
                       typeof NetworkManager !== 'undefined' && 
                       typeof WalletManager !== 'undefined' &&
                       typeof PriceManager !== 'undefined' &&
                       typeof QuoteManager !== 'undefined' &&
                       typeof SwapManager !== 'undefined';
  
  if (modulesReady) {
    TestSwapWidget.init();
    return true;
  } else {
    // Retry after a delay (max 30 seconds)
    const retryCount = window.swapWidgetRetryCount || 0;
    if (retryCount < 30) {
      window.swapWidgetRetryCount = retryCount + 1;
      setTimeout(initializeTestSwapWidget, 1000);
    } else {
      console.error('❌ Swap modules failed to load after 30 seconds');
    }
    return false;
  }
}

// Listen for swap modules ready event
window.addEventListener('swapModulesReady', () => {
  console.log('📦 Swap modules ready event received');
  initializeTestSwapWidget();
});

// Wait for swap modules to be loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Start checking after a short delay to let scripts load
    setTimeout(initializeTestSwapWidget, 3000);
  });
} else {
  setTimeout(initializeTestSwapWidget, 3000);
}

// Export for global access
window.TestSwapWidget = TestSwapWidget;

