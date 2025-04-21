async function connectWallet() {
  // Si ya hay una cuenta conectada, simula desconexión
  if (userAccount) {
    console.log("Desconectando la wallet...");
    userAccount = null;
    signer = null;
    provider = null;
    
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
    document.getElementById('tokenBalance').innerText = 'Balance: 0 $ADRIAN';
    
    // Recargar la página para limpiar el estado
    window.location.reload();
    return;
  }

  // Sino, conecta la wallet
  try {
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        signer = provider.getSigner();
        userAccount = await signer.getAddress();
        console.log("Cuenta conectada:", userAccount);
        
        const shortAddress = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
        
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
        
        // Actualizar el balance
        updateTokenBalance();
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
    document.getElementById('tokenBalance').innerText = 'Balance: 0 $ADRIAN';
    
    // Resetear el estado de la wallet
    userAccount = null;
    provider = null;
    signer = null;
    
    // Recargar la página para limpiar el estado
    window.location.reload();
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    alert('Error disconnecting wallet: ' + error.message);
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
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length > 0) {
      userAccount = accounts[0];
      signer = provider.getSigner();
      const shortAddress = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
      
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
      
      // Actualizar el balance
      updateTokenBalance();
    }
  }
}); 