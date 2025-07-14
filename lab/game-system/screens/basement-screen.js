// Basement Screen - Specific implementation for the basement area
class BasementScreen extends GameScreen {
    constructor() {
        const config = {
            backgroundImage: 'basement.png',
            hotspots: [
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
                    action: 'change_screen',
                    targetScreen: 'upstairs',
                    message: "💬 Do you really want to go upstairs? That's where the fiat lives."
                },
                {
                    name: 'Computer Area',
                    x: [13, 38],
                    y: [39, 64],
                    action: 'show_popup',
                    popupId: 'mint_popup',
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
            ]
        };
        
        super('basement', config);
    }

    // Override init to add basement-specific setup
    init() {
        super.init();
        this.setupBasementSpecifics();
    }

    // Setup basement-specific elements
    setupBasementSpecifics() {
        // Add any basement-specific UI elements
        this.createMintPopup();
    }

    // Create mint popup
    createMintPopup() {
        const popup = document.createElement('div');
        popup.id = 'mint_popup';
        popup.className = 'game-popup';
        popup.style.display = 'none';
        
        popup.innerHTML = `
            <div class="popup-content">
                <h3>Mint AdrianPunks</h3>
                <p>Ready to mint your AdrianPunk?</p>
                <button id="mint_button" class="game-button">Mint Now</button>
                <button id="close_mint_popup" class="game-button">Close</button>
            </div>
        `;
        
        this.element.appendChild(popup);
        
        // Add event listeners
        document.getElementById('mint_button').addEventListener('click', () => {
            this.handleMint();
        });
        
        document.getElementById('close_mint_popup').addEventListener('click', () => {
            this.hidePopup('mint_popup');
        });
    }

    // Override showPopup for basement-specific popups
    showPopup(popupId) {
        if (popupId === 'mint_popup') {
            const popup = document.getElementById('mint_popup');
            if (popup) {
                popup.style.display = 'flex';
            }
        }
    }

    // Hide popup
    hidePopup(popupId) {
        if (popupId === 'mint_popup') {
            const popup = document.getElementById('mint_popup');
            if (popup) {
                popup.style.display = 'none';
            }
        }
    }

    // Handle mint action
    handleMint() {
        console.log('Mint action triggered');
        // This would integrate with the existing mint functionality
        this.hidePopup('mint_popup');
        this.showFloatingText('💬 Minting in progress...', 50, 50);
    }

    // Override triggerAction for basement-specific actions
    triggerAction(actionName, hotspot) {
        switch (actionName) {
            case 'inspect_desk_area':
                this.handleDeskInspection(hotspot);
                break;
            case 'inspect_boxes':
                this.handleBoxesInspection(hotspot);
                break;
            case 'inspect_armchair':
                this.handleArmchairInspection(hotspot);
                break;
            case 'inspect_washing_machine':
                this.handleWashingMachineInspection(hotspot);
                break;
            case 'inspect_light_bulb':
                this.handleLightBulbInspection(hotspot);
                break;
            case 'inspect_windows':
                this.handleWindowsInspection(hotspot);
                break;
            default:
                super.triggerAction(actionName, hotspot);
        }
    }

    // Specific inspection handlers
    handleDeskInspection(hotspot) {
        // Could trigger additional events or change game state
        gameEngine.emit('flagSet', 'desk_inspected', true);
    }

    handleBoxesInspection(hotspot) {
        gameEngine.emit('flagSet', 'boxes_inspected', true);
    }

    handleArmchairInspection(hotspot) {
        gameEngine.emit('flagSet', 'armchair_inspected', true);
    }

    handleWashingMachineInspection(hotspot) {
        gameEngine.emit('flagSet', 'washing_machine_inspected', true);
    }

    handleLightBulbInspection(hotspot) {
        gameEngine.emit('flagSet', 'light_bulb_inspected', true);
    }

    handleWindowsInspection(hotspot) {
        gameEngine.emit('flagSet', 'windows_inspected', true);
    }
} 