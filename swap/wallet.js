// Wallet Management Module
// Handles wallet connection, balances, and user interactions

const WalletManager = {
  provider: null,
  signer: null,
  address: null,
  isConnected: false,
  balances: {
    ETH: '0',
    ADRIAN: '0'
  },

  // Initialize wallet manager
  async init() {
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
      alert('Por favor, instala MetaMask u otra wallet compatible para continuar.');
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
      this.provider = new ethers.BrowserProvider(window.ethereum);
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
          'Wallet Conectada',
          `Conectado: ${this.formatAddress(this.address)}`,
          'success'
        );
      }

      return true;

    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        NetworkManager.showToast(
          'Conexión Cancelada',
          'Has rechazado la conexión',
          'warning'
        );
      } else {
        NetworkManager.showToast(
          'Error',
          'No se pudo conectar la wallet',
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
        if (swapBtnText) swapBtnText.textContent = 'Ingresa cantidad';
      }
    } else {
      if (connectBtn) connectBtn.textContent = 'Connect Wallet';
      if (connectBtnMobile) connectBtnMobile.textContent = 'Connect';
      
      if (swapBtn) {
        swapBtn.disabled = true;
        if (swapBtnText) swapBtnText.textContent = 'Conecta tu wallet';
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
    if (!this.provider || !this.address) return '0';

    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      return '0';
    }
  },

  // Get ADRIAN balance
  async getAdrianBalance() {
    if (!this.provider || !this.address) return '0';

    try {
      const adrianContract = new ethers.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        this.provider
      );

      const balance = await adrianContract.balanceOf(this.address);
      return ethers.formatEther(balance);
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
    if (!this.provider || !this.address) return '0';

    // Only check if swapper is deployed
    if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return '0';
    }

    try {
      const adrianContract = new ethers.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        this.provider
      );

      const allowance = await adrianContract.allowance(
        this.address,
        CONFIG.SWAPPER_ADDRESS
      );

      return ethers.formatEther(allowance);

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
      const adrianContract = new ethers.Contract(
        CONFIG.TOKENS.ADRIAN.address,
        ERC20_ABI,
        this.signer
      );

      // Approve max uint256 for convenience
      const maxApproval = ethers.MaxUint256;
      
      console.log('🔓 Approving ADRIAN...');
      
      const tx = await adrianContract.approve(
        CONFIG.SWAPPER_ADDRESS,
        maxApproval
      );

      NetworkManager.showToast(
        'Aprobación Enviada',
        'Esperando confirmación...',
        'info'
      );

      const receipt = await tx.wait();

      console.log('✅ ADRIAN approved:', receipt.hash);

      NetworkManager.showToast(
        'Aprobado',
        'ADRIAN aprobado para swap',
        'success'
      );

      return receipt;

    } catch (error) {
      console.error('Error approving ADRIAN:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        NetworkManager.showToast(
          'Aprobación Cancelada',
          'Has rechazado la transacción',
          'warning'
        );
      } else {
        NetworkManager.showToast(
          'Error',
          'No se pudo aprobar ADRIAN',
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

  // Check if wallet is ready for transactions
  isReady() {
    return this.isConnected && NetworkManager.isCorrectNetwork;
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.WalletManager = WalletManager;
}

