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
let sceneManager; // Scene manager instance

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

// Variables para orientación del dispositivo
let landscapeModeEnabled = false;
let rotateDeviceMessage = null;

// Menu Manager - Sistema modular para manejar menús en todas las escenas
class MenuManager {
    constructor() {
        this.currentCommand = 'explore';
        this.commandButtons = {};
        this.currentAccount = null;
        this.inventoryItems = [];
        this.selectedInventoryItem = null;
        this.isWalletConnected = false;
        this.lastLoadedAccount = null; // ✅ NUEVA VARIABLE
        this.isLoadingInventory = false; // ✅ NUEVA VARIABLE
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
        
        // ✅ CAMBIO: Solo cargar inventario si realmente cambió el estado
        if (connected && address && address !== this.lastLoadedAccount) {
            this.lastLoadedAccount = address;
            this.loadInventory();
        } else if (!connected) {
            this.lastLoadedAccount = null;
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
        
        // ✅ Prevenir múltiples cargas simultáneas
        if (this.isLoadingInventory) {
            console.log('Inventory already loading, skipping...');
            return;
        }
        
        this.isLoadingInventory = true;
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
                        
                        // Filtrar para tokens 10000, 10001, 10002, 10003, 10004, 10005, y 262144
                        if (tokenIdInt !== 10000 && tokenIdInt !== 10001 && tokenIdInt !== 10002 && 
                            tokenIdInt !== 10003 && tokenIdInt !== 10004 && tokenIdInt !== 10005 && 
                            tokenIdInt !== 262144) {
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
            this.isLoadingInventory = false; // ✅ Limpiar flag
            this.hideInventoryLoading();
        }
    }

    // ✅ Método auxiliar para encontrar la escena activa
    getActiveScene() {
        // Prioridad 1: Escena con clase 'active'
        let activeScene = document.querySelector('.screen.active');
        
        // Prioridad 2: Escena con display block
        if (!activeScene) {
            activeScene = document.querySelector('.screen[style*="block"]');
        }
        
        // Prioridad 3: Escena que no tiene display none
        if (!activeScene) {
            const screens = document.querySelectorAll('.screen');
            for (const screen of screens) {
                const style = window.getComputedStyle(screen);
                if (style.display !== 'none') {
                    activeScene = screen;
                    break;
                }
            }
        }
        
        return activeScene;
    }

    // ✅ SOLUCIÓN: Buscar dentro de la escena activa, no globalmente
    displayInventory() {
        console.log('Displaying inventory items:', this.inventoryItems);
        
        // ✅ SOLUCIÓN: Buscar dentro de la escena activa, no globalmente
        const activeScene = this.getActiveScene();
        if (!activeScene) {
            console.warn('No active scene found for inventory display');
            return;
        }

        // Buscar grids de inventario dentro de la escena activa específicamente
        const leftGrid = activeScene.querySelector('#inventory-grid-left');
        const rightGrid = activeScene.querySelector('#inventory-grid-right');
        
        console.log('Active scene:', activeScene.id || 'unknown');
        console.log('Left grid found:', !!leftGrid);
        console.log('Right grid found:', !!rightGrid);
        
        if (leftGrid) {
            leftGrid.innerHTML = '';
            
            if (this.inventoryItems.length === 0) {
                leftGrid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
            } else {
                // Filtrar tokens para el grid izquierdo (floppy discs): 10000, 10001, 10002, 10003, 10004, 10005
                const floppyTokens = this.inventoryItems.filter(item => 
                    item.tokenId === 10000 || item.tokenId === 10001 || item.tokenId === 10002 ||
                    item.tokenId === 10003 || item.tokenId === 10004 || item.tokenId === 10005
                );
                
                if (floppyTokens.length === 0) {
                    leftGrid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
                } else {
                    floppyTokens.forEach(item => {
                        const itemElement = this.createInventoryItemElement(item);
                        leftGrid.appendChild(itemElement);
                        console.log('Added floppy disc to inventory:', item.title);
                    });
                }
            }
        } else {
            console.warn('Left grid not found in active scene');
        }
        
        if (rightGrid) {
            rightGrid.innerHTML = '';
            
            // Filtrar tokens para el grid derecho (todos los que no sean floppy discs)
            const itemTokens = this.inventoryItems.filter(item => 
                item.tokenId !== 10000 && item.tokenId !== 10001 && item.tokenId !== 10002 &&
                item.tokenId !== 10003 && item.tokenId !== 10004 && item.tokenId !== 10005
            );
            
            if (itemTokens.length === 0) {
                rightGrid.innerHTML = '<div class="no-items">No items found.</div>';
            } else {
                itemTokens.forEach(item => {
                    const itemElement = this.createInventoryItemElement(item);
                    rightGrid.appendChild(itemElement);
                    console.log('Added item to right grid:', item.title);
                });
            }
        }
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

    // ✅ ACTUALIZAR: Función showNoItems también debe usar escena activa
    showNoItems() {
        const activeScene = this.getActiveScene();
        if (!activeScene) return;
        
        const leftGrid = activeScene.querySelector('#inventory-grid-left');
        const rightGrid = activeScene.querySelector('#inventory-grid-right');
        
        if (leftGrid) {
            leftGrid.innerHTML = '<div class="no-items">No floppy discs found.</div>';
        }
        if (rightGrid) {
            rightGrid.innerHTML = '<div class="no-items">No items found.</div>';
        }
    }

    // ✅ ACTUALIZAR: Función showInventoryLoading también debe usar escena activa
    showInventoryLoading() {
        const activeScene = this.getActiveScene();
        if (!activeScene) return;
        
        const leftGrid = activeScene.querySelector('#inventory-grid-left');
        const loadingHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        
        if (leftGrid) {
            leftGrid.innerHTML = loadingHTML;
        }
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
        
        // Wait a moment for sceneManager to be available
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load all scenes
        if (typeof sceneManager !== 'undefined') {
            await sceneManager.loadScenes();
            console.log('Scene manager loaded successfully');
        } else {
            console.error('SceneManager not available after loading script');
        }
        
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
    
    // Initialize rotation message element
    rotateDeviceMessage = document.getElementById('rotate-device-message');
    
    // New inventory elements
    console.log('DOM elements initialized:', {
        introScreen: !!introScreen,
        mainScreen: !!mainScreen,
        clickArea: !!clickArea,
        rotateDeviceMessage: !!rotateDeviceMessage
    });
}

function detectMobile() {
    // Check if device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    console.log('Mobile device detected:', isMobile);
}

// Función para detectar orientación del dispositivo
function detectOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

// Función para forzar modo panorámico en móviles
function enableLandscapeMode() {
    if (!isMobile) return;
    
    console.log('Enabling landscape mode for mobile device');
    landscapeModeEnabled = true;
    
    // Agregar clase al body
    document.body.classList.add('landscape-mode');
    
    // Ocultar mensaje de rotación si está visible
    if (rotateDeviceMessage) {
        rotateDeviceMessage.classList.remove('show');
    }
    
    // Ajustar viewport para modo panorámico
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
}

// Función para deshabilitar modo panorámico
function disableLandscapeMode() {
    if (!isMobile) return;
    
    console.log('Disabling landscape mode');
    landscapeModeEnabled = false;
    
    // Remover clase del body
    document.body.classList.remove('landscape-mode');
    
    // Restaurar viewport normal
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
}

// Función para mostrar mensaje de rotación
function showRotateMessage() {
    if (!isMobile || landscapeModeEnabled) return;
    
    console.log('Showing rotate device message');
    if (rotateDeviceMessage) {
        rotateDeviceMessage.classList.add('show');
    }
}

// Función para ocultar mensaje de rotación
function hideRotateMessage() {
    if (rotateDeviceMessage) {
        rotateDeviceMessage.classList.remove('show');
    }
}

// Función para manejar cambios de orientación
function handleOrientationChange() {
    if (!isMobile) return;
    
    const orientation = detectOrientation();
    console.log(`Orientation changed to: ${orientation}`);
    
    if (orientation === 'landscape') {
        hideRotateMessage();
        if (landscapeModeEnabled) {
            enableLandscapeMode();
        }
    } else {
        if (landscapeModeEnabled) {
            showRotateMessage();
        }
    }
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
    
    // Navigation - Basic click handling for main screen
    clickArea.addEventListener('click', function(event) {
        // Get click coordinates relative to click area
        const rect = clickArea.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        console.log(`Click at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
        
        // Get current command
        const command = menuManager.getCurrentCommand();
        
        // Check for hotspots (basic implementation)
        const hotspots = [
            { name: 'Computer', x: 20, y: 30, width: 15, height: 20, action: 'use', message: '💻 You turn on the computer...' },
            { name: 'Desk', x: 50, y: 60, width: 20, height: 15, action: 'inspect', message: '🪑 A sturdy desk with some papers...' },
            { name: 'Door', x: 80, y: 40, width: 10, height: 30, action: 'use', message: '🚪 The door leads to upstairs...' }
        ];
        
        // Check if click is in any hotspot
        for (const hotspot of hotspots) {
            if (x >= hotspot.x && x <= hotspot.x + hotspot.width &&
                y >= hotspot.y && y <= hotspot.y + hotspot.height) {
                
                console.log(`Hotspot clicked: ${hotspot.name}`);
                
                // Handle different commands
                switch (command) {
                    case 'explore':
                        showFloatingText(hotspot.message, x, y);
                        break;
                    case 'use':
                        if (hotspot.name === 'Door') {
                            goToUpstairs();
                        } else {
                            showFloatingText(`💬 You use ${hotspot.name}`, x, y);
                        }
                        break;
                    case 'inspect':
                        showFloatingText(`🔍 You carefully examine ${hotspot.name}`, x, y);
                        break;
                    case 'take':
                        showFloatingText(`💬 You can't take ${hotspot.name}`, x, y);
                        break;
                    case 'test':
                        const message = `🔧 TEST MODE\nHotspot: ${hotspot.name}\nCoordinates: ${x.toFixed(1)}%, ${y.toFixed(1)}%\nAction: ${hotspot.action}\n\nClick anywhere to see coordinates!`;
                        showFloatingText(message, x, y);
                        break;
                    default:
                        showFloatingText(`💬 You interact with ${hotspot.name}`, x, y);
                }
                return;
            }
        }
        
        // No hotspot clicked - handle general click
        if (command === 'explore') {
            // No popup for explore mode
        } else if (command === 'test') {
            showFloatingText(`🔧 TEST MODE\nCoordinates: ${x.toFixed(1)}%, ${y.toFixed(1)}%\n\nClick anywhere to see coordinates!`, x, y);
        } else {
            showFloatingText(`💬 Nothing interesting here`, x, y);
        }
    });
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
    
    // Orientation change events for mobile
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
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
        
        // Enable landscape mode for mobile devices after intro
        if (isMobile) {
            console.log('Enabling landscape mode after intro for mobile device');
            enableLandscapeMode();
            
            // Check current orientation and show message if needed
            const orientation = detectOrientation();
            if (orientation === 'portrait') {
                showRotateMessage();
            }
        }
        
        // Load ethers.js when entering outside scene
        if (!ethersLoaded) {
            loadEthersWhenNeeded();
        }
        
        // Change to outside scene (first scene) - fallback to existing HTML structure
        if (sceneManager) {
            sceneManager.changeScene('outside');
        } else {
            console.log('Scene manager not loaded, using fallback to main-screen as outside');
            // Show main screen (basement) as fallback for outside
            mainScreen.style.display = 'block';
            mainScreen.style.opacity = '0';
            mainScreen.style.transition = 'opacity 2s ease-in-out';
            
            setTimeout(() => {
                mainScreen.classList.add('active');
                mainScreen.style.opacity = '1';
                
                // Setup event listeners for main screen
                menuManager.setupSceneEventListeners('main-screen');
                menuManager.initializeCommandSystem('main-screen');
            }, 100);
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
            <img src="upstairs.png" alt="Upstairs" id="upstairs-bg" style="width: 100%; height: 100%; object-fit: contain;">
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
    
    // Setup click area for upstairs - now handled by scene manager
    // if (upstairsClickArea) {
    //     upstairsClickArea.addEventListener('click', handleUpstairsClick);
    // }
    
    // Setup menu manager for upstairs screen
    menuManager.setupSceneEventListeners('upstairs-screen');
    menuManager.initializeCommandSystem('upstairs-screen');
}

function initializeUpstairsCommandSystem() {
    // This is now handled by the MenuManager
    console.log('Upstairs command system initialization handled by MenuManager');
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

// Show error message
function showError(message) {
    showNotification(message, 'error');
}

// Show success message
function showSuccess(message) {
    showNotification(message, 'success');
}

// Hide all messages
function hideMessages() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        if (notification.parentNode) {
            notification.remove();
        }
    });
}

// Disconnect wallet
function disconnectWallet() {
    currentAccount = null;
    inventoryItems = [];
    selectedInventoryItem = null;
    isWalletConnected = false;
    
    // Update UI
    if (connectWalletBtn) {
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.style.background = '#000';
        connectWalletBtn.style.color = '#00ff00';
    }
    
    // Update MenuManager
    if (menuManager) {
        menuManager.updateWalletState(false);
    }
    
    // Clear inventory display
    const inventoryGrid = document.querySelector('.inventory-grid');
    if (inventoryGrid) {
        inventoryGrid.innerHTML = '<div class="no-items">No items found. Connect wallet to load inventory.</div>';
    }
    
    hideMessages();
    showSuccess("Wallet disconnected successfully!");
}

// Check if wallet is connected
async function checkConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error("Failed to check connection:", error);
        }
    }
}

// Show loading indicator
function showLoading() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// Prevent right-click context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// Prevent zoom on mobile
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

// ===== POINT & CLICK AND INVENTORY SYSTEM =====

// Initialize point & click system

// Handle point & click interactions for hotspots only

// Handle hotspot clicks

// ===== COMMAND HANDLERS =====

// Handle USE command

// Handle INSPECT command

// Handle TAKE command

// Handle TALK command

// Handle MOVE command

// Handle OPEN command

// Handle TEST command (for development)

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
    
    // Find the active scene's background container
    let gameArea = null;
    
    // Check for active scene first
    const activeScene = document.querySelector('.screen.active .background-container');
    if (activeScene) {
        gameArea = activeScene;
    } else {
        // Fallback to any background container
        gameArea = document.querySelector('.background-container');
    }
    
    if (!gameArea) {
        console.error('No background container found for floating text');
        return;
    }
    
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
    
    // Remove after animation completes (reduced to 2 seconds)
    setTimeout(() => {
        if (floatingText.parentNode) {
            floatingText.remove();
        }
    }, 2000);
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
