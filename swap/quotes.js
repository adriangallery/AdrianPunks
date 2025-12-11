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

    // Update USD value for from amount
    this.updateFromValueUSD(value);

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
        // Buy ADRIAN with ETH - no necesita approve
        // Asegurarse que approve section esté oculta
        this.hideApprovalSection();
        
        estimatedOutput = await swapperContract.buyAdrian.staticCall(
          amountInWei,
          { value: amountInWei }
        );
      } else if (fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        // Sell ADRIAN for ETH
        // Para vender necesitamos primero verificar allowance
        const allowance = await WalletManager.checkAllowance();
        const allowanceWei = ethers.parseEther(allowance);
        
        if (allowanceWei < amountInWei) {
          // No hay allowance suficiente - mostrar mensaje pero calcular estimado
          console.log('⚠️ Allowance insufficient for exact quote, using estimation');
          
          // Usar una estimación aproximada basada en el ratio del pool
          // Aproximadamente 1 ETH = 130,000 ADRIAN (ajustar según pool real)
          // Con 10% tax: output = (amountIn / 130000) * 0.9
          const ratio = 130000n; // Ratio aproximado ETH:ADRIAN
          estimatedOutput = (amountInWei * ethers.parseEther('1')) / (ratio * ethers.parseEther('1')) * 9n / 10n;
          
          // Mostrar que necesita aprobación
          this.showApprovalNeeded();
        } else {
          // Hay allowance - podemos simular
          // Ocultar approve section si ya está aprobado
          this.hideApprovalSection();
          
          estimatedOutput = await swapperContract.sellAdrian.staticCall(
            amountInWei
          );
        }
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
      
      // Si es error de allowance y estamos vendiendo ADRIAN, mostrar mensaje especial
      if (error.message.includes('allowance') && fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        console.log('💡 You need to approve ADRIAN first to sell');
        this.showApprovalNeeded();
        
        // Intentar dar una estimación aproximada
        try {
          const amountInWei = ethers.parseEther(amountIn);
          const ratio = 130000n;
          const estimatedOutput = (amountInWei * ethers.parseEther('1')) / (ratio * ethers.parseEther('1')) * 9n / 10n;
          const amountOut = ethers.formatEther(estimatedOutput);
          
          this.lastQuote = {
            amountIn,
            amountOut,
            fromSymbol,
            toSymbol,
            timestamp: Date.now(),
            isEstimate: true
          };
          
          this.updateQuoteDisplay(amountOut);
          this.updateTransactionDetails();
          this.updateSwapButton();
          
          NetworkManager.showToast(
            'Approval Required',
            'You must approve ADRIAN first. Approximate quote shown.',
            'warning'
          );
        } catch (e) {
          this.clearQuote();
        }
      } else if (error.message.includes('revert') || error.message.includes('insufficient')) {
        this.clearQuote();
        NetworkManager.showToast(
          'Error',
          'Amount too small or insufficient liquidity. Try a larger amount.',
          'error'
        );
      } else if (error.message.includes('transfer to zero address')) {
        this.clearQuote();
        NetworkManager.showToast(
          'Error',
          'Amount too small. Minimum 0.0001 ETH or 100 ADRIAN required.',
          'error'
        );
      } else {
        this.clearQuote();
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
      // Update USD value for to amount
      this.updateToValueUSD(amountOut);
    }
  },

  // Update from value in USD
  updateFromValueUSD(amount) {
    const fromSymbol = document.getElementById('fromTokenSymbol').textContent;
    const fromValueUSD = document.getElementById('fromValueUSD');
    
    if (fromValueUSD && window.PriceManager) {
      const value = PriceManager.calculateUSDValue(amount, fromSymbol);
      fromValueUSD.textContent = value.toFixed(2);
    }
  },

  // Update to value in USD
  updateToValueUSD(amount) {
    const toSymbol = document.getElementById('toTokenSymbol').textContent;
    const toValueUSD = document.getElementById('toValueUSD');
    
    if (toValueUSD && window.PriceManager) {
      const value = PriceManager.calculateUSDValue(amount, toSymbol);
      toValueUSD.textContent = value.toFixed(2);
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
    const fromValueUSD = document.getElementById('fromValueUSD');
    const toValueUSD = document.getElementById('toValueUSD');
    
    if (toAmount) toAmount.value = '';
    if (detailsSection) detailsSection.style.display = 'none';
    if (fromValueUSD) fromValueUSD.textContent = '0.00';
    if (toValueUSD) toValueUSD.textContent = '0.00';
    
    // Also hide approve section when clearing
    this.hideApprovalSection();
    
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
      swapBtnText.textContent = 'Connect Wallet';
      return;
    }

    // Check if on correct network
    if (!NetworkManager.isCorrectNetwork) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Wrong Network';
      return;
    }

    // Check if quote is valid
    if (!this.lastQuote) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Enter amount';
      return;
    }

    // Check if amount is valid
    const fromAmount = parseFloat(this.lastQuote.amountIn);
    const balance = parseFloat(WalletManager.getBalance(this.lastQuote.fromSymbol));
    
    if (fromAmount > balance) {
      swapBtn.disabled = true;
      swapBtnText.textContent = 'Insufficient Balance';
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

    // Swap symbols
    const tempSymbol = fromSymbol.textContent;
    fromSymbol.textContent = toSymbol.textContent;
    toSymbol.textContent = tempSymbol;

    // Clear amounts
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';

    // Update balances
    WalletManager.updateBalanceDisplay();

    // Clear quote and hide approve section
    this.clearQuote();
    this.hideApprovalSection();

    console.log('🔄 Direction swapped:', fromSymbol.textContent, '→', toSymbol.textContent);
  },

  // Set max amount
  setMaxAmount() {
    const fromSymbol = document.getElementById('fromTokenSymbol').textContent;
    let balance = parseFloat(WalletManager.getBalance(fromSymbol));
    
    const fromAmount = document.getElementById('fromAmount');
    
    if (!fromAmount) return;

    // If ETH, leave some for gas
    if (fromSymbol === 'ETH') {
      const gasReserve = 0.001; // Reserve 0.001 ETH for gas
      const availableBalance = Math.max(0, balance - gasReserve);
      
      if (availableBalance <= 0) {
        NetworkManager.showToast(
          'Insufficient Balance',
          `You need at least ${gasReserve} ETH for gas fees`,
          'warning'
        );
        return;
      }
      
      // Set the available balance (even if small)
      fromAmount.value = availableBalance.toFixed(6);
      this.handleAmountInput(fromAmount.value);
      
    } else {
      // For ADRIAN, use full balance
      if (balance > 0) {
        fromAmount.value = balance.toFixed(6);
        this.handleAmountInput(fromAmount.value);
      } else {
        NetworkManager.showToast(
          'No Balance',
          `You don't have any ${fromSymbol}`,
          'warning'
        );
      }
    }
  },

  // Show swapper warning
  showSwapperWarning() {
    NetworkManager.showToast(
      '⚠️ Contract Not Deployed',
      'The Swapper contract is not deployed yet. Please deploy it first.',
      'warning'
    );
  },

  // Show approval needed message
  showApprovalNeeded() {
    const approveSection = document.getElementById('approveSection');
    if (approveSection) {
      approveSection.style.display = 'block';
    }
  },

  // Hide approval section
  hideApprovalSection() {
    const approveSection = document.getElementById('approveSection');
    if (approveSection) {
      approveSection.style.display = 'none';
    }
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

