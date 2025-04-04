/* components/menu.js */

let provider;
let signer;
let isConnected = false;

function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function ensureEthers(callback) {
  if (typeof ethers !== 'undefined') {
    callback();
  } else {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
    script.onload = callback;
    script.onerror = function () {
      console.error('Failed to load ethers.js');
      alert('Error: Failed to load ethers.js. Please reload the page.');
    };
    document.head.appendChild(script);
  }
}

async function connectWallet() {
  if (!isConnected) {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = provider.getSigner();
      const address = await signer.getAddress();
      
      // Actualizar ambas versiones del botón (mobile y desktop)
      updateWalletDisplay(address, true);
      isConnected = true;

      // Escuchar eventos de cambio de cuenta
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Error connecting wallet: " + error.message);
    }
  } else {
    // Desconectar wallet
    disconnectWallet();
  }
}

function disconnectWallet() {
  isConnected = false;
  provider = null;
  signer = null;
  updateWalletDisplay('', false);
  
  // Remover listener de eventos
  if (window.ethereum) {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Usuario desconectó manualmente desde MetaMask
    disconnectWallet();
  } else {
    // Actualizar con la nueva dirección
    updateWalletDisplay(accounts[0], true);
  }
}

function updateWalletDisplay(address, connected) {
  // Elementos Desktop
  const connectButton = document.getElementById('connectWalletButton');
  const walletInfo = document.getElementById('walletInfo');
  const walletAddress = walletInfo.querySelector('.wallet-address');

  // Elementos Mobile
  const connectButtonMobile = document.getElementById('connectWalletButtonMobile');
  const walletInfoMobile = document.getElementById('walletInfoMobile');
  const walletAddressMobile = walletInfoMobile.querySelector('.wallet-address');

  if (connected) {
    // Formatear la dirección
    const shortAddress = `${address.substring(0, 6)}...${address.substring(38)}`;
    
    // Actualizar Desktop
    connectButton.style.display = 'none';
    walletInfo.style.display = 'block';
    walletAddress.textContent = shortAddress;
    
    // Actualizar Mobile
    connectButtonMobile.style.display = 'none';
    walletInfoMobile.style.display = 'block';
    walletAddressMobile.textContent = shortAddress;
  } else {
    // Resetear Desktop
    connectButton.style.display = 'block';
    connectButton.innerHTML = '<span>Connect Wallet</span>';
    walletInfo.style.display = 'none';
    
    // Resetear Mobile
    connectButtonMobile.style.display = 'block';
    connectButtonMobile.innerHTML = '<span>Connect</span>';
    walletInfoMobile.style.display = 'none';
  }
}

// Verificar si ya hay una wallet conectada al cargar la página
window.addEventListener('load', async () => {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        signer = provider.getSigner();
        updateWalletDisplay(accounts[0], true);
        isConnected = true;
        // Escuchar eventos de cambio de cuenta
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  }
});

// Al hacer clic en el botón se alterna entre conectar y "desconectar"
document.getElementById('connectWalletButton').addEventListener('click', function () {
  if (isConnected) {
    disconnectWallet();
  } else {
    connectWallet();
  }
});