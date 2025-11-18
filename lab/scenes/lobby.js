// Lobby Scene - Escena del lobby principal
class LobbyScene extends BaseScene {
    constructor() {
        super('lobby', 'Lobby');
        this.imagePath = 'scenes/images/lobby.png';
        this.overlayText = {
            title: 'AdrianLAB Lobby',
            subtitle: 'The heart of the laboratory...'
        };
    }

    setupHotspots() {
        console.log('Setting up Lobby hotspots...');
        
        // Definir clickable areas (hotspots) para lobby
        this.hotspots = [
            {
                name: 'Stairs to Upstairs',
                x: [30, 70], // range x[30-70]
                y: [40, 80], // range y[40-80]
                action: 'go_upstairs',
                messages: {
                    explore: "🪜 You examine the stairs leading to the upper floor. They're elegantly designed with smart lighting.",
                    use: "⬆️ You use the stairs to go upstairs. The smart lighting system guides your way to the trading floor!",
                    take: "🪜 You can't take the stairs, but you find a small LED light that fell off the railing.",
                    inspect: "🔍 The stairs have integrated smart lighting that adjusts based on time and energy prices.",
                    open: "🪜 You can't open the stairs, but you notice a hidden storage compartment under one step.",
                    close: "🔒 The stairs are always open for access between floors."
                }
            },
            {
                name: 'Stairs to Upstairs',
                x: [37.9, 41.9], // 37.9% ±2%
                y: [31.6, 35.6], // 31.6% ±2%
                action: 'go_upstairs_alt',
                messages: {
                    explore: "🪜 Another access point to the upstairs. This one has a biometric scanner.",
                    use: "⬆️ You use the biometric scanner and ascend to the upstairs trading floor!",
                    take: "🪜 You can't take the stairs, but you find a security badge near the scanner.",
                    inspect: "🔍 This stairwell has advanced security: facial recognition and wallet verification.",
                    open: "🪜 You can't open the stairs, but you notice the scanner is connected to a DAO.",
                    close: "🔒 The stairs remain open for authorized personnel."
                }
            },
            {
                name: 'Front Door',
                x: [73.5, 77.5], // 73.5% ±2%
                y: [64.7, 68.7], // 64.7% ±2%
                action: 'go_frontdoor',
                messages: {
                    explore: "🚪 You examine the front door. It's the main entrance with advanced security systems.",
                    use: "🔑 You use the front door to exit to the entrance area. The security system logs your departure.",
                    take: "🚪 You can't take the door, but you find a visitor badge with an NFT signature.",
                    inspect: "🔍 The door has smart locks, QR code readers, and blockchain-based access control.",
                    open: "🟢 You open the front door. The lobby's security system acknowledges your exit.",
                    close: "🔒 You close the front door. The smart locks engage automatically."
                }
            },
            {
                name: 'Small Table Lamp',
                x: [30, 70], // range x[30-70]
                y: [40, 80], // range y[40-80]
                action: 'inspect_lamp',
                messages: {
                    explore: "💡 You examine the small table lamp. It's a smart LED lamp with crypto-themed controls.",
                    use: "⚡ You use the smart lamp. It changes color based on current Bitcoin price trends.",
                    take: "💡 You can't take the lamp, but you find a small USB drive with trading algorithms.",
                    inspect: "🔍 The lamp has a touchscreen interface showing crypto prices and market sentiment.",
                    open: "🔧 You open the lamp's control panel. It reveals a mini Ethereum node inside!",
                    close: "🔒 You close the control panel. The lamp continues its autonomous operation."
                }
            },
            {
                name: 'Plant',
                x: [92.2, 96.2], // 92.2% ±2%
                y: [88.5, 92.5], // 88.5% ±2%
                action: 'inspect_plant',
                messages: {
                    explore: "🌱 You examine the decorative plant. It's a genetically modified crypto-plant that grows NFT seeds!",
                    use: "🌿 You interact with the plant's smart irrigation system. It's connected to a DeFi protocol.",
                    take: "🌱 You can't take the plant, but you harvest a rare NFT seed pod!",
                    inspect: "🔍 The plant has sensors monitoring growth, soil quality, and token yield. Very web3!",
                    open: "🌱 You open the plant's growth chamber. It reveals a mini greenhouse with DeFi farming!",
                    close: "🔒 You close the growth chamber. The plant continues its autonomous cultivation."
                }
            },
            {
                name: 'Painting',
                x: [96.3, 100.3], // 96.3% ±2%
                y: [42.0, 46.0], // 42.0% ±2%
                action: 'inspect_painting',
                messages: {
                    explore: "🎨 You examine the painting on the wall. It's a digital artwork with embedded NFTs.",
                    use: "🎨 You interact with the painting. It comes to life with animated blockchain patterns!",
                    take: "🎨 You can't take the painting, but you scan it and receive a limited edition NFT!",
                    inspect: "🔍 The painting is a digital canvas connected to a marketplace. It changes based on market trends.",
                    open: "🎨 You can't open the painting, but you discover it has hidden compartments for storing digital art.",
                    close: "🔒 The painting's digital frame is already closed and secure."
                }
            },
            {
                name: 'Ceiling Lamp',
                x: [51.4, 55.4], // 51.4% ±2%
                y: [21.5, 25.5], // 21.5% ±2%
                action: 'inspect_ceiling_lamp',
                messages: {
                    explore: "💡 You examine the ceiling lamp. It's a sophisticated lighting system with smart controls.",
                    use: "⚡ You use the ceiling lighting system. It adjusts brightness based on portfolio performance.",
                    take: "💡 You can't take the ceiling lamp, but you find a smart bulb controller.",
                    inspect: "🔍 The ceiling lamp is connected to a DAO that votes on lighting schemes and energy usage.",
                    open: "🔧 You open the lamp's control panel. It reveals a complex network of smart contracts.",
                    close: "🔒 You close the control panel. The lighting system continues its autonomous operation."
                }
            },
            {
                name: 'Coat',
                x: [8.2, 12.2], // 8.2% ±2%
                y: [53.9, 57.9], // 53.9% ±2%
                action: 'inspect_coat',
                messages: {
                    explore: "🧥 You examine the coat hanging on the rack. It's a designer piece with crypto branding.",
                    use: "🧥 You try on the coat. It has built-in temperature sensors and connects to your wallet.",
                    take: "🧥 You can't take the coat, but you find a hardware wallet in the pocket!",
                    inspect: "🔍 The coat has smart fabric that adjusts temperature and displays portfolio stats.",
                    open: "🧥 You open the coat's pockets. They're filled with various crypto tokens and keys.",
                    close: "🔒 You close the coat's pockets. The valuable items are safely stored."
                }
            },
            {
                name: 'Hat',
                x: [16.6, 20.6], // 16.6% ±2%
                y: [37.4, 41.4], // 37.4% ±2%
                action: 'inspect_hat',
                messages: {
                    explore: "🎩 You examine the hat on the rack. It's a stylish fedora with embedded LED displays.",
                    use: "🎩 You try on the hat. It projects holographic charts and trading data above your head!",
                    take: "🎩 You can't take the hat, but you find a small USB drive with trading strategies.",
                    inspect: "🔍 The hat has micro-LEDs that display real-time crypto prices and portfolio alerts.",
                    open: "🎩 You can't open the hat, but you discover it has hidden compartments for storing keys.",
                    close: "🔒 The hat's compartments are already closed and secure."
                }
            },
            {
                name: 'Rug',
                x: [73.3, 77.3], // 73.3% ±2%
                y: [94.3, 98.3], // 94.3% ±2%
                action: 'inspect_rug',
                messages: {
                    explore: "🟢 You examine the rug on the floor. It has a QR code pattern woven into the fabric.",
                    use: "🔍 You lift the rug carefully. Underneath you find a secret trapdoor to the basement!",
                    take: "🟢 You can't take the whole rug, but you find a hidden USB drive with wallet keys!",
                    inspect: "🔍 The rug has a QR code pattern. Scanning it reveals a secret smart contract address!",
                    open: "🚪 You open the trapdoor under the rug. It leads to the underground crypto vault!",
                    close: "🔒 You close the trapdoor and replace the rug. The secret entrance is hidden again."
                }
            },
            {
                name: 'Door Peephole',
                x: [72.8, 76.8], // 72.8% ±2%
                y: [46.0, 50.0], // 46.0% ±2%
                action: 'inspect_peephole',
                messages: {
                    explore: "👁️ You examine the door peephole. It's a smart camera with facial recognition.",
                    use: "👁️ You use the peephole to look outside. It shows a live feed with crypto price overlays.",
                    take: "👁️ You can't take the peephole, but you find a small security camera lens.",
                    inspect: "🔍 The peephole has AI-powered recognition and connects to a security DAO.",
                    open: "👁️ You can't open the peephole, but you access its security feed interface.",
                    close: "🔒 The peephole's security system is already active and monitoring."
                }
            }
        ];
        
        console.log('Lobby hotspots configured:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-lobby');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Comandos específicos del lobby
    handleExploreCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.explore || `You explore the ${hotspot.name}.`, x, y);
    }

    handleUseCommand(hotspot, x, y) {
        if (hotspot.name === 'Stairs to Upstairs') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('upstairs');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('upstairs');
                }
            }, 1500);
        } else if (hotspot.name === 'Front Door') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('frontdoor');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('frontdoor');
                }
            }, 1500);
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
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LobbyScene;
} 