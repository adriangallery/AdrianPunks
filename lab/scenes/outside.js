// Outside Scene - Escena exterior (primera escena del juego)
class OutsideScene extends BaseScene {
    constructor() {
        super('outside', 'Outside');
        this.imagePath = 'scenes/images/outside.png';
        this.overlayText = {
            title: 'Outside AdrianLAB',
            subtitle: 'The adventure begins...'
        };
        console.log('OutsideScene constructor called with overlayText:', this.overlayText);
    }

    setupHotspots() {
        console.log('OutsideScene setupHotspots called');
        // Hotspots actualizados con mensajes en inglés, fun style, web3 themed
        this.hotspots = [
            {
                name: 'Front Door',
                x: [51.1, 55.1],
                y: [85.4, 89.4],
                action: 'enter_building',
                messages: {
                    explore: "🚪 You see the main entrance to AdrianLAB. Feels like the gateway to the metaverse!",
                    use: "🔑 Unlocking the door... Welcome to the blockchain lair!",
                    take: "🤔 You can't take the whole door, but you find a mysterious NFT key under the mat!",
                    inspect: "🧐 It's a solid door with a QR code sticker. Maybe it opens more than just this building...",
                    open: "🟢 The door swings open with a satisfying click. Enter if you dare!",
                    close: "🔒 The door is already closed. Security is tight in web3!"
                }
            },
            {
                name: 'Front Door',
                x: [53.4, 55.4],
                y: [95.3, 97.3],
                action: 'enter_building',
                messages: {
                    explore: "🚪 You see the main entrance to AdrianLAB. Feels like the gateway to the metaverse!",
                    use: "🔑 Unlocking the door... Welcome to the blockchain lair!",
                    take: "🤔 You can't take the whole door, but you find a mysterious NFT key under the mat!",
                    inspect: "🧐 It's a solid door with a QR code sticker. Maybe it opens more than just this building...",
                    open: "🟢 The door swings open with a satisfying click. Enter if you dare!",
                    close: "🔒 The door is already closed. Security is tight in web3!"
                }
            },
            {
                name: 'Front Door',
                x: [52.8, 54.8],
                y: [94.8, 96.8],
                action: 'enter_building',
                messages: {
                    explore: "🚪 You see the main entrance to AdrianLAB. Feels like the gateway to the metaverse!",
                    use: "🔑 Unlocking the door... Welcome to the blockchain lair!",
                    take: "🤔 You can't take the whole door, but you find a mysterious NFT key under the mat!",
                    inspect: "🧐 It's a solid door with a QR code sticker. Maybe it opens more than just this building...",
                    open: "🟢 The door swings open with a satisfying click. Enter if you dare!",
                    close: "🔒 The door is already closed. Security is tight in web3!"
                }
            },
            {
                name: 'Front Door',
                x: [54.3, 56.3],
                y: [81.4, 83.4],
                action: 'enter_building',
                messages: {
                    explore: "🚪 You see the main entrance to AdrianLAB. Feels like the gateway to the metaverse!",
                    use: "🔑 Unlocking the door... Welcome to the blockchain lair!",
                    take: "🤔 You can't take the whole door, but you find a mysterious NFT key under the mat!",
                    inspect: "🧐 It's a solid door with a QR code sticker. Maybe it opens more than just this building...",
                    open: "🟢 The door swings open with a satisfying click. Enter if you dare!",
                    close: "🔒 The door is already closed. Security is tight in web3!"
                }
            },
            // Sky - three points
            {
                name: 'Sky',
                x: [16.3, 20.3],
                y: [26.4, 30.4],
                messages: {
                    explore: "🌌 The sky is full of stars... and maybe some hidden tokens!",
                    use: "🚀 You try to use the sky. You feel bullish!",
                    take: "🌠 You try to grab a star. It turns into a pixelated NFT!",
                    inspect: "🔭 You spot a constellation shaped like a crypto wallet.",
                    open: "✨ You can't open the sky, but you can open your mind!",
                    close: "☁️ The sky can't be closed. It's decentralized!"
                }
            },
            {
                name: 'Sky',
                x: [41.5, 45.5],
                y: [28.9, 32.9],
                messages: {
                    explore: "🌌 The sky is full of stars... and maybe some hidden tokens!",
                    use: "🚀 You try to use the sky. You feel bullish!",
                    take: "🌠 You try to grab a star. It turns into a pixelated NFT!",
                    inspect: "🔭 You spot a constellation shaped like a crypto wallet.",
                    open: "✨ You can't open the sky, but you can open your mind!",
                    close: "☁️ The sky can't be closed. It's decentralized!"
                }
            },
            {
                name: 'Sky',
                x: [3.5, 7.5],
                y: [25.3, 29.3],
                messages: {
                    explore: "🌌 The sky is full of stars... and maybe some hidden tokens!",
                    use: "🚀 You try to use the sky. You feel bullish!",
                    take: "🌠 You try to grab a star. It turns into a pixelated NFT!",
                    inspect: "🔭 You spot a constellation shaped like a crypto wallet.",
                    open: "✨ You can't open the sky, but you can open your mind!",
                    close: "☁️ The sky can't be closed. It's decentralized!"
                }
            },
            // Street Light - two points
            {
                name: 'Street Light',
                x: [87.3, 91.3],
                y: [24.6, 28.6],
                messages: {
                    explore: "💡 A street light flickers, like ETH gas fees at rush hour.",
                    use: "🔌 You try to use the street light. It flashes in Morse code: 'HODL'.",
                    take: "🪙 You try to take the bulb. It airdrops a tiny amount of $LIGHT token!",
                    inspect: "👀 The lamp post has a sticker: 'Not your keys, not your light.'",
                    open: "🔦 You open the lamp cover. There's a QR code inside!",
                    close: "💤 The light dims, but never truly goes off on-chain."
                }
            },
            {
                name: 'Street Light',
                x: [87.6, 91.6],
                y: [46.2, 50.2],
                messages: {
                    explore: "💡 A street light flickers, like ETH gas fees at rush hour.",
                    use: "🔌 You try to use the street light. It flashes in Morse code: 'HODL'.",
                    take: "🪙 You try to take the bulb. It airdrops a tiny amount of $LIGHT token!",
                    inspect: "👀 The lamp post has a sticker: 'Not your keys, not your light.'",
                    open: "🔦 You open the lamp cover. There's a QR code inside!",
                    close: "💤 The light dims, but never truly goes off on-chain."
                }
            },
            // Window
            {
                name: 'Window',
                x: [35.5, 39.5],
                y: [78.9, 82.9],
                messages: {
                    explore: "🪟 You peek through the window. Someone's minting NFTs inside!",
                    use: "🖱️ You tap the window. It displays a 'Connect Wallet' prompt!",
                    take: "💎 You try to take the window. It turns into a transparent NFT frame!",
                    inspect: "🔍 The glass is covered in cryptic seed phrases.",
                    open: "🪟 You slide the window open. A cool breeze brings the smell of fresh blocks.",
                    close: "🪟 The window is already closed. Security first!"
                }
            },
            // Secondary Window
            {
                name: 'Secondary Window',
                x: [6.8, 8.8],
                y: [78.3, 80.3],
                messages: {
                    explore: "🪟 You peek through the secondary window. There's a different kind of magic happening here!",
                    use: "🖱️ You tap the secondary window. It shows a different DeFi protocol interface!",
                    take: "💎 You try to take this window too. It's a rare NFT window frame!",
                    inspect: "🔍 This window has different seed phrases. Maybe it's a backup wallet?",
                    open: "🪟 You slide the secondary window open. A different blockchain breeze flows in.",
                    close: "🪟 The secondary window is already closed. Double security!"
                }
            },
            // Garage Door
            {
                name: 'Garage Door',
                x: [67.7, 71.7],
                y: [86.5, 90.5],
                messages: {
                    explore: "🚗 A big garage door. Maybe there's a Lambo inside!",
                    use: "🔑 You try to use the garage door. It asks for a multi-sig signature!",
                    take: "🚙 You try to take the garage. That's not how NFTs work... yet!",
                    inspect: "🔧 The door has a sticker: 'Mint or Die'.",
                    open: "🚪 You open the garage door. It's full of pixelated Lambos!",
                    close: "🚪 The garage door closes with a satisfying on-chain sound."
                }
            }
        ];
        console.log('OutsideScene hotspots configurados:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-outside');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos del outside
    handleExploreCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.explore || `You explore the ${hotspot.name}.`, x, y);
    }

    handleUseCommand(hotspot, x, y) {
        if (hotspot.name === 'Front Door') {
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
        showFloatingText(hotspot.messages?.take || `You try to take the ${hotspot.name}.`, x, y);
    }

    handleInspectCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.inspect || `You inspect the ${hotspot.name}.`, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.open || `You try to open the ${hotspot.name}.`, x, y);
    }

    handleCloseCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.close || `You try to close the ${hotspot.name}.`, x, y);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OutsideScene;
} 