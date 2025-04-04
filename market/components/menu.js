/* components/menu.js */

let walletConnected = false;
let currentAccount = null;

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

function connectWallet() {
  ensureEthers(function () {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      provider.send('eth_requestAccounts', [])
        .then(() => {
          const signer = provider.getSigner();
          return signer.getAddress();
        })
        .then(account => {
          walletConnected = true;
          currentAccount = account;
          const btn = document.getElementById('connectWalletButton');
          // En móviles no se muestra el estado conectado
          if (!isMobile()) {
            btn.innerHTML = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
          } else {
            btn.innerHTML = "Connect Wallet";
          }
        })
        .catch(error => {
          console.error('Error connecting wallet:', error);
          alert('Error connecting wallet');
        });
    } else {
      alert('Please install MetaMask!');
    }
  });
}

function disconnectWallet() {
  // MetaMask no permite desconectar programáticamente, así que
  // simulamos la desconexión reseteando el estado y la UI.
  walletConnected = false;
  currentAccount = null;
  document.getElementById('connectWalletButton').innerHTML = "Connect Wallet";
}

window.addEventListener('load', () => {
  // Si es móvil, se agrega la clase para que el botón ocupe el ancho completo.
  if (isMobile()) {
    document.getElementById('connectWalletButton').classList.add('w-100');
  }

  ensureEthers(async function () {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          walletConnected = true;
          currentAccount = accounts[0];
          const btn = document.getElementById('connectWalletButton');
          if (!isMobile()) {
            btn.innerHTML = `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
          } else {
            btn.innerHTML = "Connect Wallet";
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  });
});

// Al hacer clic en el botón se alterna entre conectar y "desconectar"
document.getElementById('connectWalletButton').addEventListener('click', function () {
  if (walletConnected) {
    disconnectWallet();
  } else {
    connectWallet();
  }
});