// components/menu.js

// Configuración del proveedor de Web3
let menuProvider, menuSigner, menuUserAccount;

async function connectWallet() {
    try {
        // Verificar si MetaMask está instalado
        if (typeof window.ethereum === 'undefined') {
            alert('Por favor instala MetaMask para usar esta aplicación');
            return;
        }

        // Solicitar conexión a MetaMask
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Configurar el proveedor y signer
        menuProvider = new ethers.providers.Web3Provider(window.ethereum);
        menuSigner = menuProvider.getSigner();
        menuUserAccount = await menuSigner.getAddress();

        // Actualizar UI
        document.getElementById('walletAddress').textContent = 
            menuUserAccount.slice(0, 6) + '...' + menuUserAccount.slice(-4);
        document.getElementById('connectWallet').style.display = 'none';
        document.getElementById('walletInfo').style.display = 'block';

        // Notificar a la página principal
        if (typeof window.onWalletConnected === 'function') {
            window.onWalletConnected();
        }

        // Escuchar cambios de cuenta
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

    } catch (error) {
        console.error('Error al conectar wallet:', error);
        alert('Error al conectar wallet: ' + error.message);
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Usuario desconectó su wallet
        disconnectWallet();
    } else {
        // Actualizar la cuenta activa
        menuUserAccount = accounts[0];
        document.getElementById('walletAddress').textContent = 
            menuUserAccount.slice(0, 6) + '...' + menuUserAccount.slice(-4);
        if (typeof window.onWalletConnected === 'function') {
            window.onWalletConnected();
        }
    }
}

function handleChainChanged() {
    // Recargar la página cuando cambie la red
    window.location.reload();
}

function disconnectWallet() {
    menuProvider = null;
    menuSigner = null;
    menuUserAccount = null;
    
    document.getElementById('connectWallet').style.display = 'block';
    document.getElementById('walletInfo').style.display = 'none';
    
    if (typeof window.onWalletDisconnected === 'function') {
        window.onWalletDisconnected();
    }
}

// Exportar variables globales
window.menuProvider = menuProvider;
window.menuSigner = menuSigner;
window.menuUserAccount = menuUserAccount;