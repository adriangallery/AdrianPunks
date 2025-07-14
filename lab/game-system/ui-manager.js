// UI Manager - Handles all UI elements, menus, inventory, etc.
class UIManager {
    constructor() {
        this.elements = {};
        this.isInventoryVisible = false;
        this.currentAccount = null;
        this.inventoryItems = [];
    }

    // Initialize UI manager
    init() {
        console.log('Initializing UI Manager...');
        this.createUIElements();
        this.setupEventListeners();
        this.loadGameState();
    }

    // Create all UI elements
    createUIElements() {
        this.createGameContainer();
        this.createTopBar();
        this.createInventory();
        this.createMenu();
        this.createNotifications();
    }

    // Create main game container
    createGameContainer() {
        let gameContainer = document.querySelector('.game-container');
        if (!gameContainer) {
            gameContainer = document.createElement('div');
            gameContainer.className = 'game-container';
            document.body.appendChild(gameContainer);
        }
        this.elements.gameContainer = gameContainer;
    }

    // Create top bar with wallet connection and controls
    createTopBar() {
        const topBar = document.createElement('div');
        topBar.className = 'game-top-bar';
        
        topBar.innerHTML = `
            <div class="top-bar-left">
                <button id="connect-wallet" class="game-button">Connect Wallet</button>
                <span id="wallet-status" class="wallet-status">Not Connected</span>
            </div>
            <div class="top-bar-center">
                <h1 class="game-title">AdrianLAB - Retro Adventure</h1>
            </div>
            <div class="top-bar-right">
                <button id="mute-button" class="game-button">🔊</button>
                <button id="inventory-toggle" class="game-button">🎒</button>
                <button id="menu-toggle" class="game-button">☰</button>
            </div>
        `;
        
        document.body.appendChild(topBar);
        this.elements.topBar = topBar;
    }

    // Create inventory system
    createInventory() {
        const inventory = document.createElement('div');
        inventory.className = 'game-inventory';
        inventory.style.display = 'none';
        
        inventory.innerHTML = `
            <div class="inventory-header">
                <h3>Inventory</h3>
                <button id="close-inventory" class="close-button">×</button>
            </div>
            <div class="inventory-content">
                <div class="inventory-grid"></div>
                <div class="inventory-loading" style="display: none;">
                    <div class="spinner"></div>
                    <p>Loading inventory...</p>
                </div>
                <div class="inventory-empty" style="display: none;">
                    <p>No items found</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(inventory);
        this.elements.inventory = inventory;
    }

    // Create menu system
    createMenu() {
        const menu = document.createElement('div');
        menu.className = 'game-menu';
        menu.style.display = 'none';
        
        menu.innerHTML = `
            <div class="menu-content">
                <h3>Menu</h3>
                <div class="menu-items">
                    <button class="menu-item" data-action="save">💾 Save Game</button>
                    <button class="menu-item" data-action="load">📂 Load Game</button>
                    <button class="menu-item" data-action="settings">⚙️ Settings</button>
                    <button class="menu-item" data-action="help">❓ Help</button>
                    <button class="menu-item" data-action="about">ℹ️ About</button>
                </div>
                <button id="close-menu" class="close-button">×</button>
            </div>
        `;
        
        document.body.appendChild(menu);
        this.elements.menu = menu;
    }

    // Create notification system
    createNotifications() {
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        this.elements.notificationContainer = notificationContainer;
    }

    // Setup event listeners
    setupEventListeners() {
        // Wallet connection
        const connectWalletBtn = document.getElementById('connect-wallet');
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', () => this.connectWallet());
        }

        // Mute button
        const muteButton = document.getElementById('mute-button');
        if (muteButton) {
            muteButton.addEventListener('click', () => this.toggleMute());
        }

        // Inventory toggle
        const inventoryToggle = document.getElementById('inventory-toggle');
        if (inventoryToggle) {
            inventoryToggle.addEventListener('click', () => this.toggleInventory());
        }

        // Menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMenu());
        }

        // Close buttons
        const closeInventory = document.getElementById('close-inventory');
        if (closeInventory) {
            closeInventory.addEventListener('click', () => this.toggleInventory());
        }

        const closeMenu = document.getElementById('close-menu');
        if (closeMenu) {
            closeMenu.addEventListener('click', () => this.toggleMenu());
        }

        // Menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // MetaMask events
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => this.handleAccountsChanged(accounts));
            window.ethereum.on('chainChanged', (chainId) => this.handleChainChanged(chainId));
        }
    }

    // Connect wallet
    async connectWallet() {
        try {
            if (!window.ethereum) {
                this.showNotification('MetaMask is not installed!', 'error');
                return;
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.updateWalletUI();
                this.loadInventory();
                this.showNotification('Wallet connected!', 'success');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showNotification('Failed to connect wallet', 'error');
        }
    }

    // Update wallet UI
    updateWalletUI() {
        const walletStatus = document.getElementById('wallet-status');
        const connectWalletBtn = document.getElementById('connect-wallet');
        
        if (this.currentAccount) {
            const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
            walletStatus.textContent = shortAddress;
            connectWalletBtn.textContent = 'Connected';
            connectWalletBtn.disabled = true;
        } else {
            walletStatus.textContent = 'Not Connected';
            connectWalletBtn.textContent = 'Connect Wallet';
            connectWalletBtn.disabled = false;
        }
    }

    // Toggle mute
    toggleMute() {
        const muteButton = document.getElementById('mute-button');
        const isMuted = muteButton.textContent === '🔇';
        
        if (isMuted) {
            muteButton.textContent = '🔊';
            // Unmute logic
        } else {
            muteButton.textContent = '🔇';
            // Mute logic
        }
    }

    // Toggle inventory
    toggleInventory() {
        const inventory = this.elements.inventory;
        this.isInventoryVisible = !this.isInventoryVisible;
        
        if (this.isInventoryVisible) {
            inventory.style.display = 'block';
            this.loadInventory();
        } else {
            inventory.style.display = 'none';
        }
    }

    // Toggle menu
    toggleMenu() {
        const menu = this.elements.menu;
        const isVisible = menu.style.display === 'block';
        
        if (isVisible) {
            menu.style.display = 'none';
        } else {
            menu.style.display = 'block';
        }
    }

    // Handle menu actions
    handleMenuAction(action) {
        switch (action) {
            case 'save':
                this.saveGame();
                break;
            case 'load':
                this.loadGame();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'help':
                this.showHelp();
                break;
            case 'about':
                this.showAbout();
                break;
        }
    }

    // Load inventory
    async loadInventory() {
        if (!this.currentAccount) {
            this.showInventoryEmpty();
            return;
        }

        this.showInventoryLoading();
        
        try {
            // This would integrate with the existing inventory system
            // For now, just show empty
            setTimeout(() => {
                this.showInventoryEmpty();
            }, 1000);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showInventoryEmpty();
        }
    }

    // Show inventory loading
    showInventoryLoading() {
        const loading = this.elements.inventory.querySelector('.inventory-loading');
        const empty = this.elements.inventory.querySelector('.inventory-empty');
        const grid = this.elements.inventory.querySelector('.inventory-grid');
        
        loading.style.display = 'block';
        empty.style.display = 'none';
        grid.style.display = 'none';
    }

    // Show inventory empty
    showInventoryEmpty() {
        const loading = this.elements.inventory.querySelector('.inventory-loading');
        const empty = this.elements.inventory.querySelector('.inventory-empty');
        const grid = this.elements.inventory.querySelector('.inventory-grid');
        
        loading.style.display = 'none';
        empty.style.display = 'block';
        grid.style.display = 'none';
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        this.elements.notificationContainer.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Handle account changes
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.currentAccount = null;
            this.updateWalletUI();
            this.showNotification('Wallet disconnected', 'warning');
        } else {
            this.currentAccount = accounts[0];
            this.updateWalletUI();
            this.loadInventory();
        }
    }

    // Handle chain changes
    handleChainChanged(chainId) {
        console.log('Chain changed:', chainId);
        this.showNotification('Network changed', 'info');
    }

    // Save game
    saveGame() {
        gameEngine.saveGameState();
        this.showNotification('Game saved!', 'success');
    }

    // Load game
    loadGame() {
        gameEngine.loadGameState();
        this.showNotification('Game loaded!', 'success');
    }

    // Show settings
    showSettings() {
        this.showNotification('Settings not implemented yet', 'info');
    }

    // Show help
    showHelp() {
        this.showNotification('Help not implemented yet', 'info');
    }

    // Show about
    showAbout() {
        this.showNotification('AdrianLAB - Retro Adventure Game', 'info');
    }

    // Load game state
    loadGameState() {
        // Load any saved UI state
        const savedState = localStorage.getItem('adrianPunksUIState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.isInventoryVisible = state.isInventoryVisible || false;
            if (this.isInventoryVisible) {
                this.toggleInventory();
            }
        }
    }

    // Save UI state
    saveUIState() {
        const state = {
            isInventoryVisible: this.isInventoryVisible
        };
        localStorage.setItem('adrianPunksUIState', JSON.stringify(state));
    }
}

// Global UI manager instance
window.uiManager = new UIManager(); 