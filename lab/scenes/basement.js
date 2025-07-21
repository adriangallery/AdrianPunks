// Basement Scene - Escena del sótano
class BasementScene extends BaseScene {
    constructor() {
        super('basement', 'Basement');
        this.imagePath = 'scenes/images/basement.png';
        this.overlayText = {
            title: 'AdrianLAB Basement',
            subtitle: 'The underground laboratory...'
        };
    }

    setupHotspots() {
        console.log('Setting up Basement hotspots...');
        
        // Definir clickable areas (hotspots) basados en basement.png layout
        this.hotspots = [
            {
                name: 'Desk Area',
                x: [35, 60],
                y: [75, 100],
                action: 'inspect_desk_area',
                messages: {
                    explore: "🖥️ You examine the basement desk area. It's cluttered with papers and coffee stains.",
                    use: "💻 You use the desk's terminal. It shows a basic mining operation running.",
                    take: "📱 You can't take the desk, but you find a broken keyboard and some old receipts.",
                    inspect: "🔍 The desk has a single monitor showing a terminal with 'BTC: $12' and 'Status: Rage Quit'.",
                    open: "🗄️ You open the desk drawer and find some old receipts and a floppy disk.",
                    close: "🔒 You close the desk drawer. The old receipts are safely stored."
                }
            },
            {
                name: 'Boxes Area',
                x: [66, 91],
                y: [60, 85],
                action: 'inspect_boxes',
                messages: {
                    explore: "📦 You explore the boxes area. These contain failed NFT projects and old equipment.",
                    use: "🎁 You interact with the boxes. One contains a 'Bored Ape Piñata - DO NOT OPEN'.",
                    take: "💎 You can't take all the boxes, but you find a small key in one of them.",
                    inspect: "🔍 The boxes are labeled with project names: 'Failed Projects 2021', 'Rug Pull Victims'.",
                    open: "📦 You open a box and find failed NFT projects and broken dreams.",
                    close: "🔒 You close the box. The failed projects remain hidden."
                }
            },
            {
                name: 'Armchair Area',
                x: [75, 100],
                y: [74, 99],
                action: 'inspect_armchair',
                messages: {
                    explore: "🪑 You examine the worn armchair. It has suspicious stains and looks like a throne.",
                    use: "🪑 You sit in the armchair. It's uncomfortable and smells like regret.",
                    take: "🪑 You can't take the armchair, but you find $12 in a wallet on the seat.",
                    inspect: "🔍 The armchair has seen better days. There's a wallet with $12 in it.",
                    open: "🪑 You can't open the armchair, but you discover it has hidden compartments.",
                    close: "🔒 The armchair's compartments are already closed."
                }
            },
            {
                name: 'Washing Machine Area',
                x: [58, 83],
                y: [59, 84],
                action: 'inspect_washing_machine',
                messages: {
                    explore: "🧺 You examine the old washing machine. It has a 'Socks Only' sign.",
                    use: "⚡ You use the washing machine. It's spinning slowly with a load of socks.",
                    take: "🧺 You can't take the washing machine, but you find a sock with a hole in it.",
                    inspect: "🔍 The washing machine is old and basic. Perfect for laundering socks.",
                    open: "🚪 You open the washing machine door. It's full of socks.",
                    close: "🔒 You close the washing machine door. The socks continue washing."
                }
            },
            {
                name: 'Stairs Area',
                x: [0, 20],
                y: [29, 54],
                action: 'inspect_stairs',
                messages: {
                    explore: "🪜 You examine the stairs leading up. They creak ominously.",
                    use: "⬆️ You use the stairs to go upstairs. The wooden steps guide your way up!",
                    take: "🪜 You can't take the stairs, but you find a loose nail.",
                    inspect: "🔍 The stairs are basic wooden steps. They creak when you walk on them.",
                    open: "🪜 You can't open the stairs, but you notice they're well-worn.",
                    close: "🔒 The stairs are always open for access between floors."
                }
            },
            {
                name: 'Computer Area',
                x: [13, 38],
                y: [39, 64],
                action: 'inspect_computer',
                messages: {
                    explore: "💻 You examine the basement computer. It's an ancient setup with a CRT monitor.",
                    use: "🖥️ You use the computer. It's running a basic mining operation.",
                    take: "💻 You can't take the computer, but you find a floppy disk.",
                    inspect: "🔍 The computer has a CRT monitor showing 'BTC: $12' and 'Status: Rage Quit'.",
                    open: "🔧 You open the computer case and find dust.",
                    close: "🔒 You close the computer case. The mining operation continues."
                }
            },
            {
                name: 'Light Bulb Area',
                x: [38, 63],
                y: [0, 20],
                action: 'inspect_light_bulb',
                messages: {
                    explore: "💡 You examine the light bulb. It's a single bulb hanging from the ceiling.",
                    use: "⚡ You use the light switch. The bulb flickers occasionally.",
                    take: "💡 You can't take the light bulb, but you find a dead fly.",
                    inspect: "🔍 The light bulb is basic and flickers. It's lit, unlike your portfolio.",
                    open: "🔧 You can't open the light bulb, it's not designed for that.",
                    close: "🔒 The light bulb continues to flicker and illuminate."
                }
            },
            {
                name: 'Windows Area',
                x: [41, 66],
                y: [27, 52],
                action: 'inspect_windows',
                messages: {
                    explore: "🪟 You examine the basement windows. They're dirty and show the dark outside.",
                    use: "🪟 You try to use the windows. They're stuck and don't open easily.",
                    take: "🪟 You can't take the windows, but you find a spider web.",
                    inspect: "🔍 The windows are dirty and show the dark outside. You can see your reflection.",
                    open: "🪟 You try to open the windows but they're stuck.",
                    close: "🔒 The windows are already closed and stuck."
                }
            }
        ];
        
        console.log('Basement hotspots configured:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-basement');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Comandos específicos del basement
    handleExploreCommand(hotspot, x, y) {
        showFloatingText(hotspot.messages?.explore || `You explore the ${hotspot.name}.`, x, y);
    }

    handleUseCommand(hotspot, x, y) {
        if (hotspot.name === 'Stairs Area') {
            showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
            setTimeout(() => {
                if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                    sceneManager.loadScene('upstairs');
                } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                    sceneManagerV2.loadScene('upstairs');
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
        
        console.log(`Basement click at: ${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%`);
        
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
    module.exports = BasementScene;
} 