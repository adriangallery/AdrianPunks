// Variables globales
if (typeof window.provider === 'undefined') window.provider = null;
if (typeof window.signer === 'undefined') window.signer = null;
if (typeof window.userAccount === 'undefined') window.userAccount = null;
if (typeof window.isConnected === 'undefined') window.isConnected = false;

async function connectWallet() {
  // Si ya hay una cuenta conectada, simula desconexión
  if (window.userAccount) {
    console.log("Desconectando la wallet...");
    window.userAccount = null;
    window.signer = null;
    window.provider = null;
    window.isConnected = false;
    
    // Actualizar el botón en desktop
    const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
    if (desktopConnectBtn) {
      desktopConnectBtn.innerHTML = "Connect Wallet";
      desktopConnectBtn.classList.remove('connected');
    }
    
    // Actualizar el botón en móvil
    const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
    if (mobileConnectBtn) {
      mobileConnectBtn.innerHTML = "Connect Wallet";
      mobileConnectBtn.classList.remove('connected');
    }
    
    // Resetear el balance
    const balanceElement = document.getElementById('tokenBalance');
    if (balanceElement) balanceElement.innerText = 'Balance: 0 $ADRIAN';
    
    // Emitir evento de desconexión
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
    
    // Recargar la página para limpiar el estado
    window.location.reload();
    return;
  }

  // Sino, conecta la wallet
  try {
    if (window.ethereum) {
      window.provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await window.provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        window.signer = window.provider.getSigner();
        window.userAccount = await window.signer.getAddress();
        window.isConnected = true;
        console.log("Cuenta conectada:", window.userAccount);
        
        const shortAddress = `${window.userAccount.slice(0, 6)}...${window.userAccount.slice(-4)}`;
        
        // Actualizar el botón en desktop
        const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
        if (desktopConnectBtn) {
          desktopConnectBtn.innerHTML = shortAddress;
          desktopConnectBtn.classList.add('connected');
        }
        
        // Actualizar el botón en móvil
        const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
        if (mobileConnectBtn) {
          mobileConnectBtn.innerHTML = shortAddress;
          mobileConnectBtn.classList.add('connected');
        }
        
        // Emitir evento de conexión
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { provider: window.provider, address: window.userAccount }
        }));
        
        // Actualizar el balance
        updateTokenBalance();

        // Escuchar cambios de cuenta
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      }
    } else {
      alert('Please install MetaMask to use this feature!');
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
    alert('Error connecting wallet: ' + error.message);
  }
}

async function disconnectWallet() {
  try {
    // Resetear el estado de los botones
    const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
    if (desktopConnectBtn) {
      desktopConnectBtn.innerHTML = 'Connect Wallet';
      desktopConnectBtn.classList.remove('connected');
      desktopConnectBtn.onclick = connectWallet;
    }
    
    const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
    if (mobileConnectBtn) {
      mobileConnectBtn.innerHTML = 'Connect Wallet';
      mobileConnectBtn.classList.remove('connected');
      mobileConnectBtn.onclick = connectWallet;
    }
    
    // Resetear el balance
    const balanceElement = document.getElementById('tokenBalance');
    if (balanceElement) balanceElement.innerText = 'Balance: 0 $ADRIAN';
    
    // Emitir evento de desconexión
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
    
    // Resetear el estado de la wallet
    window.userAccount = null;
    window.provider = null;
    window.signer = null;
    window.isConnected = false;
    
    // Recargar la página para limpiar el estado
    window.location.reload();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    alert('Error disconnecting wallet: ' + error.message);
  }
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // Usuario desconectó desde MetaMask
    disconnectWallet();
  } else {
    // Actualizar con la nueva dirección
    window.userAccount = accounts[0];
    const shortAddress = `${window.userAccount.slice(0, 6)}...${window.userAccount.slice(-4)}`;
    
    // Actualizar el botón en desktop
    const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
    if (desktopConnectBtn) {
      desktopConnectBtn.innerHTML = shortAddress;
      desktopConnectBtn.classList.add('connected');
    }
    
    // Actualizar el botón en móvil
    const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
    if (mobileConnectBtn) {
      mobileConnectBtn.innerHTML = shortAddress;
      mobileConnectBtn.classList.add('connected');
    }
    
    // Emitir evento de conexión con nueva cuenta
    window.dispatchEvent(new CustomEvent('walletConnected', {
      detail: { provider: window.provider, address: window.userAccount }
    }));
    
    // Actualizar el balance
    updateTokenBalance();
  }
}

// Agregar estilos para el botón conectado
const style = document.createElement('style');
style.textContent = `
  .connected {
    background-color: #28a745 !important;
    color: white !important;
  }
  .wallet-address {
    margin-right: 8px;
  }
  .disconnect-icon {
    font-size: 1.2em;
    cursor: pointer;
  }
  .connected:hover {
    background-color: #dc3545 !important;
  }
`;
document.head.appendChild(style);

// Al cargar la página, chequeamos si ya hay conexión y actualizamos el botón
document.addEventListener("DOMContentLoaded", async () => {
  if (window.ethereum) {
    window.provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await window.provider.listAccounts();
    if (accounts.length > 0) {
      window.userAccount = accounts[0];
      window.signer = window.provider.getSigner();
      window.isConnected = true;
      const shortAddress = `${window.userAccount.slice(0, 6)}...${window.userAccount.slice(-4)}`;
      
      // Actualizar el botón en desktop
      const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
      if (desktopConnectBtn) {
        desktopConnectBtn.innerHTML = shortAddress;
        desktopConnectBtn.classList.add('connected');
      }
      
      // Actualizar el botón en móvil
      const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
      if (mobileConnectBtn) {
        mobileConnectBtn.innerHTML = shortAddress;
        mobileConnectBtn.classList.add('connected');
      }
      
      // Emitir evento de conexión
      window.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { provider: window.provider, address: window.userAccount }
      }));
      
      // Actualizar el balance
      updateTokenBalance();
    }
  }
}); 