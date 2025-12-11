// Price and Quote Calculation Module
// Handles price estimation and quote fetching

const QuoteManager = {
  lastQuote: null,
  isLoadingQuote: false,
  priceUpdateInterval: null,

  // Initialize quote manager
  init() {
    this.setupInputListeners();
  },

  // Setup input event listeners
  setupInputListeners() {
    const fromAmount = document.getElementById('fromAmount');
    const swapDirectionBtn = document.getElementById('swapDirectionBtn');
    const maxBtn = document.getElementById('maxBtn');

    if (fromAmount) {
      // Debounce input to avoid too many requests
      let debounceTimer;
      fromAmount.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.handleAmountInput(e.target.value);
        }, 500);
      });
    }

    if (swapDirectionBtn) {
      swapDirectionBtn.addEventListener('click', () => {
        this.swapDirection();
      });
    }

    if (maxBtn) {
      maxBtn.addEventListener('click', () => {
        this.setMaxAmount();
      });
    }
  },

  // Handle amount input change
  async handleAmountInput(value) {
    // Validate input
    if (!value || value === '0' || value === '0.' || value === '.') {
      this.clearQuote();
      return;
    }

    // Check if wallet is ready
    if (!WalletManager.isReady()) {
      return;
    }

    // Get quote
    await this.getQuote(value);
  },

  // Get quote for swap
  async getQuote(amountIn) {
    if (this.isLoadingQuote) return;

    // Check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('Swapper contract not deployed');
      this.showSwapperWarning();
      return;
    }

    const fromSymbol = document.getElementById('fromTokenSymbol').textContent;
    const toSymbol = document.getElementById('toTokenSymbol').textContent;

    try {
      this.isLoadingQuote = true;
      const amountInWei = ethers.parseEther(amountIn);

      // Create swapper contract instance
      const swapperContract = new ethers.Contract(
        CONFIG.SWAPPER_ADDRESS,
        SWAPPER_ABI,
        WalletManager.provider
      );

      let estimatedOutput;

      // Simulate swap based on direction
      if (fromSymbol === 'ETH' && toSymbol === 'ADRIAN') {
        // Buy ADRIAN with ETH
        estimatedOutput = await swapperContract.buyAdrian.staticCall(
          amountInWei,
          { value: amountInWei }
        );
      } else if (fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        // Sell ADRIAN for ETH
        estimatedOutput = await swapperContract.sellAdrian.staticCall(
          amountInWei
        );
      } else {
        throw new Error('Invalid token pair');
      }

      const amountOut = ethers.formatEther(estimatedOutput);

      // Store quote
      this.lastQuote = {
        amountIn,
        amountOut,
        fromSymbol,
        toSymbol,
        timestamp: Date.now()
      };

      // Update UI
      this.updateQuoteDisplay(amountOut);
      this.updateTransactionDetails();
      this.updateSwapButton();

      console.log('💱 Quote:', this.lastQuote);

    } catch (error) {
      console.error('Error getting quote:', error);
      this.clearQuote();
      
      // Check if it's a revert error
      if (error.message.includes('revert') || error.message.includes('insufficient')) {
        NetworkManager.showToast(
          'Error',
          'Liquidez insuficiente o cantidad inválida',
          'error'
        );
      }
    } finally {
      this.isLoadingQuote = false;
    }
  },

  // Update quote display in UI
  updateQuoteDisplay(amountOut) {
    const toAmount = document.getElementById('toAmount');
    if (toAmount) {
      toAmount.value = parseFloat(amountOut).toFixed(6);
    }
  },

  // Update transaction details
  updateTransactionDetails() {
    if (!this.lastQuote) return;

    const detailsSection = document.getElementById('transactionDetails');
    const exchangeRate = document.getElementById('exchangeRate');
    const taxAmount = document.getElementById('taxAmount');
    const priceImpact = document.getElementById('priceImpact');
    const minimumReceived = document.getElementById('minimumReceived');

    if (detailsSection) {
      detailsSection.style.display = 'block';
    }

    // Calculate exchange rate
    const rate = parseFloat(this.lastQuote.amountOut) / parseFloat(this.lastQuote.amountIn);
    if (exchangeRate) {
      if (this.lastQuote.fromSymbol === 'ETH') {
        exchangeRate.textContent = `1 ETH = ${rate.toFixed(2)} ADRIAN`;
      } else {
        exchangeRate.textContent = `1 ADRIAN = ${rate.toFixed(8)} ETH`;
      }
    }

    // Calculate tax (10%)
    if (taxAmount) {
      const tax = parseFloat(this.lastQuote.amountOut) * 0.1;
      taxAmount.textContent = `~${tax.toFixed(6)} ${this.lastQuote.toSymbol}`;
    }

    // Calculate price impact (simplified - in real scenario would compare to pool price)
    if (priceImpact) {
      const impact = this.calculatePriceImpact();
      priceImpact.textContent = `${impact.toFixed(2)}%`;
      
      // Update color based on impact
      priceImpact.className = '';
      if (impact < 1) priceImpact.className = 'price-impact-low';
      else if (impact < 3) priceImpact.className = 'price-impact-medium';
      else priceImpact.className = 'price-impact-high';
    }

    // Calculate minimum received with slippage
    if (minimumReceived) {
      const min = this.calculateMinimumReceived();
      minimumReceived.textContent = `${min.toFixed(6)} ${this.lastQuote.toSymbol}`;
    }
  },

  // Calculate price impact (simplified)
  calculatePriceImpact() {
    // In a real implementation, this would compare the execution price
    // to the current pool price. For now, we'll use a simplified version
    const amountIn = parseFloat(this.lastQuote.amountIn);
    
    // Larger trades have more impact
    if (amountIn < 0.01) return 0.01;
    if (amountIn < 0.1) return 0.1;
    if (amountIn < 1) return 0.5;
    return 1.0;
  },

  // Calculate minimum received with slippage
  calculateMinimumReceived() {
    const slippage = this.getSlippage();
    const amountOut = parseFloat(this.lastQuote.amountOut);
    const slippageBps = slippage * 100;
    const minReceived = amountOut * (1 - slippageBps / 10000);
    return minReceived;
  },

  // Get current slippage setting
  getSlippage() {
    const slippageInput = document.getElementById('slippageInput');
    return slippageInput ? parseFloat(slippageInput.value) : CONFIG.DEFAULT_SLIPPAGE;
  },

  // Clear quote
  clearQuote() {
    this.lastQuote = null;
    
    const toAmount = document.getElementById('toAmount');
    const detailsSection = document.getElementById('transactionDetails');
    
    if (toAmount) toAmount.value = '';
    if (detailsSection) detailsSection.style.display = 'none';
    
    this.updateSwapButton();
  },

  // Update swap button state
  updateSwapButton() {
    const swapBtn = document.getElementById('swapBtn');
    const swapBtnText = document.getElementById('swapBtnText');
    
    if (!swapBtn || !swapBtnText) return;

    // Check if wallet is connected
    if (!WalletManager.isConnected) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Conecta tu wallet';
      return;
    }

    // Check if on correct network
    if (!NetworkManager.isCorrectNetwork) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Red Incorrecta';
      return;
    }

    // Check if quote is valid
    if (!this.lastQuote) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Ingresa cantidad';
      return;
    }

    // Check if amount is valid
    const fromAmount = parseFloat(this.lastQuote.amountIn);
    const balance = parseFloat(WalletManager.getBalance(this.lastQuote.fromSymbol));
    
    if (fromAmount > balance) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Saldo Insuficiente';
      return;
    }

    // All good - enable swap
    swapBtn.disabled = false;
    swapBtnText.textContent = `Swap ${this.lastQuote.fromSymbol} → ${this.lastQuote.toSymbol}`;
  },

  // Swap direction (ETH ↔ ADRIAN)
  swapDirection() {
    const fromSymbol = document.getElementById('fromTokenSymbol');
    const toSymbol = document.getElementById('toTokenSymbol');
    const fromIcon = document.getElementById('fromTokenIcon');
    const toIcon = document.getElementById('toTokenIcon');

    // Swap symbols
    const tempSymbol = fromSymbol.textContent;
    fromSymbol.textContent = toSymbol.textContent;
    toSymbol.textContent = tempSymbol;

    // Swap icons
    const tempIcon = fromIcon.src;
    fromIcon.src = toIcon.src;
    toIcon.src = tempIcon;

    // Clear amounts
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';

    // Update balances
    WalletManager.updateBalanceDisplay();

    // Clear quote
    this.clearQuote();

    console.log('🔄 Direction swapped:', fromSymbol.textContent, '→', toSymbol.textContent);
  },

  // Set max amount
  setMaxAmount() {
    const fromSymbol = document.getElementById('fromTokenSymbol').textContent;
    let balance = parseFloat(WalletManager.getBalance(fromSymbol));

    // If ETH, leave some for gas
    if (fromSymbol === 'ETH') {
      balance = Math.max(0, balance - 0.001); // Reserve 0.001 ETH for gas
    }

    const fromAmount = document.getElementById('fromAmount');
    if (fromAmount && balance > 0) {
      fromAmount.value = balance.toFixed(6);
      this.handleAmountInput(fromAmount.value);
    }
  },

  // Show swapper warning
  showSwapperWarning() {
    NetworkManager.showToast(
      '⚠️ Contrato No Desplegado',
      'El contrato Swapper aún no está desplegado. Por favor, despliégalo primero.',
      'warning'
    );
  },

  // Start auto-updating price
  startPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    this.priceUpdateInterval = setInterval(() => {
      const fromAmount = document.getElementById('fromAmount');
      if (fromAmount && fromAmount.value && this.lastQuote) {
        this.getQuote(fromAmount.value);
      }
    }, CONFIG.PRICE_UPDATE_INTERVAL);
  },

  // Stop auto-updating price
  stopPriceUpdates() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QuoteManager = QuoteManager;
}

