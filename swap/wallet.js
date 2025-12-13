// Wallet Management Module
// Handles wallet connection, balances, and user interactions

// Helper function to get the correct ethers instance (v6 for swap, v5 fallback)
function getEthers() {
  return window.swapEthers || window.ethers;
}

const WalletManager = {
  provider: null, // MetaMask provider (for transactions)
  readProvider: null, // Alchemy provider (for read calls)
  signer: null,
  address: null,
  isConnected: false,
  balances: {
    ETH: '0',
    ADRIAN: '0'
  },

  // Initialize wallet manager
  async init() {
    // Create read-only provider with Alchemy (same as market/)
    try {
      const ALCHEMY_API_KEY = window.ALCHEMY_API_KEY;
      if (ALCHEMY_API_KEY && ALCHEMY_API_KEY !== 'YOUR_ALCHEMY_API_KEY') {
        const ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
        const ethersLib = getEthers();
        this.readProvider = new ethersLib.JsonRpcProvider(ALCHEMY_RPC_URL);
        console.log('✅ Read provider initialized (Alchemy)');
      } else {
        console.warn('⚠️ Alchemy API key not configured. Will use MetaMask for reads.');
      }
    } catch (error) {
      console.error('Error creating read provider:', error);
    }

    // Check if wallet is already connected
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
          await this.connect(false); // Silent connect
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.address = accounts[0];
          this.updateUI();
          this.updateBalances();
        }
      });
    }

    this.setupEventListeners();
  },

  // Setup button event listeners
  setupEventListeners() {
    // Desktop connect button
    const connectBtn = document.getElementById('connectWalletButton');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connect());
    }

    // Mobile connect button
    const connectBtnMobile = document.getElementById('connectWalletButtonMobile');
    if (connectBtnMobile) {
      connectBtnMobile.addEventListener('click', () => this.connect());
    }
  },

  // Connect wallet
  async connect(showNotification = true) {
    // Check if wallet is installed
    if (!window.ethereum) {
      alert('Please install MetaMask or another compatible wallet to continue.');
      window.open('https://metamask.io/download/', '_blank');
      return false;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      this.address = accounts[0];
      
      // Create provider and signer
      const ethersLib = getEthers();
      this.provider = new ethersLib.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.isConnected = true;

      console.log('✅ Wallet connected:', this.address);

      // Ensure we're on Base Mainnet
      await NetworkManager.ensureCorrectNetwork();

      // Update UI and balances
      this.updateUI();
      await this.updateBalances();

      if (showNotification) {
        NetworkManager.showToast(
          'Wallet Connected',
          `Connected: ${this.formatAddress(this.address)}`,
          'success'
        );
      }

      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        NetworkManager.showToast(
          'Connection Cancelled',
          'You rejected the connection',
          'warning'
        );
      } else {
        NetworkManager.showToast(
          'Error',
          'Could not connect wallet',
          'error'
        );
      }
      
      return false;
    }
  },

  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.isConnected = false;
    this.balances = {
      ETH: '0',
      ADRIAN: '0'
    };

    this.updateUI();
    console.log('👋 Wallet disconnected');
  },

  // Update UI with wallet info
  updateUI() {
    const connectBtn = document.getElementById('connectWalletButton');
    const connectBtnMobile = document.getElementById('connectWalletButtonMobile');
    const swapBtn = document.getElementById('swapBtn');
    const swapBtnText = document.getElementById('swapBtnText');

    if (this.isConnected) {
      const formatted = this.formatAddress(this.address);
      
      if (connectBtn) connectBtn.textContent = formatted;
      if (connectBtnMobile) connectBtnMobile.textContent = formatted;
      
      if (swapBtn && NetworkManager.isCorrectNetwork) {
        swapBtn.disabled = true; // Will be enabled when amount is valid
        if (swapBtnText) swapBtnText.textContent = 'Enter amount';
      }
    } else {
      if (connectBtn) connectBtn.textContent = 'Connect Wallet';
      if (connectBtnMobile) connectBtnMobile.textContent = 'Connect';
      
      if (swapBtn) {
        swapBtn.disabled = true;
        if (swapBtnText) swapBtnText.textContent = 'Connect Wallet';
      }
    }
  },

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  },

  // Get ETH balance
  async getETHBalance() {
    if (!this.address) return '0';

    try {
      // Use read provider (Alchemy) for balance checks, fallback to MetaMask
      const provider = this.getReadProvider();
      if (!provider) return '0';
      
      const balance = await provider.getBalance(this.address);
      const ethersLib = getEthers();
      return ethersLib.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      return '0';
    }
  },

  // Get ADRIAN balance
  async getAdrianBalance() {
    if (!this.address) return '0';

    try {
      // Use read provider (Alchemy) for balance checks, fallback to MetaMask
      const provider = this.getReadProvider();
      if (!provider) return '0';
      
      const ethersLib = getEthers();
      const adrianContract = new ethersLib.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        provider
      );

      const balance = await adrianContract.balanceOf(this.address);
      return ethersLib.formatEther(balance);
    } catch (error) {
      console.error('Error getting ADRIAN balance:', error);
      return '0';
    }
  },

  // Update all balances
  async updateBalances() {
    if (!this.isConnected) return;

    try {
      const [ethBalance, adrianBalance] = await Promise.all([
        this.getETHBalance(),
        this.getAdrianBalance()
      ]);

      this.balances.ETH = ethBalance;
      this.balances.ADRIAN = adrianBalance;

      // Update UI
      this.updateBalanceDisplay();

      console.log('💰 Balances updated:', this.balances);

    } catch (error) {
      console.error('Error updating balances:', error);
    }
  },

  // Update balance display in UI
  updateBalanceDisplay() {
    const fromBalance = document.getElementById('fromBalance');
    const toBalance = document.getElementById('toBalance');
    const fromSymbol = document.getElementById('fromTokenSymbol').textContent;
    const toSymbol = document.getElementById('toTokenSymbol').textContent;

    if (fromBalance) {
      const balance = this.balances[fromSymbol] || '0';
      fromBalance.textContent = parseFloat(balance).toFixed(4);
    }

    if (toBalance) {
      const balance = this.balances[toSymbol] || '0';
      toBalance.textContent = parseFloat(balance).toFixed(4);
    }
  },

  // Get balance of specific token
  getBalance(symbol) {
    return this.balances[symbol] || '0';
  },

  // Check ADRIAN allowance for Swapper contract
  async checkAllowance() {
    if (!this.address) return '0';

    // Only check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return '0';
    }

    try {
      // Use read provider (Alchemy) for checking allowance, fallback to MetaMask
      const provider = this.getReadProvider();
      if (!provider) return '0';
      
      const ethersLib = getEthers();
      const adrianContract = new ethersLib.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        provider
      );

      const allowance = await adrianContract.allowance(
        this.address,
        CONFIG.SWAPPER_ADDRESS
      );

      return ethersLib.formatEther(allowance);

    } catch (error) {
      console.error('Error checking allowance:', error);
      return '0';
    }
  },

  // Approve ADRIAN for Swapper contract
  async approveAdrian(amount) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    // Check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      throw new Error('Swapper contract not deployed. Please deploy it first.');
    }

    try {
      const ethersLib = getEthers();
      const adrianContract = new ethersLib.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        this.signer
      );

      // Check user preference for unlimited approvals
      const unlimitedApproval = localStorage.getItem(CONFIG.STORAGE_KEYS.unlimitedApproval) === 'true';
      
      let approvalAmount;
      
      if (unlimitedApproval) {
        // Unlimited approval (MaxUint256)
        approvalAmount = ethersLib.MaxUint256;
        console.log('🔓 Approving ADRIAN: UNLIMITED (MaxUint256)');
      } else {
        // Specific amount approval
        if (amount) {
          approvalAmount = ethersLib.parseEther(amount.toString());
        } else {
          // Obtener del input actual
          const fromAmount = document.getElementById('fromAmount');
          if (!fromAmount || !fromAmount.value) {
            throw new Error('No amount specified');
          }
          approvalAmount = ethersLib.parseEther(fromAmount.value);
        }
        console.log('🔓 Approving ADRIAN:', ethersLib.formatEther(approvalAmount), '(specific amount)');
      }
      
      const tx = await adrianContract.approve(
        CONFIG.SWAPPER_ADDRESS,
        approvalAmount
      );

      NetworkManager.showToast(
        'Approval Sent',
        'Waiting for confirmation...',
        'info'
      );

      const receipt = await tx.wait();

      console.log('✅ ADRIAN approved:', receipt.hash);

      const approvalType = unlimitedApproval ? 'unlimited' : 'specific amount';
      NetworkManager.showToast(
        'Approved',
        `ADRIAN approved for swap (${approvalType})`,
        'success'
      );

      return receipt;

    } catch (error) {
      console.error('Error approving ADRIAN:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        NetworkManager.showToast(
          'Approval Cancelled',
          'You rejected the transaction',
          'warning'
        );
      } else {
        NetworkManager.showToast(
          'Error',
          'Could not approve ADRIAN',
          'error'
        );
      }
      
      throw error;
    }
  },

  // Get signer for transactions
  getSigner() {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return this.signer;
  },

  // Get read provider (Alchemy for quotes, fallback to MetaMask)
  getReadProvider() {
    return this.readProvider || this.provider;
  },

  // Check if wallet is ready for transactions
  isReady() {
    return this.isConnected && NetworkManager.isCorrectNetwork;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.WalletManager = WalletManager;
}

