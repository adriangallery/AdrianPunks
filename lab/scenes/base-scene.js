// Base Scene Class - Clase base para todas las escenas

// CSS Styles for command buttons and inventory
const baseSceneStyles = `
<style>
/* Command buttons grid layout */
.commands-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    flex: 1;
    min-height: 0;
}

/* Command button styling */
.command-btn {
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #00ff00;
    color: #00ff00;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'VT323', monospace;
    font-size: 0.7rem;
    transition: all 0.3s ease;
    text-align: center;
}

.command-btn:hover {
    background: rgba(0, 255, 0, 0.2);
    transform: translateY(-1px);
}

.command-btn:active {
    transform: translateY(0);
}

.command-btn.active {
    background: rgba(0, 255, 0, 0.3);
    border: 2px solid #ffff00;
    color: #ffff00;
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(255, 255, 0, 0.5);
}

/* Commands section styling */
.commands-section {
    flex: 1;
}

/* Inventory grid layout - Responsive */
.inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 4px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 4px;
    align-items: start;
}

/* Scene background image - Responsive */
.background-container {
    position: absolute;
    top: 60px;        /* Altura del header */
    bottom: 232px;    /* Altura del footer: 200px + 32px padding */
    left: 0;
    right: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.background-container img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

/* Inventory item styling */
.inventory-item {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid #00ff00;
    border-radius: 6px;
    padding: 6px 4px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    height: 65px;
    box-sizing: border-box;
    overflow: hidden;
}

.inventory-item:hover {
    background: rgba(0, 255, 0, 0.2);
    transform: scale(1.05);
}

.inventory-item.selected {
    border: 2px solid #ffff00;
}

.inventory-item img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    margin-bottom: 3px;
    border-radius: 2px;
    flex-shrink: 0;
}

.inventory-item .item-name {
    color: #00ff00;
    font-size: 0.5rem;
    font-weight: bold;
    line-height: 1.1;
    margin-bottom: 2px;
    font-family: 'VT323', monospace;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    width: 100%;
}

.inventory-item .item-id {
    color: #888;
    font-size: 0.4rem;
    line-height: 1;
    font-family: 'VT323', monospace;
    flex-shrink: 0;
    width: 100%;
}

.no-items {
    color: #888;
    text-align: center;
    font-style: italic;
    padding: 10px;
    font-family: 'VT323', monospace;
    font-size: 0.6rem;
    grid-column: 1 / -1;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
    .background-container {
        top: 50px;        /* Header más pequeño en móvil */
        bottom: 166px;    /* Footer: 150px + 16px padding */
    }
    
    .commands-grid {
        gap: 2px;
    }
    
    .command-btn {
        padding: 4px 6px;
        font-size: 0.5rem;
    }
    
    .inventory-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;
        padding: 2px;
    }
    
    .inventory-item {
        height: 40px;
        padding: 3px 2px;
    }
    
    .inventory-item img {
        width: 20px;
        height: 20px;
        margin-bottom: 2px;
    }
    
    .inventory-item .item-name {
        font-size: 0.35rem;
        margin-bottom: 1px;
    }
    
    .inventory-item .item-id {
        font-size: 0.25rem;
    }
    
    .no-items {
        font-size: 0.5rem;
        padding: 5px;
    }
}

/* Desktop responsive adjustments */
@media (min-width: 769px) {
    .background-container {
        top: 60px;        /* Header estándar en desktop */
        bottom: 232px;    /* Footer: 200px + 32px padding */
    }
    
    .inventory-grid {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 6px;
        padding: 6px;
    }
    
    .inventory-item {
        height: 70px;
        padding: 8px 4px;
    }
    
    .inventory-item img {
        width: 32px;
        height: 32px;
        margin-bottom: 4px;
    }
    
    .inventory-item .item-name {
        font-size: 0.55rem;
        margin-bottom: 3px;
    }
    
    .inventory-item .item-id {
        font-size: 0.45rem;
    }
}

/* Extra small mobile adjustments */
@media (max-width: 480px) {
    .background-container {
        top: 40px;        /* Header muy pequeño */
        bottom: 136px;    /* Footer: 120px + 16px padding */
    }
}
</style>
`;

// Inject styles into document head
if (!document.querySelector('#base-scene-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'base-scene-styles';
    styleElement.innerHTML = baseSceneStyles;
    document.head.appendChild(styleElement);
}

class BaseScene {
    constructor(sceneId, sceneName) {
        this.sceneId = sceneId;
        this.sceneName = sceneName;
        this.hotspots = [];
        this.imagePath = '';
        this.overlayText = {
            title: '',
            subtitle: ''
        };
    }

    // Inicializar la escena
    initialize() {
        console.log(`Initializing scene: ${this.sceneName}`);
        this.setupHotspots();
        this.setupEventListeners();
    }

    // Configurar hotspots (debe ser implementado por cada escena)
    setupHotspots() {
        throw new Error('setupHotspots must be implemented by subclass');
    }

    // Configurar event listeners (debe ser implementado por cada escena)
    setupEventListeners() {
        throw new Error('setupEventListeners must be implemented by subclass');
    }

    // Manejar click en la escena - Solución limpia y responsiva
    handleClick(event) {
        // Obtener la imagen directamente
        const backgroundImage = document.querySelector(`#${this.sceneId}-bg`);
        if (!backgroundImage) {
            console.error('Background image not found');
            return;
        }
        
        // Obtener las dimensiones reales de la imagen
        const imageRect = backgroundImage.getBoundingClientRect();
        
        // Calcular coordenadas relativas a la imagen
        const x = event.clientX - imageRect.left;
        const y = event.clientY - imageRect.top;
        
        // Convertir a porcentajes relativos a la imagen
        const xPercent = (x / imageRect.width) * 100;
        const yPercent = (y / imageRect.height) * 100;
        
        // Verificar que el click esté dentro de los límites de la imagen
        if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) {
            console.log(`Click outside image bounds: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
            return;
        }
        
        console.log(`${this.sceneName} click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
        
        // Verificar si el click está en algún hotspot
        const hotspot = this.getHotspotAt(xPercent, yPercent);
        
        if (hotspot) {
            this.handleHotspotClick(hotspot, xPercent, yPercent);
        } else {
            this.handleGeneralClick(xPercent, yPercent);
        }
    }

    // Obtener hotspot en las coordenadas especificadas - Solución limpia
    getHotspotAt(x, y) {
        // Búsqueda directa sin conversiones - las coordenadas ya son porcentajes de la imagen
        return this.hotspots.find(hotspot => 
            x >= hotspot.x[0] && x <= hotspot.x[1] &&
            y >= hotspot.y[0] && y <= hotspot.y[1]
        );
    }

    // Manejar click en hotspot
    handleHotspotClick(hotspot, x, y) {
        console.log(`Hotspot clicked: ${hotspot.name} with command: ${getCurrentCommand()}`);
        
        const command = getCurrentCommand();
        
        switch (command) {
            case 'explore':
                this.handleExploreCommand(hotspot, x, y);
                break;
            case 'use':
                this.handleUseCommand(hotspot, x, y);
                break;
            case 'take':
                this.handleTakeCommand(hotspot, x, y);
                break;
            case 'close':
                this.handleCloseCommand(hotspot, x, y);
                break;
            case 'open':
                this.handleOpenCommand(hotspot, x, y);
                break;
            default:
                this.handleExploreCommand(hotspot, x, y);
        }
    }

    // Manejar click general (fuera de hotspots)
    handleGeneralClick(x, y) {
        const command = getCurrentCommand();
        
        // if (command === 'explore') {
            // showNotification(`You clicked at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
        if (command === 'close') {
            showFloatingText(`💬 Nothing to close here`, x, y);
        }
    }

    // Comandos base (pueden ser sobrescritos por escenas específicas)
    handleExploreCommand(hotspot, x, y) {
        if (hotspot.message) {
            showFloatingText(hotspot.message, x, y);
        } else {
            showFloatingText(`💬 You interact with ${hotspot.name}`, x, y);
        }
    }

    handleUseCommand(hotspot, x, y) {
        showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        showFloatingText(`💬 You can't take ${hotspot.name}`, x, y);
    }

    handleCloseCommand(hotspot, x, y) {
        showFloatingText(`💬 You can't close ${hotspot.name}`, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        showFloatingText(`💬 You can't open ${hotspot.name}`, x, y);
    }

    // Crear elemento HTML de la escena
    createSceneElement() {
        const sceneElement = document.createElement('div');
        sceneElement.id = this.sceneId;
        sceneElement.className = 'screen';
        
        sceneElement.innerHTML = `
            <div class="background-container">
                <img src="${this.imagePath}" alt="${this.sceneName}" id="${this.sceneId}-bg" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            
            <!-- Header with wallet -->
            <header class="retro-header">
                <div class="logo">AdrianLAB - ${this.sceneName}</div>
                <button id="connect-wallet-${this.sceneId}" class="retro-button">Connect Wallet</button>
                <button id="mute-button-${this.sceneId}" class="retro-button small">🔊</button>
            </header>

            <!-- Main clickable area -->
            <div id="click-area-${this.sceneId}" class="click-area">
                <div class="pixel-cursor"></div>
            </div>

            <!-- Overlay text -->
            <div class="${this.sceneId}-overlay">
                <h1 class="retro-title">${this.overlayText.title}</h1>
                <p class="retro-subtitle">${this.overlayText.subtitle}</p>
            </div>

            <!-- Footer with Inventory -->
            <footer class="retro-footer">
                <div class="footer-sections">
                    <!-- Left section: Commands -->
                    <div class="footer-section commands-section">
                        <div class="section-header">Commands</div>
                        <div class="commands-grid">
                            <button class="command-btn">EXPLORE</button>
                            <button class="command-btn">USE</button>
                            <button class="command-btn">TAKE</button>
                            <button class="command-btn">CLOSE</button>
                            <button class="command-btn">OPEN</button>
                        </div>
                    </div>
                    
                    <!-- Middle section: Inventory Left -->
                    <div class="footer-section inventory-section-left">
                        <div class="section-header">Inventory</div>
                        <div id="inventory-grid-left" class="inventory-grid">
                            <div class="no-items">Connect wallet to load inventory.</div>
                        </div>
                    </div>
                    
                    <!-- Right section: Inventory Right -->
                    <div class="footer-section inventory-section-right">
                        <div class="section-header">Items</div>
                        <div id="inventory-grid-right" class="inventory-grid">
                            <div class="no-items">No items found.</div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
        
        return sceneElement;
    }

    // Mostrar la escena
    show() {
        console.log(`Showing scene: ${this.sceneName}`);
        console.log(`Scene ID: ${this.sceneId}`);
        
        // Ocultar solo las escenas del juego (no intro, floppy, etc.)
        document.querySelectorAll('#intro-screen, #main-screen, #floppy-screen, #outside, #basement, #upstairs').forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
            console.log(`Hidden screen: ${screen.id}`);
        });
        
        // Mostrar esta escena
        const sceneElement = document.getElementById(this.sceneId);
        console.log(`Looking for scene element with ID: ${this.sceneId}`);
        console.log(`Scene element found:`, sceneElement);
        
        if (sceneElement) {
            sceneElement.style.display = 'block';
            sceneElement.classList.add('active');
            console.log(`Scene element display set to: ${sceneElement.style.display}`);
            console.log(`Scene element classes: ${sceneElement.className}`);
            
            // Verificar que la imagen de fondo existe
            const bgImage = sceneElement.querySelector(`#${this.sceneId}-bg`);
            console.log(`Background image element:`, bgImage);
            if (bgImage) {
                console.log(`Background image src: ${bgImage.src}`);
            }
        } else {
            console.error(`Scene element not found for ID: ${this.sceneId}`);
        }
        
        // Configurar MenuManager para esta escena
        menuManager.setupSceneEventListeners(this.sceneId);
        menuManager.initializeCommandSystem(this.sceneId);
        
        // ✅ Solo actualizar display si ya hay items cargados, no recargar
        setTimeout(() => {
            console.log('Updating inventory for new scene');
            
            // ✅ Solo actualizar display si ya hay items cargados, no recargar
            if (menuManager.inventoryItems && menuManager.inventoryItems.length > 0) {
                menuManager.displayInventory();
            } else if (menuManager.isWalletConnected) {
                // Solo mostrar loading si no hay items pero hay wallet conectado
                menuManager.showInventoryLoading();
            }
        }, 100);
    }

    // Ocultar la escena
    hide() {
        const sceneElement = document.getElementById(this.sceneId);
        if (sceneElement) {
            sceneElement.style.display = 'none';
            sceneElement.classList.remove('active');
        }
    }
}

// Exportar la clase base
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseScene;
}

// Contract constants for OpenPack functionality
const PACK_TOKEN_MINTER_CONTRACT = "0x673bE1968A12470F93BE374AAB529a89d5D607d5";

// OpenPack functionality for floppy discs
async function openPack(selectedItem) {
    console.log('openPack called for item:', selectedItem);
    
    if (!selectedItem) {
        showNotification('Please select a floppy disc first.', 'error');
        return;
    }

    // Check if it's a floppy disc (tokens 10000-10005)
    const tokenId = parseInt(selectedItem.tokenId);
    if (tokenId < 10000 || tokenId > 10005) {
        showNotification('This function is only available for floppy discs.', 'error');
        return;
    }

    if (!window.ethereum?.selectedAddress) {
        showNotification('Please connect your wallet first.', 'error');
        return;
    }

    try {
        showNotification('Loading ethers library...', 'loading');

        let ethers;
        if (typeof window.ethers === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js';
            script.onload = () => {
                ethers = window.ethers;
                console.log('Ethers loaded successfully');
                executeOpenPack(selectedItem);
            };
            script.onerror = () => {
                showNotification('Failed to load ethers library. Please refresh the page.', 'error');
            };
            document.head.appendChild(script);
        } else {
            ethers = window.ethers;
            executeOpenPack(selectedItem);
        }

        async function executeOpenPack(selectedItem) {
            try {
                showNotification('Preparing transaction...', 'loading');

                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();

                // PackTokenMinter contract ABI (simplified for openPack function)
                const packMinterABI = [
                    "function openPack(uint256 tokenId) external"
                ];

                const contract = new ethers.Contract(PACK_TOKEN_MINTER_CONTRACT, packMinterABI, signer);
                const tokenId = selectedItem.tokenId;

                console.log('Opening pack for token ID:', tokenId);

                showNotification('Confirming transaction in your wallet...', 'loading');

                const tx = await contract.openPack(tokenId);
                
                showNotification('Transaction sent! Waiting for confirmation...', 'loading');
                console.log('Transaction hash:', tx.hash);

                const receipt = await tx.wait();
                
                showNotification(`✅ Pack opened successfully! Transaction: ${receipt.transactionHash}`, 'success');
                console.log('Transaction confirmed:', receipt);

                // Refresh inventory after successful pack opening
                setTimeout(() => {
                    if (window.menuManager) {
                        window.menuManager.loadInventory();
                    }
                }, 2000);

            } catch (error) {
                console.error('Error opening pack:', error);
                
                let errorMessage = 'Failed to open pack.';
                if (error.code === 4001) {
                    errorMessage = 'Transaction was rejected by user.';
                } else if (error.message) {
                    errorMessage = `Error: ${error.message}`;
                }
                
                showNotification(errorMessage, 'error');
            }
        }

    } catch (error) {
        console.error('Error opening pack:', error);
        showNotification('Failed to load ethers library. Please refresh the page.', 'error');
    }
}

// Make openPack globally available
window.openPack = openPack; 