// Network Management Module
// Handles network detection, switching, and validation for Base Mainnet

const NetworkManager = {
  currentChainId: null,
  isCorrectNetwork: false,

  // Initialize network manager
  async init() {
    if (!window.ethereum) {
      console.error('No wallet detected');
      return false;
    }

    // Get current network
    await this.updateCurrentNetwork();

    // Listen for network changes
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('Network changed to:', chainId);
      this.currentChainId = chainId;
      this.checkNetwork();
      window.location.reload(); // Reload on network change
    });

    return true;
  },

  // Update current network info
  async updateCurrentNetwork() {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      this.currentChainId = chainId;
      this.checkNetwork();
      return chainId;
    } catch (error) {
      console.error('Error getting network:', error);
      return null;
    }
  },

  // Check if we're on the correct network
  checkNetwork() {
    this.isCorrectNetwork = this.currentChainId === CONFIG.BASE_MAINNET.chainId;
    
    if (!this.isCorrectNetwork) {
      this.showNetworkWarning();
      this.disableSwapUI();
    } else {
      this.hideNetworkWarning();
      this.enableSwapUI();
    }

    return this.isCorrectNetwork;
  },

  // Show network warning banner
  showNetworkWarning() {
    const warning = document.getElementById('networkWarning');
    if (warning) {
      warning.style.display = 'block';
    }
  },

  // Hide network warning banner
  hideNetworkWarning() {
    const warning = document.getElementById('networkWarning');
    if (warning) {
      warning.style.display = 'none';
    }
  },

  // Disable swap UI when on wrong network
  disableSwapUI() {
    const swapBtn = document.getElementById('swapBtn');
    const approveBtn = document.getElementById('approveBtn');
    const fromAmount = document.getElementById('fromAmount');
    
    if (swapBtn) {
      swapBtn.disabled = true;
      swapBtn.querySelector('#swapBtnText').textContent = 'Red Incorrecta';
    }
    if (approveBtn) approveBtn.disabled = true;
    if (fromAmount) fromAmount.disabled = true;
  },

  // Enable swap UI when on correct network
  enableSwapUI() {
    const fromAmount = document.getElementById('fromAmount');
    if (fromAmount) fromAmount.disabled = false;
  },

  // Switch to Base Mainnet (EIP-3326)
  async switchToBase() {
    if (!window.ethereum) {
      throw new Error('No wallet detected');
    }

    try {
      // Try to switch to Base
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONFIG.BASE_MAINNET.chainId }]
      });

      console.log('✅ Switched to Base Mainnet');
      this.showToast('Red cambiada', 'Ahora estás en Base Mainnet', 'success');
      return true;

    } catch (switchError) {
      // Error 4902: The chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add Base to wallet (EIP-3085)
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CONFIG.BASE_MAINNET]
          });

          console.log('✅ Base Mainnet added and switched');
          this.showToast('Red añadida', 'Base Mainnet ha sido añadida a tu wallet', 'success');
          return true;

        } catch (addError) {
          console.error('Error adding Base:', addError);
          this.showToast('Error', 'No se pudo añadir Base Mainnet', 'error');
          return false;
        }
      }

      // User rejected the request
      if (switchError.code === 4001) {
        console.log('User rejected network switch');
        this.showToast('Cancelado', 'Cambio de red cancelado', 'warning');
        return false;
      }

      console.error('Error switching network:', switchError);
      this.showToast('Error', 'No se pudo cambiar de red', 'error');
      return false;
    }
  },

  // Ensure we're on Base before transaction
  async ensureCorrectNetwork() {
    await this.updateCurrentNetwork();
    
    if (!this.isCorrectNetwork) {
      const switched = await this.switchToBase();
      if (!switched) {
        throw new Error('Por favor, cambia manualmente a Base Mainnet');
      }
      // Wait a bit for network to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return true;
  },

  // Get network name
  getNetworkName(chainId) {
    const networks = {
      '0x1': 'Ethereum Mainnet',
      '0x5': 'Goerli Testnet',
      '0x89': 'Polygon',
      '0xa': 'Optimism',
      '0xa4b1': 'Arbitrum',
      '0x2105': 'Base Mainnet'
    };

    return networks[chainId] || `Unknown (${chainId})`;
  },

  // Show toast notification
  showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastBody = document.getElementById('toastBody');

    if (toast && toastTitle && toastBody) {
      toastTitle.textContent = title;
      toastBody.textContent = message;
      
      // Add color based on type
      toast.className = 'toast';
      if (type === 'success') toast.classList.add('bg-success', 'text-white');
      else if (type === 'error') toast.classList.add('bg-danger', 'text-white');
      else if (type === 'warning') toast.classList.add('bg-warning');

      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
    }
  },

  // Get current network info
  getCurrentNetworkInfo() {
    return {
      chainId: this.currentChainId,
      chainIdDecimal: parseInt(this.currentChainId, 16),
      networkName: this.getNetworkName(this.currentChainId),
      isCorrectNetwork: this.isCorrectNetwork
    };
  }
};

// Setup switch network button
document.addEventListener('DOMContentLoaded', () => {
  const switchBtn = document.getElementById('switchNetworkBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', async () => {
      await NetworkManager.switchToBase();
    });
  }
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
}

