// Front Door Scene - Escena de la entrada principal
class FrontDoorScene extends BaseScene {
    constructor() {
        super('frontdoor', 'Front Door');
        this.imagePath = 'scenes/images/frontdoor.png';
        this.overlayText = {
            title: 'AdrianLAB Entrance',
            subtitle: 'Welcome to the laboratory...'
        };
    }

    setupHotspots() {
        console.log('Setting up FrontDoor hotspots...');
        
        // Definir clickable areas (hotspots) para frontdoor
        this.hotspots = [
            {
                name: 'Left Side Exit',
                x: [0, 25], // Todo el lateral izquierdo (0-25%)
                y: [0, 100], // De arriba a abajo (0-100%)
                action: 'exit_to_outside',
                messages: {
                    explore: "🚪 You look towards the left side. There's an exit leading back to the outside world.",
                    use: "🚶 You use the exit and step back outside. The fresh air of the blockchain awaits!",
                    take: "🤔 You can't take the exit, but you grab a souvenir on your way out!",
                    inspect: "🔍 The exit leads back to the AdrianLAB exterior. It's always open for visitors.",
                    open: "🚪 The exit is already open. You can leave anytime you want!",
                    close: "🔒 You can't close this exit. It's a public access point."
                }
            },
            {
                name: 'Front Door',
                x: [30, 70], // range x[30-70]
                y: [40, 80], // range y[40-80]
                action: 'enter_lobby',
                messages: {
                    explore: "🚪 You examine the main entrance. It's a high-tech door with biometric scanners and QR code readers.",
                    use: "🔑 You use the front door's smart lock. The blockchain verification completes and you enter the lobby!",
                    take: "🤔 You can't take the door, but you find a digital key card with an NFT signature!",
                    inspect: "🔍 The door has advanced security: facial recognition, wallet verification, and gas fee payment system.",
                    open: "🟢 The door slides open smoothly. The lobby awaits with its web3 wonders!",
                    close: "🔒 The door is already closed and secured with smart contract locks."
                }
            },
            {
                name: 'Exterior Light',
                x: [10, 30], // range x[10-30]
                y: [20, 40], // range y[20-40]
                action: 'inspect_light',
                messages: {
                    explore: "💡 You notice the exterior lighting system. It's powered by solar panels and connected to a DeFi grid.",
                    use: "⚡ You toggle the smart lighting. It adjusts based on current gas prices and energy market conditions.",
                    take: "💡 You can't take the light fixture, but you find a small LED with a crypto mining chip inside!",
                    inspect: "🔍 The light uses blockchain-based energy trading. It's mining while illuminating!",
                    open: "🔧 You open the light's control panel. It reveals a mini Ethereum node!",
                    close: "🔒 You close the control panel. The light continues its autonomous operation."
                }
            },
            {
                name: 'Plant',
                x: [70, 90], // range x[70-90]
                y: [80, 95], // range y[80-95]
                action: 'inspect_plant',
                messages: {
                    explore: "🌱 You examine the decorative plant. It's a genetically modified crypto-plant that grows NFT seeds!",
                    use: "🌿 You interact with the plant's smart irrigation system. It's connected to a DAO for water management.",
                    take: "🌱 You can't take the whole plant, but you harvest a rare NFT seed pod!",
                    inspect: "🔍 The plant has sensors monitoring growth, soil quality, and token yield. Very web3!",
                    open: "🌱 You open the plant's growth chamber. It reveals a mini greenhouse with DeFi farming!",
                    close: "🔒 You close the growth chamber. The plant continues its autonomous cultivation."
                }
            },
            {
                name: 'Plant',
                x: [11.5, 15.5], // 11.5% ±2%
                y: [82.8, 86.8], // 82.8% ±2%
                action: 'inspect_plant2',
                messages: {
                    explore: "🌿 Another crypto-plant! This one specializes in yield farming and liquidity provision.",
                    use: "🌱 You activate the plant's staking mechanism. It starts earning rewards automatically!",
                    take: "🌿 You can't take this plant either, but you collect some staking rewards in token form!",
                    inspect: "🔍 This plant is part of a larger DeFi ecosystem. It's cross-pollinating with other crypto-plants!",
                    open: "🌱 You open the plant's reward vault. It's filled with various DeFi tokens!",
                    close: "🔒 You close the reward vault. The plant continues its yield farming operations."
                }
            },
            {
                name: 'RUG',
                x: [51.6, 55.6], // 51.6% ±2%
                y: [97.9, 101.9], // 97.9% ±2%
                action: 'inspect_rug',
                messages: {
                    explore: "🟢 You notice a suspicious rug on the floor. It looks like it might be hiding something...",
                    use: "🔍 You lift the rug carefully. Underneath you find a secret trapdoor to the basement!",
                    take: "🟢 You can't take the whole rug, but you find a hidden USB drive with wallet keys!",
                    inspect: "🔍 The rug has a QR code pattern. Scanning it reveals a secret smart contract address!",
                    open: "🚪 You open the trapdoor under the rug. It leads to the underground crypto vault!",
                    close: "🔒 You close the trapdoor and replace the rug. The secret entrance is hidden again."
                }
            }
        ];
        
        console.log('FrontDoor hotspots configured:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-frontdoor');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Comandos específicos del frontdoor
    handleExploreCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.explore || `You explore the ${hotspot.name}.`, x, y);
    }

    handleUseCommand(hotspot, x, y) {
        if (hotspot.name === 'Front Door') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('lobby');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('lobby');
                }
            }, 1500); // Short delay before scene change
        } else if (hotspot.name === 'Left Side Exit') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('outside');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('outside');
                }
            }, 1500); // Short delay before scene change
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
    module.exports = FrontDoorScene;
} 