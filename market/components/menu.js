/* components/menu.js */

function ensureEthers(callback) {
    if (typeof ethers !== 'undefined') {
        callback();
    } else {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js';
        script.onload = callback;
        script.onerror = function () {
            console.error('No se pudo cargar ethers.js');
            alert('Error: no se pudo cargar ethers.js. Por favor, recarga la página.');
        };
        document.head.appendChild(script);
    }
}

function connectWallet() {
    ensureEthers(function() {
        if (window.ethereum) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            provider.send('eth_requestAccounts', [])
                .then(() => {
                    const signer = provider.getSigner();
                    return signer.getAddress();
                })
                .then(account => {
                    document.getElementById('connectWalletButton').innerHTML = `Connected: ${account.slice(0,6)}...${account.slice(-4)}`;
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

// Verificar la conexión al cargar la página
window.addEventListener('load', () => {
    ensureEthers(async function() {
        if (window.ethereum) {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const accounts = await provider.listAccounts();
                if (accounts.length > 0) {
                    const btn = document.getElementById('connectWalletButton');
                    btn.innerHTML = `Connected: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}`;
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    });
});