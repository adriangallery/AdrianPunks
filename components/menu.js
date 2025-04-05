async function connectWallet() {
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        const account = accounts[0];
        const shortAddress = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        
        // Actualizar el botón en desktop
        const desktopConnectBtn = document.querySelector('.desktop-connect-btn');
        if (desktopConnectBtn) {
          desktopConnectBtn.innerHTML = `
            <span class="wallet-address">${shortAddress}</span>
            <span class="disconnect-icon">×</span>
          `;
          desktopConnectBtn.classList.add('connected');
          desktopConnectBtn.onclick = disconnectWallet;
        }
        
        // Actualizar el botón en móvil
        const mobileConnectBtn = document.querySelector('.mobile-connect-btn');
        if (mobileConnectBtn) {
          mobileConnectBtn.innerHTML = `
            <span class="wallet-address">${shortAddress}</span>
            <span class="disconnect-icon">×</span>
          `;
          mobileConnectBtn.classList.add('connected');
          mobileConnectBtn.onclick = disconnectWallet;
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