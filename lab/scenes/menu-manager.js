// Menu Manager - Gestor centralizado del menú y comandos
class MenuManager {
    constructor() {
        this.currentCommand = 'explore';
        this.currentScreen = null;
        this.walletConnected = false;
        this.walletAddress = null;
        this.isMuted = false;
        this.inventory = [];
        this.inventoryLoading = false;
    }

    initializeCommandSystem(screenId = null) {
        console.log(`Initializing command system for screen: ${screenId || 'default'}`);
        this.currentScreen = screenId;
        
        const commandButtons = document.querySelectorAll('.command-btn');
        commandButtons.forEach(button => {
            button.addEventListener('click', (event) => this.handleCommandClick(event));
        });
        
        // Set initial command
        this.selectCommand('explore');
    }

    handleCommandClick(event) {
        const command = event.target.textContent.toLowerCase();
        this.selectCommand(command);
    }

    selectCommand(command) {
        console.log(`Command selected: ${command}`);
        this.currentCommand = command;
        
        // Update button styles
        const commandButtons = document.querySelectorAll('.command-btn');
        commandButtons.forEach(button => {
            button.classList.remove('active');
            if (button.textContent.toLowerCase() === command) {
                button.classList.add('active');
            }
        });
    }

    getCurrentCommand() {
        return this.currentCommand;
    }

    updateWalletState(connected, address = null) {
        this.walletConnected = connected;
        this.walletAddress = address;
        this.updateWalletButtons();
        
        if (connected) {
            this.loadInventory();
        } else {
            this.clearInventory();
        }
    }

    updateWalletButtons() {
        const walletButtons = document.querySelectorAll('[id^="connect-wallet"]');
        walletButtons.forEach(button => {
            if (this.walletConnected) {
                button.textContent = this.walletAddress ? 
                    `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}` : 
                    'Connected';
                button.style.background = '#00ff00';
                button.style.color = '#000';
            } else {
                button.textContent = 'Connect Wallet';
                button.style.background = '';
                button.style.color = '';
            }
        });
    }

    updateMuteButtons() {
        const muteButtons = document.querySelectorAll('[id^="mute-button"]');
        muteButtons.forEach(button => {
            button.textContent = this.isMuted ? '🔇' : '🔊';
        });
    }

    async loadInventory() {
        if (!this.walletConnected || !this.walletAddress) {
            this.showNoItems();
            return;
        }

        this.showInventoryLoading();
        
        try {
            console.log(`Loading inventory for account: ${this.walletAddress}`);
            
            // Load ERC1155 tokens from AdrianPunks contract
            const contractAddress = '0x90546848474fb3c9fda3fdad887969bb244e7e58';
            console.log(`Loading ERC1155 tokens from contract: ${contractAddress}`);
            
            const url = `https://base-mainnet.g.alchemy.com/nft/v3/5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot/getNFTsForOwner?owner=${this.walletAddress}&contractAddresses[]=${contractAddress}&withMetadata=true&pageSize=50&tokenType=ERC1155`;
            console.log(`Requesting NFTs with URL: ${url}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('NFT data received:', data);
            
            if (data.ownedNfts && data.ownedNfts.length > 0) {
                // Filter and process tokens
                const tokens = data.ownedNfts.filter(nft => 
                    nft.contract.address.toLowerCase() === contractAddress.toLowerCase()
                );
                
                console.log('Filtered tokens:', tokens);
                
                // Convert to inventory format
                this.inventory = tokens.map(nft => ({
                    id: nft.tokenId,
                    name: nft.title || `AdrianPunk #${nft.tokenId}`,
                    image: nft.media?.[0]?.gateway || nft.media?.[0]?.raw || '',
                    balance: nft.balance || '1',
                    contract: nft.contract.address,
                    tokenType: nft.tokenType
                }));
                
                this.displayInventory();
            } else {
                this.showNoItems();
            }
            
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showNoItems();
        } finally {
            this.hideInventoryLoading();
        }
    }

    displayInventory() {
        console.log(`Displaying inventory items:`, this.inventory);
        
        // Update left inventory grid
        const leftGrid = document.getElementById(`inventory-grid-left-${this.currentScreen || 'main'}`);
        const rightGrid = document.getElementById(`inventory-grid-right-${this.currentScreen || 'main'}`);
        
        if (leftGrid) {
            leftGrid.innerHTML = '';
            
            if (this.inventory.length > 0) {
                this.inventory.forEach(item => {
                    const itemElement = this.createInventoryItemElement(item);
                    leftGrid.appendChild(itemElement);
                });
            } else {
                leftGrid.innerHTML = '<div class="no-items">No items found.</div>';
            }
        }
        
        if (rightGrid) {
            rightGrid.innerHTML = '<div class="no-items">No items found.</div>';
        }
    }

    createInventoryItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.onclick = () => this.selectInventoryItem(item);
        
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
            <div class="item-name">${item.name}</div>
            <div class="item-id">#${item.id}</div>
        `;
        
        return itemElement;
    }

    selectInventoryItem(item) {
        console.log('Selected inventory item:', item);
        // Remove previous selection
        document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
        // Add selection to clicked item
        event.target.closest('.inventory-item').classList.add('selected');
    }

    showNoItems() {
        const leftGrid = document.getElementById(`inventory-grid-left-${this.currentScreen || 'main'}`);
        const rightGrid = document.getElementById(`inventory-grid-right-${this.currentScreen || 'main'}`);
        
        if (leftGrid) leftGrid.innerHTML = '<div class="no-items">No items found.</div>';
        if (rightGrid) rightGrid.innerHTML = '<div class="no-items">No items found.</div>';
    }

    showInventoryLoading() {
        this.inventoryLoading = true;
        const leftGrid = document.getElementById(`inventory-grid-left-${this.currentScreen || 'main'}`);
        if (leftGrid) {
            leftGrid.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading...
                </div>
            `;
        }
    }

    hideInventoryLoading() {
        this.inventoryLoading = false;
    }

    clearInventory() {
        this.inventory = [];
        this.showNoItems();
    }

    setupSceneEventListeners(screenId) {
        console.log(`Setting up event listeners for screen: ${screenId}`);
        this.currentScreen = screenId;
        
        // Setup wallet connection
        const walletButton = document.getElementById(`connect-wallet-${screenId}`);
        if (walletButton) {
            walletButton.addEventListener('click', () => {
                if (typeof connectWallet === 'function') {
                    connectWallet();
                }
            });
        }
        
        // Setup mute button
        const muteButton = document.getElementById(`mute-button-${screenId}`);
        if (muteButton) {
            muteButton.addEventListener('click', () => {
                if (typeof toggleMute === 'function') {
                    toggleMute();
                }
            });
        }
        
        // Update wallet state
        this.updateWalletState(this.walletConnected, this.walletAddress);
        this.updateMuteButtons();
    }
}

// Instancia global del MenuManager
const menuManager = new MenuManager();

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuManager;
} 