// Game Initialization - Loads and initializes the entire game system

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing AdrianLAB Adventure Game System...');
    
    // Load all game modules
    loadGameModules();
});

// Load all game modules in the correct order
async function loadGameModules() {
    try {
        // 1. Load CSS
        loadGameStyles();
        
        // 2. Initialize UI Manager first
        await initializeUIManager();
        
        // 3. Initialize Game Engine
        await initializeGameEngine();
        
        // 4. Register screens
        await registerScreens();
        
        // 5. Start the game
        startGame();
        
        console.log('Game system fully initialized!');
        
    } catch (error) {
        console.error('Error initializing game system:', error);
    }
}

// Load game styles
function loadGameStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'game-system/game-styles.css';
    document.head.appendChild(link);
}

// Initialize UI Manager
async function initializeUIManager() {
    console.log('Loading UI Manager...');
    
    // Load UI Manager script
    await loadScript('game-system/ui-manager.js');
    
    // Initialize UI Manager
    if (window.uiManager) {
        window.uiManager.init();
        console.log('UI Manager initialized');
    } else {
        throw new Error('UI Manager not loaded');
    }
}

// Initialize Game Engine
async function initializeGameEngine() {
    console.log('Loading Game Engine...');
    
    // Load Game Engine script
    await loadScript('game-system/game-engine.js');
    
    // Initialize Game Engine
    if (window.gameEngine) {
        window.gameEngine.init();
        console.log('Game Engine initialized');
    } else {
        throw new Error('Game Engine not loaded');
    }
}

// Register all screens
async function registerScreens() {
    console.log('Loading and registering screens...');
    
    // Load screen base class
    await loadScript('game-system/screen-base.js');
    
    // Load individual screens
    await loadScript('game-system/screens/intro-screen.js');
    await loadScript('game-system/screens/basement-screen.js');
    
    // Register screens with the game engine
    if (window.IntroScreen && window.BasementScreen && window.gameEngine) {
        const introScreen = new IntroScreen();
        const basementScreen = new BasementScreen();
        
        introScreen.init();
        basementScreen.init();
        
        window.gameEngine.registerScreen('intro', introScreen);
        window.gameEngine.registerScreen('basement', basementScreen);
        
        console.log('Screens registered');
    } else {
        throw new Error('Screen classes not loaded');
    }
}

// Start the game
function startGame() {
    console.log('Starting game...');
    
    // Start with intro screen
    if (window.gameEngine) {
        window.gameEngine.changeScreen('intro');
    }
}

// Utility function to load scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Game error:', event.error);
    
    // Show error notification if UI Manager is available
    if (window.uiManager) {
        window.uiManager.showNotification('An error occurred: ' + event.error.message, 'error');
    }
});

// Handle page visibility changes (pause/resume game)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Game paused (page hidden)');
        // Could implement pause functionality here
    } else {
        console.log('Game resumed (page visible)');
        // Could implement resume functionality here
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    console.log('Window resized, updating game layout...');
    // Could implement responsive layout updates here
});

// Export for debugging
window.gameSystem = {
    loadGameModules,
    initializeUIManager,
    initializeGameEngine,
    registerScreens,
    startGame
}; 