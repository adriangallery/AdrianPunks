// Main Application Module
// Orchestrates all modules and initializes the app

const App = {
  initialized: false,

  // Initialize the application
  async init() {
    if (this.initialized) {
      console.warn('App already initialized');
      return;
    }

    console.log('🚀 Initializing ADRIAN Swap...');

    try {
      // Check configuration
      if (!validateConfig()) {
        this.showSwapperDeploymentInfo();
      }

      // Initialize all modules
      await this.initializeModules();

      // Setup settings
      this.setupSettings();

      // Setup token selector
      this.setupTokenSelector();

      // Load saved settings
      this.loadSettings();

      this.initialized = true;
      console.log('✅ ADRIAN Swap initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing app:', error);
      NetworkManager.showToast(
        'Error',
        'Error al inicializar la aplicación',
        'error'
      );
    }
  },

  // Initialize all modules
  async initializeModules() {
    // Initialize network manager
    const networkInit = await NetworkManager.init();
    if (!networkInit) {
      console.warn('Network manager initialization failed');
    }

    // Initialize wallet manager
    await WalletManager.init();

    // Initialize price manager
    await PriceManager.init();

    // Initialize quote manager
    QuoteManager.init();

    // Initialize swap manager
    SwapManager.init();

    console.log('📦 All modules initialized');
  },

  // Setup settings modal
  setupSettings() {
    // Slippage presets
    const slippagePresets = document.querySelectorAll('.slippage-preset-btn');
    const slippageInput = document.getElementById('slippageInput');

    slippagePresets.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active from all
        slippagePresets.forEach(b => b.classList.remove('active'));
        
        // Add active to clicked
        btn.classList.add('active');
        
        // Update input
        const slippage = btn.getAttribute('data-slippage');
        if (slippageInput) {
          slippageInput.value = slippage;
          this.saveSettings();
        }
      });
    });

    // Custom slippage input
    if (slippageInput) {
      slippageInput.addEventListener('change', () => {
        // Remove active from presets
        slippagePresets.forEach(b => b.classList.remove('active'));
        this.saveSettings();
      });
    }

    // Deadline input
    const deadlineInput = document.getElementById('deadlineInput');
    if (deadlineInput) {
      deadlineInput.addEventListener('change', () => {
        this.saveSettings();
      });
    }

    // Unlimited Approval
    const unlimitedApprovalCheck = document.getElementById('unlimitedApprovalCheck');
    if (unlimitedApprovalCheck) {
      unlimitedApprovalCheck.addEventListener('change', () => {
        this.saveSettings();
        
        if (unlimitedApprovalCheck.checked) {
          NetworkManager.showToast(
            '⚠️ Unlimited Approvals Enabled',
            'You will approve maximum amount. More convenient but less secure.',
            'warning'
          );
        } else {
          NetworkManager.showToast(
            '✅ Specific Approvals Enabled',
            'You will approve only the exact amount needed. More secure.',
            'success'
          );
        }
      });
    }

    // Expert mode
    const expertModeCheck = document.getElementById('expertModeCheck');
    if (expertModeCheck) {
      expertModeCheck.addEventListener('change', () => {
        this.saveSettings();
        
        if (expertModeCheck.checked) {
          NetworkManager.showToast(
            '⚠️ Expert Mode',
            'Confirmations are disabled',
            'warning'
          );
        }
      });
    }
  },

  // Setup token selector modal
  setupTokenSelector() {
    const tokenItems = document.querySelectorAll('.token-list-item');
    let selectingFor = 'from'; // 'from' or 'to'

    // Track which button opened the modal
    const fromBtn = document.getElementById('fromTokenBtn');
    const toBtn = document.getElementById('toTokenBtn');

    if (fromBtn) {
      fromBtn.addEventListener('click', () => {
        selectingFor = 'from';
      });
    }

    if (toBtn) {
      toBtn.addEventListener('click', () => {
        selectingFor = 'to';
      });
    }

    // Handle token selection
    tokenItems.forEach(item => {
      item.addEventListener('click', () => {
        const token = item.getAttribute('data-token');
        this.selectToken(token, selectingFor);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('tokenSelectModal'));
        if (modal) modal.hide();
      });
    });
  },

  // Select token
  selectToken(token, position) {
    const tokenSymbol = document.getElementById(`${position}TokenSymbol`);
    const tokenData = CONFIG.TOKENS[token];

    if (tokenSymbol) {
      tokenSymbol.textContent = tokenData.symbol;
    }

    // Update balance display
    if (WalletManager.isConnected) {
      WalletManager.updateBalanceDisplay();
    }

    // Clear amounts and quote
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';
    QuoteManager.clearQuote();

    console.log(`Token selected for ${position}:`, token);
  },

  // Save settings to localStorage
  saveSettings() {
    try {
      const slippage = document.getElementById('slippageInput')?.value || CONFIG.DEFAULT_SLIPPAGE;
      const deadline = document.getElementById('deadlineInput')?.value || CONFIG.DEFAULT_DEADLINE;
      const expertMode = document.getElementById('expertModeCheck')?.checked || false;
      const unlimitedApproval = document.getElementById('unlimitedApprovalCheck')?.checked || false;

      localStorage.setItem(CONFIG.STORAGE_KEYS.slippage, slippage);
      localStorage.setItem(CONFIG.STORAGE_KEYS.deadline, deadline);
      localStorage.setItem(CONFIG.STORAGE_KEYS.expertMode, expertMode);
      localStorage.setItem(CONFIG.STORAGE_KEYS.unlimitedApproval, unlimitedApproval);

      console.log('💾 Settings saved:', { slippage, deadline, expertMode, unlimitedApproval });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  // Load settings from localStorage
  loadSettings() {
    try {
      const slippage = localStorage.getItem(CONFIG.STORAGE_KEYS.slippage);
      const deadline = localStorage.getItem(CONFIG.STORAGE_KEYS.deadline);
      const expertMode = localStorage.getItem(CONFIG.STORAGE_KEYS.expertMode);
      const unlimitedApproval = localStorage.getItem(CONFIG.STORAGE_KEYS.unlimitedApproval);

      if (slippage) {
        const slippageInput = document.getElementById('slippageInput');
        if (slippageInput) slippageInput.value = slippage;

        // Update active preset
        const preset = document.querySelector(`.slippage-preset-btn[data-slippage="${slippage}"]`);
        if (preset) {
          document.querySelectorAll('.slippage-preset-btn').forEach(b => b.classList.remove('active'));
          preset.classList.add('active');
        }
      }

      if (deadline) {
        const deadlineInput = document.getElementById('deadlineInput');
        if (deadlineInput) deadlineInput.value = deadline;
      }

      if (expertMode !== null) {
        const expertModeCheck = document.getElementById('expertModeCheck');
        if (expertModeCheck) expertModeCheck.checked = expertMode === 'true';
      }

      if (unlimitedApproval !== null) {
        const unlimitedApprovalCheck = document.getElementById('unlimitedApprovalCheck');
        if (unlimitedApprovalCheck) unlimitedApprovalCheck.checked = unlimitedApproval === 'true';
      }

      console.log('📂 Settings loaded');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  // Show swapper deployment info
  showSwapperDeploymentInfo() {
    console.warn(`
╔════════════════════════════════════════════════════════════════╗
║                  ⚠️  SWAPPER CONTRACT NOT DEPLOYED              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  The AdrianSwapper contract needs to be deployed on Base       ║
║  Mainnet before the swap functionality can be used.            ║
║                                                                 ║
║  Contract code is available in the implementation document.    ║
║                                                                 ║
║  After deployment, update CONFIG.SWAPPER_ADDRESS in config.js  ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
    `);

    // Show in UI
    setTimeout(() => {
      NetworkManager.showToast(
        '⚠️ Contrato No Desplegado',
        'El contrato Swapper necesita ser desplegado en Base Mainnet',
        'warning'
      );
    }, 2000);
  },

  // Get current app state
  getState() {
    return {
      initialized: this.initialized,
      network: NetworkManager.getCurrentNetworkInfo(),
      wallet: {
        connected: WalletManager.isConnected,
        address: WalletManager.address,
        balances: WalletManager.balances
      },
      quote: QuoteManager.lastQuote,
      isSwapping: SwapManager.isSwapping
    };
  },

  // Debug info
  debug() {
    console.table(this.getState());
    console.log('Config:', CONFIG);
    console.log('Recent Transactions:', SwapManager.recentTransactions);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await App.init();

  // Make debug available in console
  window.App = App;
  window.debugSwap = () => App.debug();
  
  console.log('💡 Tip: Run debugSwap() in console for debug info');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Stop price updates when page is hidden
    QuoteManager.stopPriceUpdates();
  } else {
    // Resume price updates when page is visible
    if (WalletManager.isConnected) {
      WalletManager.updateBalances();
      QuoteManager.startPriceUpdates();
    }
  }
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.App = App;
}

