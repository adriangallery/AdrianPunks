// BASE Network configuration
const BASE_CHAIN_ID = '0x2105'; // 8453 in decimal
const BASE_RPC_URL = 'https://mainnet.base.org';
const BASE_EXPLORER = 'https://basescan.org';

// Alchemy configuration for inventory
const ALCHEMY_API_KEY = "5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot";
const ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Contract addresses
const CONTRACTS = {
    ERC721: "0x6e369bf0e4e0c106192d606fb6d85836d684da75", // AdrianZERO
    ERC1155: "0x90546848474fb3c9fda3fdad887969bb244e7e58" // AdrianLAB
};

// Global variables
let provider;
let signer;
let isWalletConnected = false;
let isMuted = false;
let introTimer;
let musicInitialized = false;
let ethersLoaded = false;
let progressInterval;
let isMobile = false;

// Command system variables
let currentCommand = 'explore'; // Default command
let commandButtons = {};

// Inventory variables
let currentAccount = null;
let inventoryItems = [];
let selectedInventoryItem = null;
let gameState = {
    currentLocation: 'basement',
    discoveredItems: [],
    interactions: []
};

// DOM elements
let introScreen, mainScreen, floppyScreen, introImage, backgroundMusic, muteButton;
let connectWalletBtn, clickArea, mintPopup, closePopupBtn, buyFloppyBtn, backToMainBtn;
let progressFill, progressText;

// Menu Manager - Sistema modular para manejar menús en todas las escenas
class MenuManager {
    constructor() {
        this.currentCommand = 'explore';
        this.commandButtons = {};
        this.currentAccount = null;
        this.inventoryItems = [];
        this.selectedInventoryItem = null;
        this.isWalletConnected = false;
    }

    // Inicializar el sistema de comandos para cualquier escena
    initializeCommandSystem(screenId = null) {
        console.log(`Initializing command system for screen: ${screenId || 'all'}`);
        
        // Obtener botones de comando del contexto especificado
        const selector = screenId ? `#${screenId} .command-btn` : '.command-btn';
        const commandBtns = document.querySelectorAll(selector);
        
        commandBtns.forEach(btn => {
            const command = btn.textContent.toLowerCase();
            this.commandButtons[command] = btn;
            
            // Remover listeners existentes para evitar duplicados
            btn.removeEventListener('click', this.handleCommandClick);
            
            // Agregar nuevo listener
            btn.addEventListener('click', this.handleCommandClick.bind(this));
        });
        
        // Establecer comando por defecto
        this.selectCommand('explore');
    }

    // Manejar clicks en botones de comando
    handleCommandClick(event) {
        const command = event.target.textContent.toLowerCase();
        this.selectCommand(command);
    }

    // Seleccionar comando
    selectCommand(command) {
        console.log(`Command selected: ${command}`);
        
        // Remover clase active de todos los botones
        Object.values(this.commandButtons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Agregar clase active al botón seleccionado
        if (this.commandButtons[command]) {
            this.commandButtons[command].classList.add('active');
        }
        
        // Actualizar comando actual
        this.currentCommand = command;
        
        // Mostrar notificación
        showNotification(`Command: ${command.toUpperCase()}`, 'info');
    }

    // Obtener comando actual
    getCurrentCommand() {
        return this.currentCommand;
    }

    // Actualizar estado de wallet
    updateWalletState(connected, address = null) {
        this.isWalletConnected = connected;
        this.currentAccount = address;
        
        // Actualizar botones de wallet en todas las escenas
        this.updateWalletButtons();
        
        // Cargar inventario si está conectado
        if (connected && address) {
            this.loadInventory();
        } else {
            this.clearInventory();
        }
    }

    // Actualizar botones de wallet en todas las escenas
    updateWalletButtons() {
        const walletButtons = document.querySelectorAll('[id*="connect-wallet"]');
        const shortAddress = this.isWalletConnected && window.ethereum?.selectedAddress ? 
            window.ethereum.selectedAddress.slice(0, 6) + '...' + window.ethereum.selectedAddress.slice(-4) : 
            'Connect Wallet';

        walletButtons.forEach(btn => {
            if (this.isWalletConnected) {
                btn.textContent = shortAddress;
                btn.style.background = '#00ff00';
                btn.style.color = '#000';
            } else {
                btn.textContent = 'Connect Wallet';
                btn.style.background = '#000';
                btn.style.color = '#00ff00';
            }
        });
    }

    // Actualizar botones de mute en todas las escenas
    updateMuteButtons() {
        const muteButtons = document.querySelectorAll('[id*="mute-button"]');
        muteButtons.forEach(btn => {
            if (isMuted) {
                btn.textContent = isMobile ? 'Music OFF' : '🔇';
            } else {
                btn.textContent = isMobile ? 'Music ON' : '🔊';
            }
        });
    }

    // Cargar inventario
    async loadInventory() {
        if (!this.currentAccount) {
            console.log('No current account, skipping inventory load');
            return;
        }
        
        console.log('Loading inventory for account:', this.currentAccount);
        this.showInventoryLoading();
        
        try {
            const contractAddress = CONTRACTS.ERC1155;
            const tokenType = "ERC1155";
            
            console.log(`Loading ${tokenType} tokens from contract: ${contractAddress}`);
            
            // Usar Alchemy REST API directamente
            let alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${this.currentAccount}&contractAddresses[]=${contractAddress}&withMetadata=true&pageSize=50&tokenType=${tokenType}`;
            
            console.log(`Requesting NFTs with URL: ${alchemyUrl}`);
            
            const alchemyResponse = await fetch(alchemyUrl);
            
            if (!alchemyResponse.ok) {
                throw new Error(`Error getting NFTs from Alchemy API: ${alchemyResponse.status}`);
            }
            
            const nftsData = await alchemyResponse.json();
            console.log(`NFT data received:`, nftsData);
            
            // Procesar NFTs y filtrar para tokens 10000, 10001, y 10002
            if (nftsData.ownedNfts && nftsData.ownedNfts.length > 0) {
                const tokens = nftsData.ownedNfts.map(nft => {
                    try {
                        // Extraer tokenId
                        let tokenId;
                        if (nft.tokenId) {
                            tokenId = nft.tokenId;
                        } else if (nft.id && nft.id.tokenId) {
                            tokenId = nft.id.tokenId;
                        } else {
                            console.error("No tokenId found in NFT:", nft);
                            return null;
                        }
                        
                        // Convertir tokenId a entero
                        let tokenIdInt;
                        if (typeof tokenId === 'number') {
                            tokenIdInt = tokenId;
                        } else if (tokenId.startsWith('0x')) {
                            tokenIdInt = parseInt(tokenId, 16);
                        } else {
                            tokenIdInt = parseInt(tokenId, 10);
                        }
                        
                        if (isNaN(tokenIdInt)) {
                            console.error("Invalid tokenId format:", tokenId);
                            return null;
                        }
                        
                        // Filtrar para tokens 10000, 10001, y 10002 solo
                        if (tokenIdInt !== 10000 && tokenIdInt !== 10001 && tokenIdInt !== 10002) {
                            return null;
                        }
                        
                        // Extraer título/nombre
                        let title = `Token #${tokenIdInt}`;
                        
                        if (nft.title) {
                            title = nft.title;
                        } else if (nft.name) {
                            title = nft.name;
                        } else if (nft.metadata && nft.metadata.name) {
                            title = nft.metadata.name;
                        } else if (nft.contract && nft.contract.name) {
                            title = `${nft.contract.name} #${tokenIdInt}`;
                        }
                        
                        // Extraer URL de imagen
                        let mediaUrl = "";
                        
                        if (nft.raw && nft.raw.metadata && nft.raw.metadata.image) {
                            mediaUrl = nft.raw.metadata.image;
                        } else if (nft.media && Array.isArray(nft.media) && nft.media.length > 0) {
                            const mediaSources = ['gateway', 'raw', 'thumbnail', 'format'];
                            for (const source of mediaSources) {
                                if (nft.media[0][source] && typeof nft.media[0][source] === 'string') {
                                    mediaUrl = nft.media[0][source];
                                    break;
                                }
                            }
                        } else if (nft.metadata) {
                            const imageProps = ['image', 'image_url', 'imageUrl', 'imageURI', 'image_uri', 'imageData'];
                            for (const prop of imageProps) {
                                if (nft.metadata[prop] && typeof nft.metadata[prop] === 'string') {
                                    mediaUrl = nft.metadata[prop];
                                    break;
                                }
                            }
                        }
                        
                        // Limpiar URLs de IPFS
                        if (mediaUrl && mediaUrl.startsWith('ipfs://')) {
                            mediaUrl = mediaUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                        }
                        
                        return {
                            tokenId: tokenIdInt,
                            title: title,
                            imageUrl: mediaUrl,
                            contract: nft.contract.address,
                            contractName: nft.contract.name || 'Unknown Contract',
                            tokenType: tokenType,
                            metadata: nft.metadata || {}
                        };
                        
                    } catch (err) {
                        console.error("Error processing NFT:", err, nft);
                        return null;
                    }
                }).filter(token => token !== null);
                
                console.log(`Filtered tokens:`, tokens);
                this.inventoryItems = tokens;
                this.displayInventory();
                
            } else {
                this.showNoItems();
            }
            
        } catch (error) {
            console.error("Error loading inventory:", error);
            showNotification(`Error loading inventory: ${error.message}`, 'error');
        } finally {
            this.hideInventoryLoading();
        }
    }

    // Mostrar inventario
    displayInventory() {
        console.log('Displaying inventory items:', this.inventoryItems);
        
        // Obtener todos los grids de inventario en todas las escenas
        const inventoryGrids = document.querySelectorAll('[id*="inventory-grid"]');
        
        inventoryGrids.forEach(grid => {
            grid.innerHTML = "";
            
            if (this.inventoryItems.length === 0) {
                grid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
                return;
            }
            
            // Filtrar tokens para esta escena específica
            const inventoryTokens = this.inventoryItems.filter(item => 
                item.tokenId === 10000 || item.tokenId === 10001 || item.tokenId === 10002
            );
            
            if (inventoryTokens.length === 0) {
                grid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
            } else {
                inventoryTokens.forEach(item => {
                    const itemElement = this.createInventoryItemElement(item);
                    grid.appendChild(itemElement);
                });
            }
        });
    }

    // Crear elemento de inventario
    createInventoryItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        
        const imageUrl = item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
        
        itemElement.innerHTML = `
            <img src="${imageUrl}" alt="${item.title}" class="inventory-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+">
            <div class="item-name">${item.title}</div>
            <div class="item-id">ID: ${item.tokenId}</div>
        `;
        
        // Agregar evento click para selección de item
        itemElement.addEventListener('click', () => {
            this.selectInventoryItem(item);
        });
        
        return itemElement;
    }

    // Seleccionar item de inventario
    selectInventoryItem(item) {
        console.log('Selected inventory item:', item);
        this.selectedInventoryItem = item;
        showNotification(`Selected: ${item.title} (ID: ${item.tokenId})`, 'success');
        
        // Actualizar feedback visual para item seleccionado
        document.querySelectorAll('.inventory-item').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Resaltar item seleccionado
        event.target.closest('.inventory-item').classList.add('selected');
    }

    // Mostrar mensaje de no items
    showNoItems() {
        const inventoryGrids = document.querySelectorAll('[id*="inventory-grid"]');
        inventoryGrids.forEach(grid => {
            grid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
        });
    }

    // Mostrar/ocultar loading de inventario
    showInventoryLoading() {
        const inventoryGrids = document.querySelectorAll('[id*="inventory-grid"]');
        const loadingHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        
        inventoryGrids.forEach(grid => {
            grid.innerHTML = loadingHTML;
        });
    }

    hideInventoryLoading() {
        // El estado de loading se maneja por displayInventory o showNoItems
    }

    // Limpiar inventario
    clearInventory() {
        this.inventoryItems = [];
        this.selectedInventoryItem = null;
        this.showNoItems();
    }

    // Configurar event listeners para una escena específica
    setupSceneEventListeners(screenId) {
        console.log(`Setting up event listeners for screen: ${screenId}`);
        
        // Obtener elementos de la escena
        const screen = document.getElementById(screenId);
        if (!screen) return;
        
        // Botón de mute
        const muteButton = screen.querySelector('[id*="mute-button"]');
        if (muteButton) {
            muteButton.removeEventListener('click', toggleMute);
            muteButton.addEventListener('click', toggleMute);
        }
        
        // Botón de wallet
        const walletButton = screen.querySelector('[id*="connect-wallet"]');
        if (walletButton) {
            walletButton.removeEventListener('click', connectWallet);
            walletButton.addEventListener('click', connectWallet);
        }
        
        // Actualizar estado visual de botones
        this.updateWalletButtons();
        this.updateMuteButtons();
    }
}

// Instancia global del MenuManager
const menuManager = new MenuManager();

// Load scene manager and scenes
async function loadSceneManager() {
    try {
        console.log('Loading scene manager...');
        
        // Load scene manager script
        await loadScript('scenes/scene-manager.js');
        
        // Load all scenes
        await sceneManager.loadScenes();
        
        console.log('Scene manager loaded successfully');
        
    } catch (error) {
        console.error('Error loading scene manager:', error);
    }
}

// Helper function to load scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing indextest.js...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    detectMobile();
    initializeApp();
    setupEventListeners();
    
    // Load scene manager and scenes
    await loadSceneManager();
    
    startIntro();
});

function initializeDOMElements() {
    // Initialize all DOM elements
    introScreen = document.getElementById('intro-screen');
    mainScreen = document.getElementById('main-screen');
    floppyScreen = document.getElementById('floppy-screen');
    introImage = document.getElementById('intro-image');
    backgroundMusic = document.getElementById('background-music');
    muteButton = document.getElementById('mute-button');
    connectWalletBtn = document.getElementById('connect-wallet');
    clickArea = document.getElementById('click-area');
    mintPopup = document.getElementById('mint-popup');
    closePopupBtn = document.getElementById('close-popup');
    buyFloppyBtn = document.getElementById('buy-floppy');
    backToMainBtn = document.getElementById('back-to-main');
    progressFill = document.querySelector('.progress-fill');
    progressText = document.querySelector('.progress-text');
    
    // New inventory elements
    console.log('DOM elements initialized:', {
        introScreen: !!introScreen,
        mainScreen: !!mainScreen,
        clickArea: !!clickArea
    });
}

function detectMobile() {
    // Check if device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    console.log('Mobile device detected:', isMobile);
}

function initializeApp() {
    // Configure music
    backgroundMusic.volume = 0.3;
    
    // Multiple strategies to force music autoplay
    forceMusicAutoplay();
    
    // Don't initialize ethers here - will load when needed
    console.log('App initialized - ethers will load when needed');
}

function forceMusicAutoplay() {
    if (musicInitialized) return;
    
    console.log('Attempting to force music autoplay...');
    
    // Strategy 1: Immediate autoplay attempt
    try {
        backgroundMusic.load();
        backgroundMusic.play().then(() => {
            console.log('Music autoplay successful!');
            musicInitialized = true;
        }).catch(e => {
            console.log('Strategy 1 failed:', e.message);
            // Continue to next strategy
        });
    } catch (e) {
        console.log('Strategy 1 error:', e.message);
    }
    
    // Strategy 2: Delayed retry attempt
    setTimeout(() => {
        if (!musicInitialized) {
            console.log('Trying Strategy 2: Delayed autoplay...');
            backgroundMusic.play().catch(e => {
                console.log('Strategy 2 failed:', e.message);
            });
        }
    }, 500);
    
    // Strategy 3: User interaction simulation
    setTimeout(() => {
        if (!musicInitialized) {
            console.log('Trying Strategy 3: User interaction simulation...');
            // Simulate user interaction by dispatching events
            const events = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'];
            events.forEach(eventType => {
                document.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            // Try to play after simulated interaction
            setTimeout(() => {
                if (!musicInitialized) {
                    backgroundMusic.play().catch(e => {
                        console.log('Strategy 3 failed:', e.message);
                    });
                }
            }, 100);
        }
    }, 1000);
}

function setupEventListeners() {
    // Intro screen - use both click and touch events
    introScreen.addEventListener('click', handleIntroClick, true);
    introScreen.addEventListener('touchstart', handleIntroClick, true);
    
    // Music
    muteButton.addEventListener('click', toggleMute);
    
    // Wallet
    connectWalletBtn.addEventListener('click', connectWallet);
    
    // Navigation - Use the original handleBasementClick for basic functionality
    clickArea.addEventListener('click', handleBasementClick);
    closePopupBtn.addEventListener('click', closeMintPopup);
    buyFloppyBtn.addEventListener('click', handleBuyFloppy);
    backToMainBtn.addEventListener('click', goToMainScreen);
    
    // Initialize command system
    initializeCommandSystem();
    
    // MetaMask events
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    // Scene manager will handle scene-specific event listeners
    console.log('Event listeners setup complete');
}

// ===== COMMAND SYSTEM =====

// Initialize command system
function initializeCommandSystem() {
    console.log('Initializing command system...');
    menuManager.initializeCommandSystem();
}

// Select a command
function selectCommand(command) {
    menuManager.selectCommand(command);
}

// Get current command
function getCurrentCommand() {
    return menuManager.getCurrentCommand();
}

function startIntro() {
    // Reset progress bar
    progressFill.style.width = '0%';
    progressText.textContent = 'LOADING...';
    
    // Show progress bar
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    // Fade in intro image
    introImage.style.opacity = '0';
    introImage.style.transition = 'opacity 2s ease-in-out';
    
    // Start progress bar animation for fade in
    startProgressBar(0, 50, 2000, () => {
        // Progress bar complete for fade in
        console.log('Fade in progress complete - 50%');
        
        // Automatically continue to 100% after fade in
        startProgressBar(50, 100, 5000, () => {
            // Progress bar complete for fade out
            progressText.textContent = 'COMPLETE!';
            console.log('Fade out progress complete - 100%');
            
            // Hide progress bar after completion
            setTimeout(() => {
                const progressContainer = document.querySelector('.progress-container');
                if (progressContainer) {
                    progressContainer.style.display = 'none';
                    console.log('Progress bar hidden');
                }
            }, 500);
        });
        
        // Start transition to main screen
        goToMainScreenFromIntro();
    });
    
    setTimeout(() => {
        introImage.style.opacity = '1';
    }, 100);
}

function startProgressBar(startPercent, endPercent, duration, callback) {
    const startTime = Date.now();
    const startWidth = startPercent;
    const endWidth = endPercent;
    
    // Clear any existing interval
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    console.log(`Starting progress bar: ${startPercent}% to ${endPercent}% over ${duration}ms`);
    
    progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentWidth = startWidth + (endWidth - startWidth) * progress;
        progressFill.style.width = currentWidth + '%';
        
        console.log(`Progress: ${currentWidth.toFixed(1)}%`);
        
        if (progress >= 1) {
            clearInterval(progressInterval);
            if (callback) callback();
        }
    }, 50);
}

function handleIntroClick(event) {
    // Prevent multiple rapid clicks
    if (introTimer) return;
    
    introTimer = setTimeout(() => {
        introTimer = null;
    }, 1000);
    
    console.log('Intro clicked - skipping to main screen');
    
    // Clear progress bar interval if running
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Hide progress bar immediately
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
    
    goToMainScreenFromIntro();
}

function goToMainScreenFromIntro() {
    console.log('Starting transition to outside scene from intro');
    
    // Fade out intro (7 seconds - changed from 5)
    introScreen.style.opacity = '0';
    introScreen.style.transition = 'opacity 7s ease-in-out';
    
    setTimeout(() => {
        introScreen.classList.remove('active');
        introScreen.style.display = 'none';
        
        // Ensure progress bar is hidden when outside appears
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
            console.log('Progress bar hidden on outside transition');
        }
        
        // Load ethers.js when entering outside scene
        if (!ethersLoaded) {
            loadEthersWhenNeeded();
        }
        
        // Change to outside scene (first scene)
        if (sceneManager) {
            sceneManager.changeScene('outside');
        } else {
            console.error('Scene manager not loaded');
        }
    }, 7000);
}

function goToMainScreen() {
    console.log('Going to main screen (basement)');
    
    // Hide floppy screen if it's active
    if (floppyScreen.classList.contains('active')) {
        floppyScreen.classList.remove('active');
        floppyScreen.style.opacity = '0';
        floppyScreen.style.transition = 'opacity 2s ease-in-out';
        
        setTimeout(() => {
            floppyScreen.style.display = 'none';
        }, 2000);
    }
    
    // Change to basement scene (main scene)
    if (sceneManager) {
        sceneManager.changeScene('basement');
    } else {
        console.error('Scene manager not loaded');
    }
}

async function loadEthersWhenNeeded() {
    try {
        await window.loadEthers();
        ethersLoaded = true;
        console.log('Ethers.js loaded successfully');
        
        // Initialize MetaMask connection
        if (typeof window.ethereum !== 'undefined') {
            try {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                checkWalletConnection();
            } catch (error) {
                console.warn('Ethers.js initialization error:', error);
            }
        } else {
            showNotification('MetaMask is not installed', 'error');
        }
    } catch (error) {
        console.error('Failed to load ethers.js:', error);
        showNotification('Failed to load blockchain library', 'error');
    }
}

function goToFloppyScreen() {
    mainScreen.classList.remove('active');
    mainScreen.style.opacity = '0';
    mainScreen.style.transition = 'opacity 2s ease-in-out';
    
    setTimeout(() => {
        mainScreen.style.display = 'none';
        floppyScreen.style.display = 'block';
        floppyScreen.style.opacity = '0';
        floppyScreen.style.transition = 'opacity 2s ease-in-out';
        
        setTimeout(() => {
            floppyScreen.classList.add('active');
            floppyScreen.style.opacity = '1';
        }, 100);
    }, 2000);
}

function goToUpstairs() {
    console.log('Going to upstairs');
    
    // Change to upstairs scene using scene manager
    if (sceneManager) {
        sceneManager.changeScene('upstairs');
    } else {
        console.error('Scene manager not loaded');
    }
}

function createUpstairsScreen() {
    console.log('Creating upstairs screen');
    
    // Create upstairs screen element
    const upstairsScreen = document.createElement('div');
    upstairsScreen.id = 'upstairs-screen';
    upstairsScreen.className = 'screen';
    
    upstairsScreen.innerHTML = `
        <div class="background-container">
            <img src="upstairs.png" alt="Upstairs" id="upstairs-bg" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        
        <!-- Header with wallet -->
        <header class="retro-header">
            <div class="logo">AdrianLAB - Upstairs</div>
            <button id="connect-wallet-upstairs" class="retro-button">Connect Wallet</button>
            <button id="mute-button-upstairs" class="retro-button small">🔊</button>
        </header>

        <!-- Main clickable area -->
        <div id="click-area-upstairs" class="click-area">
            <div class="pixel-cursor"></div>
        </div>

        <!-- Overlay text for upstairs -->
        <div class="upstairs-overlay">
            <h1 class="retro-title">Upstairs</h1>
            <p class="retro-subtitle">Welcome to the fiat zone...</p>
        </div>

        <!-- Footer with Inventory -->
        <footer class="retro-footer">
            <div class="footer-sections">
                <!-- Left section: Commands -->
                <div class="footer-section commands-section">
                    <div class="section-header">Commands</div>
                    <div class="commands-grid">
                        <button class="command-btn">EXPLORE</button>
                        <button class="command-btn">INSPECT</button>
                        <button class="command-btn">USE</button>
                        <button class="command-btn">TAKE</button>
                        <button class="command-btn">TALK</button>
                        <button class="command-btn">MOVE</button>
                        <button class="command-btn">OPEN</button>
                        <button class="command-btn">TEST</button>
                    </div>
                </div>
                
                <!-- Middle section: Inventory Left -->
                <div class="footer-section inventory-section-left">
                    <div class="section-header">Inventory</div>
                    <div id="inventory-grid-left-upstairs" class="inventory-grid">
                        <div class="no-items">Connect wallet to load inventory.</div>
                    </div>
                </div>
                
                <!-- Right section: Inventory Right -->
                <div class="footer-section inventory-section-right">
                    <div class="section-header">Items</div>
                    <div id="inventory-grid-right-upstairs" class="inventory-grid">
                        <div class="no-items">No items found.</div>
                    </div>
                </div>
            </div>
        </footer>
    `;
    
    // Add to app container
    document.getElementById('app').appendChild(upstairsScreen);
    
    // Setup event listeners for upstairs
    setupUpstairsEventListeners();
    
    // Initialize command system for upstairs
    initializeUpstairsCommandSystem();
}

function setupUpstairsEventListeners() {
    console.log('Setting up upstairs event listeners');
    
    // Get upstairs elements
    const upstairsClickArea = document.getElementById('click-area-upstairs');
    
    // Setup click area for upstairs
    if (upstairsClickArea) {
        upstairsClickArea.addEventListener('click', handleUpstairsClick);
    }
    
    // Setup menu manager for upstairs screen
    menuManager.setupSceneEventListeners('upstairs-screen');
    menuManager.initializeCommandSystem('upstairs-screen');
}

function initializeUpstairsCommandSystem() {
    // This is now handled by the MenuManager
    console.log('Upstairs command system initialization handled by MenuManager');
}

function handleUpstairsClick(event) {
    console.log('Upstairs clicked');
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    console.log(`Upstairs click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    
    // Define upstairs hotspots
    const upstairsHotspots = [
        {
            name: 'Stairs Down',
            x: [0, 20],
            y: [70, 100],
            action: 'go_downstairs',
            message: "💬 Going back downstairs..."
        },
        {
            name: 'Fiat Zone',
            x: [40, 80],
            y: [30, 70],
            action: 'inspect_fiat',
            message: "💬 This is where the fiat money lives. It's very quiet here."
        }
    ];
    
    // Check if click is in any hotspot
    for (const hotspot of upstairsHotspots) {
        if (xPercent >= hotspot.x[0] && xPercent <= hotspot.x[1] &&
            yPercent >= hotspot.y[0] && yPercent <= hotspot.y[1]) {
            
            handleUpstairsHotspotClick(hotspot, xPercent, yPercent);
            return;
        }
    }
    
    // General area click - only show coordinates if explore command is active
    const currentCommand = getCurrentCommand();
    if (currentCommand === 'explore') {
        showNotification(`You clicked at ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    } else if (currentCommand === 'test') {
        showFloatingText(`🔧 TEST MODE\nCoordinates: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%\n\nClick anywhere to see coordinates!`, xPercent, yPercent);
    }
}

function handleUpstairsHotspotClick(hotspot, x, y) {
    console.log(`Upstairs hotspot clicked: ${hotspot.name} with command: ${getCurrentCommand()}`);
    
    const command = getCurrentCommand();
    
    switch (command) {
        case 'explore':
            if (hotspot.message) {
                showFloatingText(hotspot.message, x, y);
            }
            break;
            
        case 'use':
            if (hotspot.name === 'Stairs Down') {
                showFloatingText('💬 Going back downstairs...', x, y);
                setTimeout(() => {
                    goToMainScreen();
                }, 1000);
            } else {
                showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
            }
            break;
            
        case 'inspect':
            const inspectionMessages = {
                'Stairs Down': '💬 Wooden stairs leading back down to the basement. They look safer going down.',
                'Fiat Zone': '💬 A clean, well-lit area with expensive furniture. Everything here costs real money.'
            };
            const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
            showFloatingText(message, x, y);
            break;
            
        default:
            if (hotspot.message) {
                showFloatingText(hotspot.message, x, y);
            }
    }
}

function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        backgroundMusic.pause();
    } else {
        if (musicInitialized) {
            backgroundMusic.play().catch(e => console.log('Audio play failed'));
        }
    }
    
    // Update all mute buttons through menu manager
    menuManager.updateMuteButtons();
}

async function connectWallet() {
    if (!ethersLoaded) {
        showNotification('Loading blockchain library...', 'info');
        await loadEthersWhenNeeded();
    }
    
    if (!window.ethereum) {
        showNotification('MetaMask is not installed', 'error');
        return;
    }
    
    try {
        // Check if already connected first
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts.length > 0) {
            // Already connected
            await checkAndSwitchNetwork();
            isWalletConnected = true;
            updateWalletUI();
            showNotification('Wallet already connected', 'success');
            return;
        }
        
        // Request account connection
        const newAccounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (newAccounts.length > 0) {
            await checkAndSwitchNetwork();
            isWalletConnected = true;
            updateWalletUI();
            showNotification('Wallet connected successfully', 'success');
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        
        // Handle specific mobile MetaMask errors
        if (error.code === 4001) {
            showNotification('Connection rejected by user', 'warning');
        } else if (error.code === -32002) {
            showNotification('Please check MetaMask app', 'info');
        } else {
            showNotification('Error connecting wallet: ' + error.message, 'error');
        }
    }
}

async function checkAndSwitchNetwork() {
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (chainId !== BASE_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_CHAIN_ID }]
                });
                showNotification('Switched to Base network', 'success');
            } catch (switchError) {
                console.log('Switch error:', switchError);
                
                // If network doesn't exist, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: BASE_CHAIN_ID,
                                chainName: 'Base',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: [BASE_RPC_URL],
                                blockExplorerUrls: [BASE_EXPLORER]
                            }]
                        });
                        showNotification('Base network added successfully', 'success');
                    } catch (addError) {
                        console.error('Add network error:', addError);
                        showNotification('Error adding Base network. Please add it manually in MetaMask.', 'error');
                    }
                } else if (switchError.code === 4001) {
                    showNotification('Network switch rejected by user', 'warning');
                } else {
                    showNotification('Error switching to Base network. Please switch manually in MetaMask.', 'error');
                }
            }
        }
    } catch (error) {
        console.error('Network check error:', error);
        showNotification('Error checking network connection', 'error');
    }
}

function checkWalletConnection() {
    if (window.ethereum && window.ethereum.selectedAddress) {
        isWalletConnected = true;
        updateWalletUI();
    }
}

function updateWalletUI() {
    if (isWalletConnected) {
        // Notify iframe about wallet connection
        notifyIframeWalletConnected();
        
        // Update menu manager with wallet state
        menuManager.updateWalletState(true, window.ethereum.selectedAddress);
    } else {
        // Notify iframe about wallet disconnection
        notifyIframeWalletDisconnected();
        
        // Update menu manager with wallet state
        menuManager.updateWalletState(false);
    }
}

function notifyIframeWalletConnected() {
    const iframe = document.querySelector('#mint-popup iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage({
                type: 'WALLET_CONNECTED',
                address: window.ethereum.selectedAddress,
                chainId: window.ethereum.chainId
            }, '*');
        } catch (error) {
            console.log('Could not notify iframe:', error);
        }
    }
}

function notifyIframeWalletDisconnected() {
    const iframe = document.querySelector('#mint-popup iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage({
                type: 'WALLET_DISCONNECTED'
            }, '*');
        } catch (error) {
            console.log('Could not notify iframe:', error);
        }
    }
}

// Original handleBasementClick function - this is the key fix
function handleBasementClick(event) {
    console.log('Basement clicked - checking for point & click or mint popup');
    
    const rect = clickArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to percentage for responsive design
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    console.log(`Clicked at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    
    // Check if click is in center area (for mint popup) - only with USE command
    if (xPercent >= 40 && xPercent <= 60 && yPercent >= 40 && yPercent <= 60) {
        const currentCommand = getCurrentCommand();
        
        if (currentCommand === 'use') {
            console.log('Center area clicked with USE command - opening mint popup');
            if (!isWalletConnected) {
                showNotification('Connect your wallet first', 'warning');
                return;
            }
            
            mintPopup.classList.add('active');
            setTimeout(() => {
                notifyIframeWalletConnected();
            }, 100);
            return;
        } else if (currentCommand === 'explore') {
            console.log('Center area clicked with EXPLORE command - showing computer message');
            showFloatingText('💬 This is the computer. Use the USE command to access the mint interface.', xPercent, yPercent);
            return;
        }
    }
    
    // If not center area, check for hotspots
    handlePointAndClick(event);
}

function closeMintPopup() {
    mintPopup.classList.remove('active');
}

async function handleBuyFloppy() {
    if (!isWalletConnected) {
        showNotification('Connect your wallet first', 'warning');
        return;
    }
    
    try {
        if (!ethersLoaded) {
            await loadEthersWhenNeeded();
        }
        
        if (!window.ethers || !window.ethers.utils) {
            showNotification('Ethers.js not loaded properly', 'error');
            return;
        }
        
        const price = ethers.utils.parseEther('0.01');
        
        if (!signer) {
            signer = provider.getSigner();
        }
        
        const tx = await signer.sendTransaction({
            to: '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea', // Adrian Token address
            value: price
        });
        
        showNotification('Transaction sent: ' + tx.hash, 'success');
        
        // Wait for confirmation
        await tx.wait();
        showNotification('Floppy purchased successfully!', 'success');
        
    } catch (error) {
        console.error('Error buying floppy:', error);
        showNotification('Error in purchase', 'error');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        isWalletConnected = false;
        updateWalletUI();
        showNotification('Wallet disconnected', 'warning');
    } else {
        checkWalletConnection();
    }
}

function handleChainChanged(chainId) {
    if (chainId !== BASE_CHAIN_ID) {
        showNotification('Switch to Base network', 'warning');
    }
}

function showNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Mobile-friendly positioning
    const isMobile = window.innerWidth <= 768;
    const position = isMobile ? 'center' : 'bottom-right';
    
    notification.style.cssText = `
        position: fixed;
        ${position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 'bottom: 20px; right: 20px;'}
        background: #000;
        color: ${type === 'error' ? '#ff0000' : type === 'success' ? '#00ff00' : type === 'warning' ? '#ffff00' : '#00ff00'};
        border: 2px solid ${type === 'error' ? '#ff0000' : type === 'success' ? '#00ff00' : type === 'warning' ? '#ffff00' : '#00ff00'};
        padding: ${isMobile ? '1.5rem' : '1rem'};
        font-family: 'Press Start 2P', monospace;
        font-size: ${isMobile ? '0.7rem' : '0.6rem'};
        z-index: 10000;
        max-width: ${isMobile ? '90vw' : '300px'};
        min-width: ${isMobile ? '250px' : '200px'};
        word-wrap: break-word;
        box-shadow: 0 0 20px ${type === 'error' ? '#ff0000' : type === 'success' ? '#00ff00' : type === 'warning' ? '#ffff00' : '#00ff00'};
        text-align: center;
        border-radius: 8px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 1s ease-out';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 1000);
    }, 5000);
}

// Prevent right-click context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Prevent zoom on mobile
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

// ===== POINT & CLICK AND INVENTORY SYSTEM =====

// Initialize point & click system
function initializePointAndClick() {
    console.log('Initializing point & click system');
    // The click handling is now done in handleBasementClick
}

// Handle point & click interactions for hotspots only
function handlePointAndClick(event) {
    const rect = clickArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert to percentage for responsive design
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    console.log(`Point & click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    
    // Define clickable areas (hotspots) based on basement.png layout
    // Expanded margins from 15% to 20% for better clickability
    const hotspots = [
        {
            name: 'Desk Area',
            x: [35, 60],
            y: [75, 100],
            action: 'inspect_desk_area',
            message: "💬 You feel a sudden urge to write a thread on Twitter."
        },
        {
            name: 'Boxes Area',
            x: [66, 91],
            y: [60, 85],
            action: 'inspect_boxes',
            message: "💬 Boxes full of failed NFT projects... and one unopened Bored Ape piñata."
        },
        {
            name: 'Armchair Area',
            x: [75, 100],
            y: [74, 99],
            action: 'inspect_armchair',
            message: "💬 Sits like a throne. Probably where the DAO founder disappeared."
        },
        {
            name: 'Washing Machine Area',
            x: [58, 83],
            y: [59, 84],
            action: 'inspect_washing_machine',
            message: "💬 Perfect for laundering… socks. Only socks."
        },
        {
            name: 'Stairs Area',
            x: [0, 20],
            y: [29, 54],
            action: 'inspect_stairs',
            message: "💬 Do you really want to go upstairs? That's where the fiat lives."
        },
        {
            name: 'Computer Area',
            x: [13, 38],
            y: [39, 64],
            action: 'inspect_computer',
            message: "💬 Someone mined 6 BTC on this in 2010… then rage quit and sold at $12."
        },
        {
            name: 'Light Bulb Area',
            x: [38, 63],
            y: [0, 20],
            action: 'inspect_light_bulb',
            message: "💬 It's lit... unlike your portfolio."
        },
        {
            name: 'Windows Area',
            x: [41, 66],
            y: [27, 52],
            action: 'inspect_windows',
            message: "💬 Outside: darkness. Inside: DeFi."
        }
    ];
    
    // Check if click is in any hotspot
    for (const hotspot of hotspots) {
        if (xPercent >= hotspot.x[0] && xPercent <= hotspot.x[1] &&
            yPercent >= hotspot.y[0] && yPercent <= hotspot.y[1]) {
            
            handleHotspotClick(hotspot, xPercent, yPercent);
            return;
        }
    }
    
    // General area click - only show coordinates if explore command is active
    const currentCommand = getCurrentCommand();
    if (currentCommand === 'explore') {
        showNotification(`You clicked at ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
    } else if (currentCommand === 'test') {
        showFloatingText(`🔧 TEST MODE\nCoordinates: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%\n\nClick anywhere to see coordinates!`, xPercent, yPercent);
    }
}

// Handle hotspot clicks
function handleHotspotClick(hotspot, x, y) {
    console.log(`Hotspot clicked: ${hotspot.name} with command: ${getCurrentCommand()}`);
    
    const command = getCurrentCommand();
    
    // Handle different commands
    switch (command) {
        case 'explore':
            // Show the specific message for each hotspot as floating text
            if (hotspot.message) {
                showFloatingText(hotspot.message, x, y);
            } else {
                showFloatingText(`💬 You interact with ${hotspot.name}`, x, y);
            }
            break;
            
        case 'use':
            handleUseCommand(hotspot, x, y);
            break;
            
        case 'inspect':
            handleInspectCommand(hotspot, x, y);
            break;
            
        case 'take':
            handleTakeCommand(hotspot, x, y);
            break;
            
        case 'talk':
            handleTalkCommand(hotspot, x, y);
            break;
            
        case 'move':
            handleMoveCommand(hotspot, x, y);
            break;
            
        case 'open':
            handleOpenCommand(hotspot, x, y);
            break;
            
        case 'test':
            handleTestCommand(hotspot, x, y);
            break;
            
        default:
            // Default to explore behavior
            if (hotspot.message) {
                showFloatingText(hotspot.message, x, y);
            }
    }
    
    // Add to discovered items if not already found
    if (!gameState.discoveredItems.includes(hotspot.name)) {
        gameState.discoveredItems.push(hotspot.name);
    }
}

// ===== COMMAND HANDLERS =====

// Handle USE command
function handleUseCommand(hotspot, x, y) {
    console.log(`USE command on: ${hotspot.name}`);
    
    switch (hotspot.name) {
        case 'Computer Area':
            // Open mint popup (existing functionality)
            if (!isWalletConnected) {
                showNotification('Connect your wallet first', 'warning');
                return;
            }
            
            mintPopup.classList.add('active');
            setTimeout(() => {
                notifyIframeWalletConnected();
            }, 100);
            showFloatingText('💬 Opening mint interface...', x, y);
            break;
            
        case 'Stairs Area':
            // Navigate to upstairs (anywhere in stairs area with USE command)
            showFloatingText('💬 Going upstairs...', x, y);
            setTimeout(() => {
                goToUpstairs();
            }, 1000);
            break;
            
        default:
            showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
    }
}

// Handle INSPECT command
function handleInspectCommand(hotspot, x, y) {
    console.log(`INSPECT command on: ${hotspot.name}`);
    
    // Show detailed inspection message
    const inspectionMessages = {
        'Desk Area': '💬 A cluttered desk with papers, coffee stains, and a broken keyboard. The monitor shows a terminal with scrolling text.',
        'Boxes Area': '💬 Cardboard boxes stacked haphazardly. One is labeled "Failed Projects 2021" and another "Bored Ape Piñata - DO NOT OPEN".',
        'Armchair Area': '💬 A worn leather armchair with suspicious stains. There\'s a wallet on the seat with $12 in it.',
        'Washing Machine Area': '💬 An old washing machine with a "Socks Only" sign. The drum is spinning slowly.',
        'Stairs Area': '💬 Wooden stairs leading up. They creak ominously. The top 5% seems to be the trigger point.',
        'Computer Area': '💬 An ancient computer with a CRT monitor. The screen shows a terminal with "BTC: $12" and "Status: Rage Quit".',
        'Light Bulb Area': '💬 A single light bulb hanging from the ceiling. It flickers occasionally.',
        'Windows Area': '💬 Dirty windows showing the dark outside. You can see your reflection in the glass.'
    };
    
    const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
    showFloatingText(message, x, y);
}

// Handle TAKE command
function handleTakeCommand(hotspot, x, y) {
    console.log(`TAKE command on: ${hotspot.name}`);
    
    const takeableItems = {
        'Desk Area': '💬 You can\'t take the desk, but you find a USB drive with "Important Stuff" written on it.',
        'Boxes Area': '💬 The boxes are too heavy to carry, but you find a small key in one of them.',
        'Armchair Area': '💬 You can\'t take the armchair, but you find $12 in the wallet.',
        'Washing Machine Area': '💬 You can\'t take the washing machine, but you find a sock with a hole in it.',
        'Stairs Area': '💬 You can\'t take the stairs, but you find a loose nail.',
        'Computer Area': '💬 You can\'t take the computer, but you find a floppy disk.',
        'Light Bulb Area': '💬 You can\'t take the light bulb, but you find a dead fly.',
        'Windows Area': '💬 You can\'t take the windows, but you find a spider web.'
    };
    
    const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
    showFloatingText(message, x, y);
}

// Handle TALK command
function handleTalkCommand(hotspot, x, y) {
    console.log(`TALK command on: ${hotspot.name}`);
    
    const talkResponses = {
        'Desk Area': '💬 "Hello desk!" - No response. It\'s just a desk.',
        'Boxes Area': '💬 "Hello boxes!" - You hear a faint rustling sound.',
        'Armchair Area': '💬 "Hello chair!" - The chair remains silent.',
        'Washing Machine Area': '💬 "Hello washing machine!" - It continues spinning.',
        'Stairs Area': '💬 "Hello stairs!" - They creak in response.',
        'Computer Area': '💬 "Hello computer!" - The terminal beeps.',
        'Light Bulb Area': '💬 "Hello light bulb!" - It flickers.',
        'Windows Area': '💬 "Hello windows!" - Your echo bounces back.'
    };
    
    const message = talkResponses[hotspot.name] || `💬 You talk to ${hotspot.name} but get no response`;
    showFloatingText(message, x, y);
}

// Handle MOVE command
function handleMoveCommand(hotspot, x, y) {
    console.log(`MOVE command on: ${hotspot.name}`);
    
    const moveResponses = {
        'Desk Area': '💬 The desk is too heavy to move.',
        'Boxes Area': '💬 You try to move the boxes but they\'re stuck.',
        'Armchair Area': '💬 You move the armchair slightly. It makes a scraping sound.',
        'Washing Machine Area': '💬 The washing machine is bolted to the floor.',
        'Stairs Area': '💬 You can\'t move the stairs, but you can climb them.',
        'Computer Area': '💬 The computer is too heavy to move.',
        'Light Bulb Area': '💬 You can\'t move the light bulb, it\'s attached to the ceiling.',
        'Windows Area': '💬 You can\'t move the windows, they\'re part of the wall.'
    };
    
    const message = moveResponses[hotspot.name] || `💬 You can\'t move ${hotspot.name}`;
    showFloatingText(message, x, y);
}

// Handle OPEN command
function handleOpenCommand(hotspot, x, y) {
    console.log(`OPEN command on: ${hotspot.name}`);
    
    const openResponses = {
        'Desk Area': '💬 You open the desk drawer and find some old receipts.',
        'Boxes Area': '💬 You open one of the boxes and find failed NFT projects.',
        'Armchair Area': '💬 You can\'t open the armchair, it\'s not a container.',
        'Washing Machine Area': '💬 You open the washing machine door. It\'s full of socks.',
        'Stairs Area': '💬 You can\'t open the stairs, they\'re not a container.',
        'Computer Area': '💬 You open the computer case and find dust.',
        'Light Bulb Area': '💬 You can\'t open the light bulb, it\'s not a container.',
        'Windows Area': '💬 You try to open the windows but they\'re stuck.'
    };
    
    const message = openResponses[hotspot.name] || `💬 You can\'t open ${hotspot.name}`;
    showFloatingText(message, x, y);
}

// Handle TEST command (for development)
function handleTestCommand(hotspot, x, y) {
    console.log(`TEST command on: ${hotspot.name}`);
    
    // Show detailed coordinates and hotspot information for development
    const message = `🔧 TEST MODE\nHotspot: ${hotspot.name}\nCoordinates: ${x.toFixed(1)}%, ${y.toFixed(1)}%\nAction: ${hotspot.action || 'none'}\n\nClick anywhere to see coordinates!`;
    showFloatingText(message, x, y);
}

// Show floating text over the image
function showFloatingText(message, x, y) {
    // Remove any existing floating text
    const existingText = document.querySelector('.floating-text');
    if (existingText) {
        existingText.remove();
    }
    
    // Create new floating text element
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-text';
    floatingText.textContent = message;
    
    // Position the text near the click but ensure it's visible
    const gameArea = document.querySelector('.background-container');
    const rect = gameArea.getBoundingClientRect();
    
    // Convert percentage to pixels
    const xPos = (x / 100) * rect.width;
    const yPos = (y / 100) * rect.height;
    
    // Position text above the click point, but ensure it stays within bounds
    let left = xPos - 150; // Center the text
    let top = yPos - 80;   // Position above the click
    
    // Ensure text stays within the game area bounds
    if (left < 10) left = 10;
    if (left > rect.width - 310) left = rect.width - 310;
    if (top < 10) top = yPos + 20; // Show below if too close to top
    if (top > rect.height - 100) top = rect.height - 100;
    
    floatingText.style.left = left + 'px';
    floatingText.style.top = top + 'px';
    
    // Add to game area
    gameArea.appendChild(floatingText);
    
    // Remove after animation completes
    setTimeout(() => {
        if (floatingText.parentNode) {
            floatingText.remove();
        }
    }, 4000);
}

// Handle mouse movement for cursor feedback
function handleMouseMove(event) {
    const rect = clickArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    // Change cursor based on location (optional)
    // This could be used to show different cursors for different areas
}

// ===== INVENTORY SYSTEM =====

// Load inventory (ERC1155 tokens 10000 and 10001)
async function loadInventory() {
    await menuManager.loadInventory();
}

// Display inventory items
function displayInventory() {
    menuManager.displayInventory();
}

// Helper function to create inventory item element
function createInventoryItemElement(item) {
    return menuManager.createInventoryItemElement(item);
}

// Handle inventory item selection
function selectInventoryItem(item) {
    menuManager.selectInventoryItem(item);
}

// Show no items message
function showNoItems() {
    menuManager.showNoItems();
}

// Show/hide inventory loading
function showInventoryLoading() {
    menuManager.showInventoryLoading();
}

function hideInventoryLoading() {
    menuManager.hideInventoryLoading();
}

// Toggle inventory modal
function toggleInventory() {
    console.log('Toggling inventory modal');
    if (inventoryModal.style.display === 'none' || !inventoryModal.style.display) {
        inventoryModal.style.display = 'block';
        inventoryToggle.textContent = '❌ Close';
    } else {
        inventoryModal.style.display = 'none';
        inventoryToggle.textContent = '📦 Inventory';
    }
}

// Update wallet connection for inventory
function updateWalletForInventory() {
    console.log('Updating wallet for inventory, isWalletConnected:', isWalletConnected);
    if (isWalletConnected && window.ethereum.selectedAddress) {
        menuManager.updateWalletState(true, window.ethereum.selectedAddress);
    } else {
        menuManager.updateWalletState(false);
    }
}

// Initialize point & click system when main screen is shown
function initializePointAndClickSystem() {
    console.log('Initializing point & click system');
    initializePointAndClick();
    
    // Check if wallet is already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        console.log('Wallet already connected, updating inventory');
        menuManager.updateWalletState(true, window.ethereum.selectedAddress);
    }
} 