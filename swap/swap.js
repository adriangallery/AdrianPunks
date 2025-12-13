// Swap Execution Module
// Handles the actual swap transactions

const SwapManager = {
  isSwapping: false,
  recentTransactions: [],

  // Initialize swap manager
  init() {
    this.setupEventListeners();
    this.loadRecentTransactions();
  },

  // Setup event listeners
  setupEventListeners() {
    const swapBtn = document.getElementById('swapBtn');
    const approveBtn = document.getElementById('approveBtn');

    if (swapBtn) {
      swapBtn.addEventListener('click', () => this.executeSwap());
    }

    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.handleApprove());
    }
  },

  // Execute swap transaction
  async executeSwap() {
    if (this.isSwapping) {
      console.log('Swap already in progress');
      return;
    }

    // Validate
    if (!QuoteManager.lastQuote) {
      NetworkManager.showToast('Error', 'No valid quote available', 'error');
      return;
    }

    // Check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      NetworkManager.showToast(
        'Error',
        'Swapper contract is not deployed',
        'error'
      );
      return;
    }

    const { amountIn, fromSymbol, toSymbol } = QuoteManager.lastQuote;

    try {
      this.isSwapping = true;
      this.showLoadingState(true, 'Preparing swap...');

      // Ensure correct network
      await NetworkManager.ensureCorrectNetwork();

      // Get signer
      const signer = WalletManager.getSigner();

      // Create swapper contract
      const swapperContract = new ethers.Contract(
        CONFIG.SWAPPER_ADDRESS,
        SWAPPER_ABI,
        signer
      );

      let tx;
      const amountInWei = ethers.parseEther(amountIn);

      if (fromSymbol === 'ETH' && toSymbol === 'ADRIAN') {
        // Buy ADRIAN with ETH
        await this.executeBuyAdrian(swapperContract, amountInWei);
      } else if (fromSymbol === 'ADRIAN' && toSymbol === 'ETH') {
        // Sell ADRIAN for ETH
        await this.executeSellAdrian(swapperContract, amountInWei);
      } else {
        throw new Error('Invalid token pair');
      }

    } catch (error) {
      console.error('Error executing swap:', error);
      this.handleSwapError(error);
    } finally {
      this.isSwapping = false;
      this.showLoadingState(false);
    }
  },

  // Execute buy ADRIAN (ETH → ADRIAN)
  async executeBuyAdrian(contract, amountInWei) {
    try {
      this.showLoadingState(true, 'Buying ADRIAN...');

      console.log('🔵 Buying ADRIAN with ETH:', ethers.formatEther(amountInWei), 'ETH');

      // Execute transaction
      const tx = await contract.buyAdrian(amountInWei, {
        value: amountInWei
      });

      NetworkManager.showToast(
        'Transaction Sent',
        'Waiting for confirmation...',
        'info'
      );

      this.showLoadingState(true, 'Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('✅ Buy ADRIAN successful:', receipt.hash);

      // Handle success
      this.handleSwapSuccess(receipt, 'ETH', 'ADRIAN');

    } catch (error) {
      throw error;
    }
  },

  // Execute sell ADRIAN (ADRIAN → ETH)
  async executeSellAdrian(contract, amountInWei) {
    try {
      // Check allowance first
      const allowance = await WalletManager.checkAllowance();
      const amountIn = ethers.formatEther(amountInWei);

      if (parseFloat(allowance) < parseFloat(amountIn)) {
        // Need approval
        this.showApproveSection(true);
        NetworkManager.showToast(
          'Approval Required',
          'You must approve ADRIAN before selling',
          'warning'
        );
        this.isSwapping = false;
        this.showLoadingState(false);
        return;
      }

      this.showLoadingState(true, 'Selling ADRIAN...');

      console.log('🟠 Selling ADRIAN for ETH:', ethers.formatEther(amountInWei), 'ADRIAN');

      // Execute transaction
      const tx = await contract.sellAdrian(amountInWei);

      NetworkManager.showToast(
        'Transaction Sent',
        'Waiting for confirmation...',
        'info'
      );

      this.showLoadingState(true, 'Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('✅ Sell ADRIAN successful:', receipt.hash);

      // Handle success
      this.handleSwapSuccess(receipt, 'ADRIAN', 'ETH');

    } catch (error) {
      throw error;
    }
  },

  // Handle approve button
  async handleApprove() {
    try {
      this.showLoadingState(true, 'Approving ADRIAN...');

      await WalletManager.approveAdrian();

      // Hide approve section
      this.showApproveSection(false);

      // Update swap button
      QuoteManager.updateSwapButton();

    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      this.showLoadingState(false);
    }
  },

  // Show/hide approve section
  showApproveSection(show) {
    const approveSection = document.getElementById('approveSection');
    if (approveSection) {
      approveSection.style.display = show ? 'block' : 'none';
    }
  },

  // Handle swap success
  handleSwapSuccess(receipt, fromSymbol, toSymbol) {
    NetworkManager.showToast(
      '🎉 Swap Successful',
      'Your swap completed successfully',
      'success'
    );

    // Save to recent transactions
    this.addRecentTransaction({
      hash: receipt.hash,
      from: fromSymbol,
      to: toSymbol,
      amount: QuoteManager.lastQuote.amountIn,
      timestamp: Date.now()
    });

    // Clear form
    const fromAmount = document.getElementById('fromAmount');
    const toAmount = document.getElementById('toAmount');
    if (fromAmount) fromAmount.value = '';
    if (toAmount) toAmount.value = '';
    QuoteManager.clearQuote();

    // Update balances
    setTimeout(() => {
      WalletManager.updateBalances();
    }, 2000);

    // Show transaction link
    const txUrl = CONFIG.EXPLORER.tx(receipt.hash);
    console.log('📝 Transaction:', txUrl);
  },

  // Handle swap error
  handleSwapError(error) {
    console.error('Swap error:', error);

    let errorMessage = 'Error executing swap';

    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      errorMessage = 'Transaction cancelled by user';
      NetworkManager.showToast('Cancelled', errorMessage, 'warning');
    } else if (error.message.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for gas';
      NetworkManager.showToast('Error', errorMessage, 'error');
    } else if (error.message.includes('SPL')) {
      errorMessage = 'Slippage exceeded. Try increasing slippage.';
      NetworkManager.showToast('Error', errorMessage, 'error');
    } else if (error.message.includes('CurrencyNotSettled')) {
      errorMessage = 'Internal swap error. Please try again.';
      NetworkManager.showToast('Error', errorMessage, 'error');
    } else {
      NetworkManager.showToast('Error', 'Error executing swap', 'error');
    }
  },

  // Show/hide loading state
  showLoadingState(show, message = 'Processing...') {
    const loadingState = document.getElementById('loadingState');
    const loadingText = document.getElementById('loadingText');
    const swapBtn = document.getElementById('swapBtn');

    if (loadingState) {
      loadingState.style.display = show ? 'flex' : 'none';
    }

    if (loadingText && message) {
      loadingText.textContent = message;
    }

    if (swapBtn) {
      swapBtn.disabled = show;
    }
  },

  // Add transaction to recent list
  addRecentTransaction(tx) {
    this.recentTransactions.unshift(tx);

    // Keep only last N transactions
    if (this.recentTransactions.length > CONFIG.MAX_RECENT_TXS) {
      this.recentTransactions = this.recentTransactions.slice(0, CONFIG.MAX_RECENT_TXS);
    }

    // Save to localStorage
    this.saveRecentTransactions();

    // Update UI
    this.updateRecentTransactionsUI();
  },

  // Save recent transactions to localStorage
  saveRecentTransactions() {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.recentTxs,
        JSON.stringify(this.recentTransactions)
      );
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  },

  // Load recent transactions from localStorage
  loadRecentTransactions() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.recentTxs);
      if (stored) {
        this.recentTransactions = JSON.parse(stored);
        this.updateRecentTransactionsUI();
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  },

  // Update recent transactions UI
  updateRecentTransactionsUI() {
    const container = document.getElementById('recentTransactions');
    const list = document.getElementById('transactionsList');

    if (!list) return;

    if (this.recentTransactions.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    if (container) container.style.display = 'block';

    // Build HTML
    list.innerHTML = this.recentTransactions.map(tx => {
      const date = new Date(tx.timestamp).toLocaleString('es-ES', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="transaction-item">
          <div>
            <div class="transaction-type">${tx.from} → ${tx.to}</div>
            <div class="transaction-amount">${parseFloat(tx.amount).toFixed(4)} ${tx.from}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${date}</div>
            <a href="${CONFIG.EXPLORER.tx(tx.hash)}" target="_blank" class="transaction-link">
              Ver en BaseScan ↗
            </a>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SwapManager = SwapManager;
}

