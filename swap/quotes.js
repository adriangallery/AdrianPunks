// Price and Quote Calculation Module
// Handles price estimation and quote fetching

const QuoteManager = {
  lastQuote: null,
  isLoadingQuote: false,
  priceUpdateInterval: null,
  cachedRatio: null,      // Cached ratio from contract (ADRIAN per ETH in wei)
  ratioTimestamp: null,   // When ratio was last fetched

  // Initialize quote manager
  async init() {
    this.setupInputListeners();
    // Fetch real ratio from contract on init
    await this.fetchRatioFromContract();
  },

  // Fetch the real pool ratio from contract
  async fetchRatioFromContract() {
    try {
      // Get ethers library (v6 for swap)
      const ethersLib = window.swapEthers || window.ethers6 || window.ethers;
      if (!ethersLib) {
        console.warn('⚠️ Ethers not available, using fallback');
        this.cachedRatio = BigInt('117000000000000000000000000'); // 117M * 10^18
        this.ratioTimestamp = Date.now();
        return this.cachedRatio;
      }
      
      // Verificar que CONFIG existe y tiene BASE_MAINNET
      if (!CONFIG || (!CONFIG.NETWORK && !CONFIG.BASE_MAINNET)) {
        console.warn('⚠️ Network configuration not available, using fallback');
        this.cachedRatio = ethersLib.parseEther('117000000');
        this.ratioTimestamp = Date.now();
        return this.cachedRatio;
      }
      
      const { SWAPPER_ADDRESS, SWAPPER_ABI } = CONFIG;
      // Use CONFIG.BASE_MAINNET if CONFIG.NETWORK doesn't exist
      const networkConfig = (CONFIG && CONFIG.NETWORK) ? CONFIG.NETWORK : (CONFIG && CONFIG.BASE_MAINNET ? CONFIG.BASE_MAINNET : null);
      if (!networkConfig) {
        throw new Error('Network configuration not available');
      }
      if (!networkConfig.rpcUrls || !Array.isArray(networkConfig.rpcUrls) || networkConfig.rpcUrls.length === 0) {
        throw new Error('RPC URLs not available in network configuration');
      }
      const rpcUrl = networkConfig.rpcUrls[0] || 'https://mainnet.base.org';
      
      // Get read provider - ensure it's initialized
      let readProvider = WalletManager.getReadProvider ? WalletManager.getReadProvider() : WalletManager.readProvider;
      
      // If no read provider available, create one
      if (!readProvider) {
        if (ethersLib && ethersLib.JsonRpcProvider) {
          readProvider = new ethersLib.JsonRpcProvider(rpcUrl);
        } else {
          throw new Error('Ethers library not available for creating read provider');
        }
      }
      
      const swapperContract = new ethersLib.Contract(
        SWAPPER_ADDRESS,
        SWAPPER_ABI,
        readProvider
      );

      // Try different reference amounts - larger amounts work better with some pools
      const testAmounts = ['1', '0.5', '0.1', '0.05'];
      
      for (const amountStr of testAmounts) {
        try {
          const referenceAmount = ethersLib.parseEther(amountStr);
          const referenceOutput = await swapperContract.buyAdrian.staticCall(
            referenceAmount,
            { value: referenceAmount }
          );
          
          // Calculate ratio: referenceOutput / referenceAmount
          this.cachedRatio = referenceOutput * 10n ** 18n / referenceAmount;
          this.ratioTimestamp = Date.now();
          
          // Format ratio for display (avoid overflow)
          const ratioNumber = Number(this.cachedRatio) / Number(10n ** 18n);
          console.log(`📊 Pool ratio initialized (${amountStr} ETH test):`, ratioNumber.toLocaleString(), 'ADRIAN per ETH (after tax)');
          
          return this.cachedRatio;
        } catch (testError) {
          console.log(`⚠️ Test with ${amountStr} ETH failed, trying smaller...`);
          continue;
        }
      }
      
      // If all tests fail, use fallback based on observed pool behavior
      // This is calculated from: 0.0001 ETH → ~11,700 ADRIAN (observed)
      // Ratio = 11,700 / 0.0001 = 117,000,000 ADRIAN per ETH (after tax)
      console.log('⚠️ Could not get ratio from contract, using calculated fallback');
      this.cachedRatio = ethersLib.parseEther('117000000'); // 117M ADRIAN per ETH
      this.ratioTimestamp = Date.now();
      
      return this.cachedRatio;
    } catch (error) {
      console.warn('⚠️ Error in fetchRatioFromContract:', error?.message || error);
      // Fallback ratio: 117M ADRIAN per ETH (after tax)
      // Based on observed: 0.0001 ETH → ~11,700 ADRIAN
      try {
        const ethersLib = window.swapEthers || window.ethers;
        if (!ethersLib) {
          console.warn('⚠️ Ethers not available for fallback ratio');
          return null;
        }
        this.cachedRatio = ethersLib.parseEther('117000000');
      } catch (e) {
        // If ethers not available, use BigInt directly
        this.cachedRatio = BigInt('117000000000000000000000000'); // 117M * 10^18
      }
      this.ratioTimestamp = Date.now();
      console.log('📊 Using fallback ratio: 117,000,000 ADRIAN per ETH');
      return this.cachedRatio;
    }
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

    // Validate minimum amounts before getting quote
    const fromTokenSymbolEl = document.getElementById('fromTokenSymbol') || document.getElementById('testFromTokenSymbol');
    if (!fromTokenSymbolEl) return;
    const fromSymbol = fromTokenSymbolEl.textContent;
    const amount = parseFloat(value);
    
    // Check if amount is valid number
    if (isNaN(amount) || amount <= 0) {
      console.log(`Invalid amount: ${value} -> ${amount}`);
      this.clearQuote();
      return;
    }
    
    // Minimum amounts to avoid pool errors
    // Pool rejects amounts < ~0.001 ETH due to precision/rounding issues
    // Testing shows even 0.005 ETH can fail, so we'll use estimation for smaller amounts
    const minAmounts = {
      'ETH': 0.001,     // Recommended minimum for reliable quotes
      'ADRIAN': 1000   // Equivalent to ~0.001 ETH at current ratio
    };
    
    if (amount < minAmounts[fromSymbol]) {
      console.log(`Amount below recommended minimum: ${amount} ${fromSymbol} < ${minAmounts[fromSymbol]} ${fromSymbol}`);
      // Don't block, but will use estimation if staticCall fails
    }

    // Get quote
    await this.getQuote(value);
  },

  // Get quote for swap
  async getQuote(amountIn) {
    if (this.isLoadingQuote) {
      // Return last quote if available while loading
      return this.lastQuote;
    }

    // Check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('Swapper contract not deployed');
      this.showSwapperWarning();
      return this.lastQuote || undefined;
    }

    // Get token symbols - check both standard swap page and test widget
    const fromTokenSymbolEl = document.getElementById('fromTokenSymbol') || document.getElementById('testFromTokenSymbol');
    const toTokenSymbolEl = document.getElementById('toTokenSymbol') || document.getElementById('testToTokenSymbol');
    
    if (!fromTokenSymbolEl || !toTokenSymbolEl) {
      console.warn('Token symbol elements not found');
      return this.lastQuote || undefined;
    }

    const fromSymbol = fromTokenSymbolEl.textContent;
    const toSymbol = toTokenSymbolEl.textContent;

    try {
      this.isLoadingQuote = true;
      // Asegurar que amountIn es un string (ethers v6 requiere string)
      let amountInStr = typeof amountIn === 'string' ? amountIn : String(amountIn);
      
      // Clean invalid input patterns (e.g., "0.010.", "0.010.0", trailing dots)
      amountInStr = amountInStr.replace(/\.+$/, ''); // Remove trailing dots
      amountInStr = amountInStr.replace(/\.{2,}/g, '.'); // Replace multiple dots with single dot
      
      // Validate format before parsing
      if (!/^\d+\.?\d*$/.test(amountInStr) || amountInStr === '.' || (amountInStr.startsWith('.') && amountInStr.length === 1)) {
        throw new Error('Invalid amount format');
      }
      
      // Get ethers library (v6 for swap)
      const ethersLib = window.swapEthers || window.ethers6 || window.ethers;
      if (!ethersLib) {
        throw new Error('Ethers library not available');
      }
      
      const amountInWei = ethersLib.parseEther(amountInStr);

      // Use Alchemy read provider for quotes (faster and more reliable)
      const readProvider = WalletManager.getReadProvider();
      if (!readProvider) {
        throw new Error('Provider not available');
      }
      
      // Create swapper contract instance with read provider
      const swapperContract = new ethersLib.Contract(
        CONFIG.SWAPPER_ADDRESS,
        SWAPPER_ABI,
        readProvider
      );

      let estimatedOutput;

      // Simulate swap based on direction
      if (fromSymbol === 'ETH' && toSymbol === 'ADRIAN') {
        // Buy ADRIAN with ETH - no necesita approve
        // Asegurarse que approve section esté oculta
        this.hideApprovalSection();
        
        try {
          estimatedOutput = await swapperContract.buyAdrian.staticCall(
            amountInWei,
            { value: amountInWei }
          );
        } catch (staticCallError) {
          // If staticCall fails for small amounts, use cached ratio
          // Check for various error formats (v5 vs v6)
          const errorMessage = staticCallError?.message || staticCallError?.reason || String(staticCallError);
          const errorData = staticCallError?.data || staticCallError?.error?.data;
          
          // Check if it's a revert error (could be "transfer to zero address" or "invalid length for result data")
          if (errorMessage.includes('transfer to zero address') || 
              errorMessage.includes('revert') ||
              errorMessage.includes('invalid length') ||
              errorMessage.includes('BAD_DATA') ||
              (errorData && typeof errorData === 'string' && errorData.includes('08c379a0'))) { // Error selector
            
            // Use cached ratio (always available from init)
            if (!this.cachedRatio) {
              await this.fetchRatioFromContract();
            }
            
            // Format ratio for display (avoid overflow)
            const ratioNumber = Number(this.cachedRatio) / Number(10n ** 18n);
            console.log('⚠️ Using cached ratio for small amount:', ratioNumber.toLocaleString(), 'ADRIAN/ETH');
            
            // Calculate estimate using cached ratio
            estimatedOutput = (amountInWei * this.cachedRatio) / (10n ** 18n);
            
            // Mark as estimate
            const estimatedAmountOut = ethers.formatEther(estimatedOutput);
            this.lastQuote = {
              amountIn,
              amountOut: estimatedAmountOut,
              fromSymbol,
              toSymbol,
              timestamp: Date.now(),
              isEstimate: true
            };
            
            this.updateQuoteDisplay(estimatedAmountOut);
            this.updateToValueUSD(estimatedAmountOut);
            this.updateTransactionDetails();
            this.updateSwapButton();
            
            this.isLoadingQuote = false;
            return this.lastQuote; // Return the estimate quote
          } else {
            // Re-throw if it's a different error
            throw staticCallError;
          }
        }
      } else if (fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        // Sell ADRIAN for ETH
        // Para vender necesitamos primero verificar allowance
        const ethersLib = window.swapEthers || window.ethers6 || window.ethers;
        if (!ethersLib) {
          throw new Error('Ethers library not available');
        }
        
        const allowance = await WalletManager.checkAllowance();
        const allowanceWei = ethersLib.parseEther(allowance);
        
        if (allowanceWei < amountInWei) {
          // No hay allowance suficiente - mostrar mensaje pero calcular estimado
          console.log('⚠️ Allowance insufficient for exact quote, using estimation');
          
          // Usar una estimación aproximada basada en el ratio del pool
          // Aproximadamente 1 ETH = 130,000 ADRIAN (ajustar según pool real)
          // Con 10% tax: output = (amountIn / 130000) * 0.9
          const ratio = 130000n; // Ratio aproximado ETH:ADRIAN
          estimatedOutput = (amountInWei * ethersLib.parseEther('1')) / (ratio * ethersLib.parseEther('1')) * 9n / 10n;
          
          // Mostrar que necesita aprobación
          this.showApprovalNeeded();
        } else {
          // Hay allowance - podemos simular
          // Ocultar approve section si ya está aprobado
          this.hideApprovalSection();
          
          try {
            estimatedOutput = await swapperContract.sellAdrian.staticCall(
              amountInWei
            );
          } catch (staticCallError) {
            // Handle revert errors for sellAdrian
            const errorMessage = staticCallError?.message || staticCallError?.reason || String(staticCallError);
            const errorData = staticCallError?.data || staticCallError?.error?.data;
            
            if (errorMessage.includes('revert') ||
                errorMessage.includes('invalid length') ||
                errorMessage.includes('BAD_DATA') ||
                (errorData && typeof errorData === 'string' && errorData.includes('08c379a0'))) {
              // Use cached ratio for estimation
              if (!this.cachedRatio) {
                await this.fetchRatioFromContract();
              }
              
              const ratioNumber = Number(this.cachedRatio) / Number(10n ** 18n);
              console.log('⚠️ Using cached ratio for sellAdrian:', ratioNumber.toLocaleString(), 'ADRIAN/ETH');
              
              // Calculate estimate: amountIn ADRIAN / ratio = ETH out (before tax)
              const ethOutBeforeTax = (amountInWei * 10n ** 18n) / this.cachedRatio;
              // Apply 10% tax
              estimatedOutput = (ethOutBeforeTax * 9n) / 10n;
            } else {
              throw staticCallError;
            }
          }
        }
      } else {
        throw new Error('Invalid token pair');
      }

      // Format amountOut with proper precision
      // The contract returns amountOut AFTER tax (10% already applied by hook)
      const amountOutRaw = ethers.formatEther(estimatedOutput);
      // Keep full precision - formatEther already returns a string with proper decimals
      // Don't remove trailing zeros yet - let updateQuoteDisplay handle formatting
      const amountOut = amountOutRaw;
      
      console.log('💱 Quote amountOut:', {
        raw: amountOutRaw,
        wei: estimatedOutput.toString(),
        weiHex: estimatedOutput.toString(16),
        amountIn: amountIn,
        amountInWei: amountInWei.toString()
      });

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

      // Update ADRIAN price based on real quote ratio
      if (window.PriceManager && this.lastQuote) {
        window.PriceManager.getADRIANPrice().then(newPrice => {
          window.PriceManager.prices.ADRIAN = newPrice;
          window.PriceManager.updateValueDisplays();
        });
      }

      console.log('💱 Quote:', this.lastQuote);
      
      // Return the quote
      this.isLoadingQuote = false;
      return this.lastQuote;

    } catch (error) {
      console.error('Error getting quote:', error);
      this.isLoadingQuote = false;
      
      // Si es error de allowance y estamos vendiendo ADRIAN, mostrar mensaje especial
      if (error.message && error.message.includes('allowance') && fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        console.log('💡 You need to approve ADRIAN first to sell');
        this.showApprovalNeeded();
        
        // Intentar dar una estimación aproximada
        try {
          const ethersLib = window.swapEthers || window.ethers6 || window.ethers;
          if (!ethersLib) {
            throw new Error('Ethers library not available');
          }
          // Asegurar que amountIn es un string (ethers v6 requiere string)
          const amountInStr = typeof amountIn === 'string' ? amountIn : String(amountIn);
          const amountInWei = ethersLib.parseEther(amountInStr);
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
          
          // Return the estimate quote
          return this.lastQuote;
        } catch (e) {
          this.clearQuote();
        }
      } else if (error.message.includes('transfer to zero address') || 
                 (error.message.includes('revert') && error.data && error.data.includes('0x08c379a0'))) {
        // Pool rejects very small amounts - show helpful message
        this.clearQuote();
        const minRecommended = fromSymbol === 'ETH' ? '0.0005' : '500';
        NetworkManager.showToast(
          'Amount Too Small',
          `This amount is too small for the pool. Try at least ${minRecommended} ${fromSymbol}.`,
          'warning'
        );
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
      // Keep full precision from contract
      // Don't use parseFloat as it can lose precision for large numbers
      // Instead, work with the string directly
      let formatted = amountOut;
      
      // If it's a string with decimals, format it properly
      if (typeof amountOut === 'string') {
        // Remove trailing zeros but keep all significant digits
        formatted = amountOut.replace(/\.?0+$/, '');
      } else {
        // If it's already a number, format with enough decimals
        const num = parseFloat(amountOut);
        // For ADRIAN, we might have large numbers, so use more precision
        formatted = num.toFixed(6).replace(/\.?0+$/, '');
      }
      
      toAmount.value = formatted;
      
      console.log('📊 Displaying quote:', {
        original: amountOut,
        formatted: formatted,
        type: typeof amountOut
      });
      
      // Update USD value for to amount
      this.updateToValueUSD(amountOut);
    }
  },

  // Update from value in USD
  updateFromValueUSD(amount) {
    // Get from symbol - check both standard swap page and test widget
    const fromTokenSymbolEl = document.getElementById('fromTokenSymbol') || document.getElementById('testFromTokenSymbol');
    if (!fromTokenSymbolEl) return;
    const fromSymbol = fromTokenSymbolEl.textContent;
    
    // Get from value USD - check both standard swap page and test widget
    const fromValueUSD = document.getElementById('fromValueUSD') || document.getElementById('testFromValueUSD');
    
    if (fromValueUSD && window.PriceManager) {
      const value = PriceManager.calculateUSDValue(amount, fromSymbol);
      fromValueUSD.textContent = value.toFixed(2);
    }
  },

  // Update to value in USD
  updateToValueUSD(amount) {
    // Get to symbol - check both standard swap page and test widget
    const toTokenSymbolEl = document.getElementById('toTokenSymbol') || document.getElementById('testToTokenSymbol');
    if (!toTokenSymbolEl) return;
    const toSymbol = toTokenSymbolEl.textContent;
    
    // Get to value USD - check both standard swap page and test widget
    const toValueUSD = document.getElementById('toValueUSD') || document.getElementById('testToValueUSD');
    
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
    // Note: amountOut already includes 10% tax (applied by hook)
    // So we need to calculate the rate using the amount BEFORE tax for accurate display
    const amountOut = parseFloat(this.lastQuote.amountOut);
    const amountIn = parseFloat(this.lastQuote.amountIn);
    
    // Calculate amount before tax: amountOut = amountBeforeTax * 0.9
    // So: amountBeforeTax = amountOut / 0.9
    const amountBeforeTax = amountOut / 0.9;
    const rate = amountBeforeTax / amountIn;
    
    if (exchangeRate) {
      if (this.lastQuote.fromSymbol === 'ETH') {
        // Format large numbers with commas for readability
        const formattedRate = rate.toLocaleString('en-US', { maximumFractionDigits: 0 });
        exchangeRate.textContent = `1 ETH = ${formattedRate} ADRIAN`;
      } else {
        exchangeRate.textContent = `1 ADRIAN = ${rate.toFixed(10)} ETH`;
      }
    }

    // Calculate tax (10%)
    // Tax = amountBeforeTax - amountOut = amountOut / 0.9 - amountOut
    if (taxAmount) {
      const tax = amountBeforeTax - amountOut; // This equals amountOut / 0.9 * 0.1
      // Format based on token - ADRIAN can be large numbers, ETH is small
      const formattedTax = this.lastQuote.toSymbol === 'ADRIAN' 
        ? tax.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : tax.toFixed(8);
      taxAmount.textContent = `~${formattedTax} ${this.lastQuote.toSymbol}`;
    }

    // Calculate price impact (simplified - in real scenario would compare to pool price)
    if (priceImpact) {
      try {
        const impact = this.calculatePriceImpact();
        priceImpact.textContent = `${impact.toFixed(2)}%`;
        
        // Update color based on impact
        priceImpact.className = '';
        if (impact < 1) priceImpact.className = 'price-impact-low';
        else if (impact < 3) priceImpact.className = 'price-impact-medium';
        else priceImpact.className = 'price-impact-high';
      } catch (error) {
        console.warn('Error updating price impact:', error);
      }
    }

    // Calculate minimum received with slippage
    if (minimumReceived) {
      try {
        const min = this.calculateMinimumReceived();
        // Format based on token - ADRIAN can be large numbers, ETH is small
        const formattedMin = this.lastQuote.toSymbol === 'ADRIAN'
          ? min.toLocaleString('en-US', { maximumFractionDigits: 2 })
          : min.toFixed(8);
        minimumReceived.textContent = `${formattedMin} ${this.lastQuote.toSymbol}`;
      } catch (error) {
        console.warn('Error updating minimum received:', error);
      }
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
    // amountOut already has tax applied, so we apply slippage directly
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
      const gasReserve = 0.0002; // Reserve 0.0002 ETH for gas (Base is cheap, ~$0.50-1.00)
      const recommendedMin = 0.001; // Recommended minimum for reliable quotes
      const minTotalRequired = recommendedMin + gasReserve; // 0.0012 ETH total
      
      if (balance < minTotalRequired) {
        // Still allow swap if balance > gas reserve, but warn about estimation
        if (balance < gasReserve + 0.0001) {
          NetworkManager.showToast(
            'Insufficient Balance',
            `You need at least ${(gasReserve + 0.0001).toFixed(4)} ETH for gas and minimum swap. Current: ${balance.toFixed(4)} ETH`,
            'warning'
          );
          return;
        }
        
        // Allow smaller amounts but warn about estimation
        const availableBalance = balance - gasReserve;
        fromAmount.value = availableBalance.toFixed(6);
        this.handleAmountInput(fromAmount.value);
        
        NetworkManager.showToast(
          'Note',
          'Amount below recommended minimum. Quote will be estimated if exact calculation fails.',
          'info'
        );
        return;
      }
      
      const availableBalance = balance - gasReserve;
      
      // Set the available balance
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

