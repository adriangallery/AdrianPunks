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

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing indextest.js...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    detectMobile();
    initializeApp();
    setupEventListeners();
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
    
    // MetaMask events
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
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
    console.log('Starting transition to main screen from intro');
    
    // Fade out intro (7 seconds - changed from 5)
    introScreen.style.opacity = '0';
    introScreen.style.transition = 'opacity 7s ease-in-out';
    
    setTimeout(() => {
        introScreen.classList.remove('active');
        introScreen.style.display = 'none';
        
        // Ensure progress bar is hidden when basement appears
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
            console.log('Progress bar hidden on basement transition');
        }
        
        // Fade in main screen
        mainScreen.style.display = 'block';
        mainScreen.style.opacity = '0';
        mainScreen.style.transition = 'opacity 2s ease-in-out';
        
        setTimeout(() => {
            mainScreen.classList.add('active');
            mainScreen.style.opacity = '1';
            
            // Load ethers.js when entering main screen
            if (!ethersLoaded) {
                loadEthersWhenNeeded();
            }
            
            // Initialize point & click system
            setTimeout(() => {
                initializePointAndClickSystem();
            }, 100);
        }, 100);
    }, 7000);
}

function goToMainScreen() {
    floppyScreen.classList.remove('active');
    floppyScreen.style.opacity = '0';
    floppyScreen.style.transition = 'opacity 2s ease-in-out';
    
    setTimeout(() => {
        floppyScreen.style.display = 'none';
        mainScreen.style.display = 'block';
        mainScreen.style.opacity = '0';
        mainScreen.style.transition = 'opacity 2s ease-in-out';
        
        setTimeout(() => {
            mainScreen.classList.add('active');
            mainScreen.style.opacity = '1';
            
            // Initialize point & click system when returning from floppy screen
            setTimeout(() => {
                initializePointAndClickSystem();
            }, 100);
        }, 100);
    }, 2000);
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

function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        backgroundMusic.pause();
        if (isMobile) {
            muteButton.textContent = 'Music OFF';
        } else {
            muteButton.textContent = '🔇';
        }
    } else {
        if (musicInitialized) {
            backgroundMusic.play().catch(e => console.log('Audio play failed'));
        }
        if (isMobile) {
            muteButton.textContent = 'Music ON';
        } else {
            muteButton.textContent = '🔊';
        }
    }
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
        const shortAddress = window.ethereum.selectedAddress.slice(0, 6) + '...' + window.ethereum.selectedAddress.slice(-4);
        connectWalletBtn.textContent = shortAddress;
        connectWalletBtn.style.background = '#00ff00';
        connectWalletBtn.style.color = '#000';
        
        // Notify iframe about wallet connection
        notifyIframeWalletConnected();
        
        // Update inventory for connected wallet
        updateWalletForInventory();
    } else {
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.style.background = '#000';
        connectWalletBtn.style.color = '#00ff00';
        
        // Notify iframe about wallet disconnection
        notifyIframeWalletDisconnected();
        
        // Clear inventory for disconnected wallet
        updateWalletForInventory();
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
    
    // Check if click is in center area (for mint popup) - original functionality
    if (xPercent >= 40 && xPercent <= 60 && yPercent >= 40 && yPercent <= 60) {
        console.log('Center area clicked - opening mint popup');
        if (!isWalletConnected) {
            showNotification('Connect your wallet first', 'warning');
            return;
        }
        
        mintPopup.classList.add('active');
        setTimeout(() => {
            notifyIframeWalletConnected();
        }, 100);
        return;
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
    const hotspots = [
        {
            name: 'Desk Area',
            x: [40, 55],
            y: [80, 95],
            action: 'inspect_desk_area',
            message: "💬 You feel a sudden urge to write a thread on Twitter."
        },
        {
            name: 'Boxes Area',
            x: [71, 86],
            y: [65, 80],
            action: 'inspect_boxes',
            message: "💬 Boxes full of failed NFT projects... and one unopened Bored Ape piñata."
        },
        {
            name: 'Armchair Area',
            x: [80, 95],
            y: [79, 94],
            action: 'inspect_armchair',
            message: "💬 Sits like a throne. Probably where the DAO founder disappeared."
        },
        {
            name: 'Washing Machine Area',
            x: [63, 78],
            y: [64, 79],
            action: 'inspect_washing_machine',
            message: "💬 Perfect for laundering… socks. Only socks."
        },
        {
            name: 'Stairs Area',
            x: [0, 15],
            y: [34, 49],
            action: 'inspect_stairs',
            message: "💬 Do you really want to go upstairs? That's where the fiat lives."
        },
        {
            name: 'Computer Area',
            x: [18, 33],
            y: [44, 59],
            action: 'inspect_computer',
            message: "💬 Someone mined 6 BTC on this in 2010… then rage quit and sold at $12."
        },
        {
            name: 'Light Bulb Area',
            x: [43, 58],
            y: [0, 15],
            action: 'inspect_light_bulb',
            message: "💬 It's lit... unlike your portfolio."
        },
        {
            name: 'Windows Area',
            x: [46, 61],
            y: [32, 47],
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
    
    // General area click - show coordinates
    showNotification(`You clicked at ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
}

// Handle hotspot clicks
function handleHotspotClick(hotspot, x, y) {
    console.log(`Hotspot clicked: ${hotspot.name}`);
    
    // Show the specific message for each hotspot as floating text
    if (hotspot.message) {
        showFloatingText(hotspot.message, x, y);
    } else {
        showFloatingText(`💬 You interact with ${hotspot.name}`, x, y);
    }
    
    // Add to discovered items if not already found
    if (!gameState.discoveredItems.includes(hotspot.name)) {
        gameState.discoveredItems.push(hotspot.name);
    }
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
    if (!currentAccount) {
        console.log('No current account, skipping inventory load');
        return;
    }
    
    console.log('Loading inventory for account:', currentAccount);
    showInventoryLoading();
    
    try {
        const contractAddress = CONTRACTS.ERC1155;
        const tokenType = "ERC1155";
        
        console.log(`Loading ${tokenType} tokens from contract: ${contractAddress}`);
        
        // Use Alchemy's REST API directly
        let alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${currentAccount}&contractAddresses[]=${contractAddress}&withMetadata=true&pageSize=50&tokenType=${tokenType}`;
        
        console.log(`Requesting NFTs with URL: ${alchemyUrl}`);
        
        const alchemyResponse = await fetch(alchemyUrl);
        
        if (!alchemyResponse.ok) {
            throw new Error(`Error getting NFTs from Alchemy API: ${alchemyResponse.status}`);
        }
        
        const nftsData = await alchemyResponse.json();
        console.log(`NFT data received:`, nftsData);
        
        // Process NFTs and filter for tokens 10000, 10001, and 10002
        if (nftsData.ownedNfts && nftsData.ownedNfts.length > 0) {
            const tokens = nftsData.ownedNfts.map(nft => {
                try {
                    // Extract tokenId
                    let tokenId;
                    if (nft.tokenId) {
                        tokenId = nft.tokenId;
                    } else if (nft.id && nft.id.tokenId) {
                        tokenId = nft.id.tokenId;
                    } else {
                        console.error("No tokenId found in NFT:", nft);
                        return null;
                    }
                    
                    // Convert tokenId to integer
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
                    
                    // Filter for tokens 10000, 10001, and 10002 only
                    if (tokenIdInt !== 10000 && tokenIdInt !== 10001 && tokenIdInt !== 10002) {
                        return null;
                    }
                    
                    // Extract title/name
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
                    
                    // Extract image URL
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
                    
                    // Clean up IPFS URLs
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
            inventoryItems = tokens;
            displayInventory();
            
        } else {
            showNoItems();
        }
        
    } catch (error) {
        console.error("Error loading inventory:", error);
        showNotification(`Error loading inventory: ${error.message}`, 'error');
    } finally {
        hideInventoryLoading();
    }
}

// Display inventory items
function displayInventory() {
    console.log('Displaying inventory items:', inventoryItems);
    
    // Get both inventory grids
    const inventoryGridLeft = document.getElementById('inventory-grid-left');
    const inventoryGridRight = document.getElementById('inventory-grid-right');
    
    // Clear both grids
    inventoryGridLeft.innerHTML = "";
    inventoryGridRight.innerHTML = "";
    
    if (inventoryItems.length === 0) {
        inventoryGridLeft.innerHTML = '<div class="no-items">No floppy discs found.</div>';
        inventoryGridRight.innerHTML = '<div class="no-items">No items found.</div>';
        return;
    }
    
    // Todos los tokens van en Inventory (central)
    const inventoryTokens = inventoryItems.filter(item => item.tokenId === 10000 || item.tokenId === 10001 || item.tokenId === 10002);
    
    // Mostrar en Inventory (central)
    if (inventoryTokens.length === 0) {
        inventoryGridLeft.innerHTML = '<div class="no-items">No floppy discs found.</div>';
    } else {
        inventoryTokens.forEach(item => {
            const itemElement = createInventoryItemElement(item);
            inventoryGridLeft.appendChild(itemElement);
        });
    }
    
    // Items (derecha) vacío
    inventoryGridRight.innerHTML = '<div class="no-items">No items found.</div>';
}

// Helper function to create inventory item element
function createInventoryItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'inventory-item';
    
    const imageUrl = item.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+';
    
    itemElement.innerHTML = `
        <img src="${imageUrl}" alt="${item.title}" class="inventory-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+">
        <div class="item-name">${item.title}</div>
        <div class="item-id">ID: ${item.tokenId}</div>
    `;
    
    // Add click event for item selection
    itemElement.addEventListener('click', () => {
        selectInventoryItem(item);
    });
    
    return itemElement;
}

// Handle inventory item selection
function selectInventoryItem(item) {
    console.log('Selected inventory item:', item);
    selectedInventoryItem = item;
    showNotification(`Selected: ${item.title} (ID: ${item.tokenId})`, 'success');
    
    // Update visual feedback for selected item
    document.querySelectorAll('.inventory-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Highlight selected item
    event.target.closest('.inventory-item').classList.add('selected');
}

// Show no items message
function showNoItems() {
    const inventoryGridLeft = document.getElementById('inventory-grid-left');
    const inventoryGridRight = document.getElementById('inventory-grid-right');
    
    inventoryGridLeft.innerHTML = '<div class="no-items">No floppy discs found.</div>';
    inventoryGridRight.innerHTML = '<div class="no-items">No items found.</div>';
}

// Show/hide inventory loading
function showInventoryLoading() {
    const inventoryGridLeft = document.getElementById('inventory-grid-left');
    const inventoryGridRight = document.getElementById('inventory-grid-right');
    
    const loadingHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    
    inventoryGridLeft.innerHTML = loadingHTML;
    inventoryGridRight.innerHTML = loadingHTML;
}

function hideInventoryLoading() {
    // Loading state is handled by displayInventory or showNoItems
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
        currentAccount = window.ethereum.selectedAddress;
        console.log('Setting current account:', currentAccount);
        loadInventory();
    } else {
        currentAccount = null;
        inventoryItems = [];
        selectedInventoryItem = null;
        showNoItems();
    }
}

// Initialize point & click system when main screen is shown
function initializePointAndClickSystem() {
    console.log('Initializing point & click system');
    initializePointAndClick();
    
    // Check if wallet is already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        currentAccount = window.ethereum.selectedAddress;
        console.log('Wallet already connected, updating inventory');
        updateWalletForInventory();
    }
} 