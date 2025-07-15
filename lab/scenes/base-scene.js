// Base Scene Class - Clase base para todas las escenas
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

    // Manejar click en la escena
    handleClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convertir a porcentaje
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        console.log(`${this.sceneName} click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
        
        // Verificar si el click está en algún hotspot
        const hotspot = this.getHotspotAt(xPercent, yPercent);
        
        if (hotspot) {
            this.handleHotspotClick(hotspot, xPercent, yPercent);
        } else {
            this.handleGeneralClick(xPercent, yPercent);
        }
    }

    // Obtener hotspot en las coordenadas especificadas
    getHotspotAt(x, y) {
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
            default:
                this.handleExploreCommand(hotspot, x, y);
        }
    }

    // Manejar click general (fuera de hotspots)
    handleGeneralClick(x, y) {
        const command = getCurrentCommand();
        
        if (command === 'explore') {
            showNotification(`You clicked at ${x.toFixed(1)}%, ${y.toFixed(1)}%`);
        } else if (command === 'close') {
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
        
        // Actualizar inventario en la nueva escena
        if (menuManager.inventoryItems.length > 0) {
            console.log('Updating inventory for new scene');
            menuManager.displayInventory();
        } else if (menuManager.isWalletConnected && menuManager.currentAccount) {
            console.log('Wallet connected but no inventory, forcing reload...');
            menuManager.loadInventory();
        }
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