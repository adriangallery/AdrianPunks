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
  ensureEthers(async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      if (!isConnected) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const address = await signer.getAddress();
        
        // Actualizar botones con la dirección truncada
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        document.getElementById('connectWalletButton').innerHTML = `Connected: ${shortAddress}`;
        document.getElementById('connectWalletButtonMobile').innerHTML = shortAddress;
        
        isConnected = true;
        
        // Escuchar cambios de cuenta
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      } else {
        // Desconectar
        disconnectWallet();
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Error connecting wallet: " + error.message);
    }
  });
}

function disconnectWallet() {
  isConnected = false;
  provider = null;
  signer = null;
  
  // Restaurar texto de los botones
  document.getElementById('connectWalletButton').innerHTML = "Connect Wallet";
  document.getElementById('connectWalletButtonMobile').innerHTML = "Connect";
  
  // Remover listener
  if (window.ethereum) {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Usuario desconectó desde MetaMask
    disconnectWallet();
  } else {
    // Actualizar con la nueva dirección
    const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
    document.getElementById('connectWalletButton').innerHTML = `Connected: ${shortAddress}`;
    document.getElementById('connectWalletButtonMobile').innerHTML = shortAddress;
  }
}

// Verificar conexión al cargar la página
window.addEventListener('load', () => {
  ensureEthers(async () => {
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          signer = provider.getSigner();
          const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
          document.getElementById('connectWalletButton').innerHTML = `Connected: ${shortAddress}`;
          document.getElementById('connectWalletButtonMobile').innerHTML = shortAddress;
          isConnected = true;
          
          // Escuchar cambios de cuenta
          window.ethereum.on('accountsChanged', handleAccountsChanged);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  });
});

// Agregar event listeners a ambos botones
document.addEventListener('DOMContentLoaded', () => {
  const desktopButton = document.getElementById('connectWalletButton');
  const mobileButton = document.getElementById('connectWalletButtonMobile');
  
  if (desktopButton) {
    desktopButton.addEventListener('click', connectWallet);
  }
  
  if (mobileButton) {
    mobileButton.addEventListener('click', connectWallet);
  }
});