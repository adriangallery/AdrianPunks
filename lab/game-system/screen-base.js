// Base class for all game screens
class GameScreen {
    constructor(screenId, config = {}) {
        this.screenId = screenId;
        this.config = {
            backgroundImage: config.backgroundImage || '',
            hotspots: config.hotspots || [],
            music: config.music || null,
            ...config
        };
        
        this.isVisible = false;
        this.hotspots = this.config.hotspots;
        this.eventListeners = [];
    }

    // Initialize the screen
    init() {
        console.log(`Initializing screen: ${this.screenId}`);
        this.createScreenElement();
        this.setupHotspots();
        this.setupEventListeners();
    }

    // Create the screen DOM element
    createScreenElement() {
        // Create screen container
        this.element = document.createElement('div');
        this.element.id = `screen-${this.screenId}`;
        this.element.className = 'game-screen';
        this.element.style.display = 'none';
        
        // Create background
        if (this.config.backgroundImage) {
            this.background = document.createElement('img');
            this.background.src = this.config.backgroundImage;
            this.background.className = 'screen-background';
            this.background.alt = `${this.screenId} background`;
            this.element.appendChild(this.background);
        }

        // Create click area
        this.clickArea = document.createElement('div');
        this.clickArea.className = 'screen-click-area';
        this.element.appendChild(this.clickArea);

        // Add to game container
        const gameContainer = document.querySelector('.game-container') || document.body;
        gameContainer.appendChild(this.element);
    }

    // Setup hotspots for this screen
    setupHotspots() {
        this.hotspots = this.hotspots.map(hotspot => ({
            ...hotspot,
            element: null
        }));
    }

    // Setup event listeners
    setupEventListeners() {
        // Click handling
        this.clickArea.addEventListener('click', (e) => this.handleClick(e));
        this.clickArea.addEventListener('touchstart', (e) => this.handleClick(e));
        
        // Mouse movement for cursor feedback
        this.clickArea.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    // Handle clicks on the screen
    handleClick(event) {
        const rect = this.clickArea.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert to percentage
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        console.log(`Click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
        
        // Check hotspots
        const clickedHotspot = this.checkHotspotClick(xPercent, yPercent);
        if (clickedHotspot) {
            this.handleHotspotClick(clickedHotspot, xPercent, yPercent);
        } else {
            this.handleGeneralClick(xPercent, yPercent);
        }
    }

    // Check if click is in any hotspot
    checkHotspotClick(x, y) {
        for (const hotspot of this.hotspots) {
            if (x >= hotspot.x[0] && x <= hotspot.x[1] &&
                y >= hotspot.y[0] && y <= hotspot.y[1]) {
                return hotspot;
            }
        }
        return null;
    }

    // Handle hotspot click
    handleHotspotClick(hotspot, x, y) {
        console.log(`Hotspot clicked: ${hotspot.name}`);
        
        // Show message
        if (hotspot.message) {
            this.showFloatingText(hotspot.message, x, y);
        }
        
        // Trigger action
        if (hotspot.action) {
            this.triggerAction(hotspot.action, hotspot);
        }
        
        // Add to discovered items
        gameEngine.emit('itemDiscovered', hotspot.name);
    }

    // Handle general area click
    handleGeneralClick(x, y) {
        this.showFloatingText(`You clicked at ${x.toFixed(1)}%, ${y.toFixed(1)}%`, x, y);
    }

    // Handle mouse movement
    handleMouseMove(event) {
        // Could be used for cursor changes or hover effects
    }

    // Show floating text
    showFloatingText(message, x, y) {
        // Remove existing floating text
        const existingText = document.querySelector('.floating-text');
        if (existingText) {
            existingText.remove();
        }
        
        // Create new floating text
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-text';
        floatingText.textContent = message;
        
        // Position the text
        const rect = this.element.getBoundingClientRect();
        const xPos = (x / 100) * rect.width;
        const yPos = (y / 100) * rect.height;
        
        let left = xPos - 150;
        let top = yPos - 80;
        
        // Ensure text stays within bounds
        if (left < 10) left = 10;
        if (left > rect.width - 310) left = rect.width - 310;
        if (top < 10) top = yPos + 20;
        if (top > rect.height - 100) top = rect.height - 100;
        
        floatingText.style.left = left + 'px';
        floatingText.style.top = top + 'px';
        
        this.element.appendChild(floatingText);
        
        // Remove after animation
        setTimeout(() => {
            if (floatingText.parentNode) {
                floatingText.remove();
            }
        }, 4000);
    }

    // Trigger an action
    triggerAction(actionName, hotspot) {
        console.log(`Triggering action: ${actionName}`);
        
        // Handle different action types
        switch (actionName) {
            case 'change_screen':
                if (hotspot.targetScreen) {
                    gameEngine.changeScreen(hotspot.targetScreen);
                }
                break;
            case 'show_popup':
                if (hotspot.popupId) {
                    this.showPopup(hotspot.popupId);
                }
                break;
            case 'custom':
                if (hotspot.customFunction) {
                    hotspot.customFunction(hotspot);
                }
                break;
            default:
                console.log(`Unknown action: ${actionName}`);
        }
    }

    // Show popup
    showPopup(popupId) {
        // Implementation for popups
        console.log(`Showing popup: ${popupId}`);
    }

    // Show the screen
    show() {
        this.element.style.display = 'block';
        this.isVisible = true;
        
        // Play music if specified
        if (this.config.music) {
            this.playMusic(this.config.music);
        }
        
        console.log(`Screen shown: ${this.screenId}`);
    }

    // Hide the screen
    hide() {
        this.element.style.display = 'none';
        this.isVisible = false;
        
        // Stop music if playing
        if (this.config.music) {
            this.stopMusic();
        }
        
        console.log(`Screen hidden: ${this.screenId}`);
    }

    // Play music for this screen
    playMusic(musicFile) {
        // Implementation for music
        console.log(`Playing music: ${musicFile}`);
    }

    // Stop music
    stopMusic() {
        // Implementation for stopping music
        console.log('Stopping music');
    }

    // Add hotspot dynamically
    addHotspot(hotspot) {
        this.hotspots.push(hotspot);
    }

    // Remove hotspot
    removeHotspot(hotspotName) {
        this.hotspots = this.hotspots.filter(h => h.name !== hotspotName);
    }

    // Update hotspot
    updateHotspot(hotspotName, updates) {
        const hotspot = this.hotspots.find(h => h.name === hotspotName);
        if (hotspot) {
            Object.assign(hotspot, updates);
        }
    }
} 