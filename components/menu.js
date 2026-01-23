/* components/menu.js */

(function() {
  // Wrap in IIFE to avoid global scope conflicts
  let menuProvider;
  let menuSigner;
  let menuIsConnected = false;

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
  console.log("connectWallet llamado");
  ensureEthers(async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      if (!menuIsConnected) {
        menuProvider = new ethers.providers.Web3Provider(window.ethereum);
        await menuProvider.send("eth_requestAccounts", []);
        menuSigner = menuProvider.getSigner();
        const address = await menuSigner.getAddress();
        
        // Actualizar botones con la dirección truncada
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const desktopButton = document.getElementById('connectWalletButton');
        const mobileButton = document.getElementById('connectWalletButtonMobile');
        
        if (desktopButton) desktopButton.innerHTML = `Connected: ${shortAddress}`;
        if (mobileButton) mobileButton.innerHTML = shortAddress;
        
        menuIsConnected = true;
        
        // Escuchar cambios de cuenta
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        
        // Disparar evento personalizado para notificar que la wallet está conectada
        const event = new CustomEvent('walletConnected', { detail: { address } });
        window.dispatchEvent(event);
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
  menuIsConnected = false;
  menuProvider = null;
  menuSigner = null;
  
  // Restaurar texto de los botones
  const desktopButton = document.getElementById('connectWalletButton');
  const mobileButton = document.getElementById('connectWalletButtonMobile');
  
  if (desktopButton) desktopButton.innerHTML = "Connect Wallet";
  if (mobileButton) mobileButton.innerHTML = "Connect";
  
  // Remover listener
  if (window.ethereum) {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  }
  
  // Disparar evento personalizado para notificar que la wallet está desconectada
  const event = new CustomEvent('walletDisconnected');
  window.dispatchEvent(event);
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Usuario desconectó desde MetaMask
    disconnectWallet();
  } else {
    // Actualizar con la nueva dirección
    const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
    const desktopButton = document.getElementById('connectWalletButton');
    const mobileButton = document.getElementById('connectWalletButtonMobile');
    
    if (desktopButton) desktopButton.innerHTML = `Connected: ${shortAddress}`;
    if (mobileButton) mobileButton.innerHTML = shortAddress;
  }
}

// Verificar conexión al cargar la página
window.addEventListener('load', () => {
  ensureEthers(async () => {
    if (window.ethereum) {
      // Use ethers v5 (backup) for menu
      const ethers5 = window.ethers5Backup || window.ethers;
      if (!ethers5 || !ethers5.providers) {
        console.warn('Ethers v5 not available for menu');
        return;
      }
      menuProvider = new ethers5.providers.Web3Provider(window.ethereum);
      try {
        const accounts = await menuProvider.listAccounts();
        if (accounts.length > 0) {
          menuSigner = menuProvider.getSigner();
          const shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
          const desktopButton = document.getElementById('connectWalletButton');
          const mobileButton = document.getElementById('connectWalletButtonMobile');
          
          if (desktopButton) desktopButton.innerHTML = `Connected: ${shortAddress}`;
          if (mobileButton) mobileButton.innerHTML = shortAddress;
          menuIsConnected = true;
          
          // Escuchar cambios de cuenta
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          
          // Disparar evento personalizado para notificar que la wallet está conectada
          const event = new CustomEvent('walletConnected', { detail: { address: accounts[0] } });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  });
});

// Función para añadir event listeners a los botones
function setupButtonListeners() {
  console.log("Configurando listeners de botones");
  const desktopButton = document.getElementById('connectWalletButton');
  const mobileButton = document.getElementById('connectWalletButtonMobile');
  
  if (desktopButton) {
    desktopButton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log("Botón desktop clickeado");
      connectWallet();
    });
  } else {
    console.log("Desktop button no encontrado");
  }
  
  if (mobileButton) {
    mobileButton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log("Botón mobile clickeado");
      connectWallet();
    });
  } else {
    console.log("Mobile button no encontrado");
  }
}

// Agregar event listeners a ambos botones cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', setupButtonListeners);

// Intentar añadir listeners periódicamente para asegurar que funcionan después de cargar dinámicamente
function checkAndSetupButtons() {
  if (document.getElementById('connectWalletButton') || document.getElementById('connectWalletButtonMobile')) {
    setupButtonListeners();
  }
}

// Verificar varias veces después de cargar la página
setTimeout(checkAndSetupButtons, 500);
setTimeout(checkAndSetupButtons, 1000);
setTimeout(checkAndSetupButtons, 2000);

// Observer para detectar cambios en el DOM que podrían incluir los botones
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes.length) {
      checkAndSetupButtons();
    }
  });
});

// Comenzar a observar el body para cambios en el DOM
observer.observe(document.body, { childList: true, subtree: true });

  // Función exportada para conectar la wallet desde fuera
  window.connectMetaMaskWallet = connectWallet;
})();
