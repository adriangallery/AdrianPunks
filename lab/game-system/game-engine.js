// Game Engine - Core system for point & click adventure game
class GameEngine {
    constructor() {
        this.currentScreen = 'intro';
        this.gameState = {
            currentLocation: 'basement',
            discoveredItems: [],
            interactions: [],
            inventory: [],
            flags: {}
        };
        this.screens = {};
        this.eventListeners = {};
        this.isInitialized = false;
    }

    // Initialize the game engine
    init() {
        console.log('Initializing Game Engine...');
        this.setupEventListeners();
        this.loadScreens();
        this.isInitialized = true;
        console.log('Game Engine initialized');
    }

    // Setup global event listeners
    setupEventListeners() {
        // Global game events
        this.on('screenChange', (screenId) => {
            console.log(`Screen changed to: ${screenId}`);
            this.currentScreen = screenId;
        });

        this.on('itemDiscovered', (itemName) => {
            if (!this.gameState.discoveredItems.includes(itemName)) {
                this.gameState.discoveredItems.push(itemName);
                console.log(`Item discovered: ${itemName}`);
            }
        });

        this.on('flagSet', (flagName, value) => {
            this.gameState.flags[flagName] = value;
            console.log(`Flag set: ${flagName} = ${value}`);
        });
    }

    // Load all screen definitions
    loadScreens() {
        // This will be populated by individual screen modules
        this.screens = {
            intro: null,
            basement: null,
            upstairs: null,
            // Add more screens as needed
        };
    }

    // Register a screen with the engine
    registerScreen(screenId, screenModule) {
        this.screens[screenId] = screenModule;
        console.log(`Screen registered: ${screenId}`);
    }

    // Change to a different screen
    changeScreen(screenId) {
        if (this.screens[screenId]) {
            // Hide current screen
            if (this.currentScreen && this.screens[this.currentScreen]) {
                this.screens[this.currentScreen].hide();
            }

            // Show new screen
            this.screens[screenId].show();
            this.currentScreen = screenId;
            this.emit('screenChange', screenId);
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }

    // Event system
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    emit(eventName, ...args) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                callback(...args);
            });
        }
    }

    // Get current game state
    getGameState() {
        return this.gameState;
    }

    // Update game state
    updateGameState(updates) {
        Object.assign(this.gameState, updates);
    }

    // Save game state (for future persistence)
    saveGameState() {
        localStorage.setItem('adrianPunksGameState', JSON.stringify(this.gameState));
    }

    // Load game state
    loadGameState() {
        const saved = localStorage.getItem('adrianPunksGameState');
        if (saved) {
            this.gameState = { ...this.gameState, ...JSON.parse(saved) };
        }
    }
}

// Global game engine instance
window.gameEngine = new GameEngine(); 