// Upstairs Scene - Escena del piso superior
class UpstairsScene extends BaseScene {
    constructor() {
        super('upstairs', 'Upstairs');
        this.imagePath = 'scenes/images/upstairs.png';
        this.overlayText = {
            title: 'AdrianLAB Upstairs',
            subtitle: 'The upper floor of the laboratory...'
        };
    }

    setupHotspots() {
        console.log('Setting up Upstairs hotspots...');
        
        // Definir clickable areas (hotspots) basados en upstairs.png layout
        this.hotspots = [
            {
                name: 'Desk Area',
                x: [35, 60],
                y: [75, 100],
                action: 'inspect_desk_area',
                messages: {
                    explore: "🖥️ You examine the upstairs desk area. It's cleaner than the basement, with multiple monitors showing various DeFi protocols.",
                    use: "💻 You use the desk's main terminal. It's running a sophisticated trading bot with AI algorithms.",
                    take: "📱 You can't take the desk, but you find a smartphone with crypto trading apps open.",
                    inspect: "🔍 The desk has three monitors: one showing portfolio performance, another with yield farming stats, and a third with NFT marketplace analytics.",
                    open: "🗄️ You open the desk drawer and find a hardware wallet with significant holdings.",
                    close: "🔒 You close the desk drawer. The hardware wallet is safely stored."
                }
            },
            {
                name: 'Boxes Area',
                x: [66, 91],
                y: [60, 85],
                action: 'inspect_boxes',
                messages: {
                    explore: "📦 You explore the boxes area. These contain successful NFT projects and rare collectibles.",
                    use: "🎁 You interact with the boxes. One contains a limited edition AdrianPunk NFT!",
                    take: "💎 You can't take all the boxes, but you find a rare NFT trading card inside one.",
                    inspect: "🔍 The boxes are labeled with project names: 'Moon Mission', 'Diamond Hands', 'Lambo Dreams'. All successful!",
                    open: "📦 You open a box and find a collection of rare memecoins and governance tokens.",
                    close: "🔒 You close the box. The valuable NFTs are safely stored."
                }
            },
            {
                name: 'Armchair Area',
                x: [75, 100],
                y: [74, 99],
                action: 'inspect_armchair',
                messages: {
                    explore: "🪑 You examine the premium armchair. It's where the successful traders sit and watch their portfolios grow.",
                    use: "🪑 You sit in the armchair. It's incredibly comfortable and has built-in massage features.",
                    take: "🪑 You can't take the armchair, but you find a luxury watch worth several ETH under the cushion.",
                    inspect: "🔍 The armchair has integrated screens showing real-time crypto prices and portfolio performance.",
                    open: "🪑 You can't open the armchair, but you discover it has hidden compartments for storing valuables.",
                    close: "🔒 The armchair's compartments are already closed and secure."
                }
            },
            {
                name: 'Washing Machine Area',
                x: [58, 83],
                y: [59, 84],
                action: 'inspect_washing_machine',
                messages: {
                    explore: "🧺 You examine the upstairs washing machine. It's a smart appliance that accepts crypto payments.",
                    use: "⚡ You use the smart washing machine. It's connected to a DeFi protocol for laundry token rewards.",
                    take: "🧺 You can't take the washing machine, but you find some premium laundry tokens in the detergent compartment.",
                    inspect: "🔍 The washing machine has a touchscreen interface showing laundry token prices and yield farming opportunities.",
                    open: "🚪 You open the washing machine door. It's empty but ready for the next load.",
                    close: "🔒 You close the washing machine door. It's ready for operation."
                }
            },
            {
                name: 'Stairs Area',
                x: [0, 20],
                y: [29, 54],
                action: 'inspect_stairs',
                messages: {
                    explore: "🪜 You examine the stairs leading down to the basement. They're well-maintained and have LED lighting.",
                    use: "⬇️ You use the stairs to go down to the basement. The LED lights guide your way safely.",
                    take: "🪜 You can't take the stairs, but you find a small LED light that fell off the railing.",
                    inspect: "🔍 The stairs have smart lighting that adjusts based on time of day and energy prices.",
                    open: "🪜 You can't open the stairs, but you notice a hidden storage compartment under one step.",
                    close: "🔒 The stairs are always open for access between floors."
                }
            },
            {
                name: 'Computer Area',
                x: [13, 38],
                y: [39, 64],
                action: 'inspect_computer',
                messages: {
                    explore: "💻 You examine the upstairs computer area. It's a high-end setup with multiple GPUs for mining and trading.",
                    use: "🖥️ You use the computer. It's running advanced trading algorithms and yield farming strategies.",
                    take: "💻 You can't take the computer, but you find a USB drive with profitable trading strategies.",
                    inspect: "🔍 The computer has multiple monitors showing portfolio performance, mining stats, and DeFi protocol analytics.",
                    open: "🔧 You open the computer case. It's filled with high-end GPUs and cooling systems.",
                    close: "🔒 You close the computer case. The mining operation continues uninterrupted."
                }
            },
            {
                name: 'Light Bulb Area',
                x: [38, 63],
                y: [0, 20],
                action: 'inspect_light_bulb',
                messages: {
                    explore: "💡 You examine the upstairs lighting. It's a smart LED system that adjusts based on crypto market conditions.",
                    use: "⚡ You use the smart lighting system. It changes color based on your portfolio performance.",
                    take: "💡 You can't take the light fixtures, but you find a smart bulb that can be controlled via blockchain.",
                    inspect: "🔍 The lighting system is connected to a DAO that votes on color schemes and brightness levels.",
                    open: "🔧 You open the light fixture panel. It reveals the smart control system.",
                    close: "🔒 You close the light fixture panel. The smart lighting continues its autonomous operation."
                }
            },
            {
                name: 'Windows Area',
                x: [41, 66],
                y: [27, 52],
                action: 'inspect_windows',
                messages: {
                    explore: "🪟 You examine the upstairs windows. They offer a great view of the crypto landscape outside.",
                    use: "🪟 You use the smart windows. They adjust tint based on sunlight and energy prices.",
                    take: "🪟 You can't take the windows, but you find a solar panel controller that fell behind the frame.",
                    inspect: "🔍 The windows have smart tinting that generates solar power and sells it to the grid for crypto.",
                    open: "🪟 You open the windows. Fresh air flows in, along with the sounds of the crypto world.",
                    close: "🔒 You close the windows. The smart tinting system activates for energy efficiency."
                }
            }
        ];
        
        console.log('Upstairs hotspots configured:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-upstairs');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Comandos específicos del upstairs
    handleExploreCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.explore || `You explore the ${hotspot.name}.`, x, y);
    }

    handleUseCommand(hotspot, x, y) {
        if (hotspot.name === 'Stairs Area') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('basement');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('basement');
                }
            }, 1500);
        } else if (hotspot.name === 'Computer Area') {
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
        } else {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
        }
    }

    handleTakeCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.take || `You can't take ${hotspot.name}.`, x, y);
    }

    handleInspectCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.inspect || `You inspect the ${hotspot.name}.`, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.open || `You can't open ${hotspot.name}.`, x, y);
    }

    handleCloseCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.close || `You can't close ${hotspot.name}.`, x, y);
    }

    // Manejar click especial para el área central (mint popup)
    handleClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convertir a porcentaje
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        console.log(`Upstairs click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
        
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
        
        // Si no es área central, usar lógica normal de hotspots
        super.handleClick(event);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpstairsScene;
} 