// Basement Scene - Escena del sótano
class BasementScene extends BaseScene {
    constructor() {
        super('basement', 'Basement');
        this.imagePath = 'scenes/images/basement.png';
        this.overlayText = {
            title: 'AdrianLAB',
            subtitle: 'Click to continue...'
        };
    }

    setupHotspots() {
        // Definir clickable areas (hotspots) basados en basement.png layout
        // Expanded margins from 15% to 20% for better clickability
        this.hotspots = [
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
                action: 'inspect_stairs',
                message: "💬 Do you really want to go upstairs? That's where the fiat lives."
            },
            {
                name: 'Computer Area',
                x: [13, 38],
                y: [39, 64],
                action: 'inspect_computer',
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
        ];
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-basement');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos del basement
    handleUseCommand(hotspot, x, y) {
        console.log(`USE command on: ${hotspot.name}`);
        
        switch (hotspot.name) {
            case 'Computer Area':
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
                break;
                
            case 'Stairs Area':
                // Navigate to upstairs (anywhere in stairs area with USE command)
                showFloatingText('💬 Going upstairs...', x, y);
                setTimeout(() => {
                    goToUpstairs();
                }, 1000);
                break;
                
            default:
                showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
        }
    }

    handleInspectCommand(hotspot, x, y) {
        console.log(`INSPECT command on: ${hotspot.name}`);
        
        // Show detailed inspection message
        const inspectionMessages = {
            'Desk Area': '💬 A cluttered desk with papers, coffee stains, and a broken keyboard. The monitor shows a terminal with scrolling text.',
            'Boxes Area': '💬 Cardboard boxes stacked haphazardly. One is labeled "Failed Projects 2021" and another "Bored Ape Piñata - DO NOT OPEN".',
            'Armchair Area': '💬 A worn leather armchair with suspicious stains. There\'s a wallet on the seat with $12 in it.',
            'Washing Machine Area': '💬 An old washing machine with a "Socks Only" sign. The drum is spinning slowly.',
            'Stairs Area': '💬 Wooden stairs leading up. They creak ominously. The top 5% seems to be the trigger point.',
            'Computer Area': '💬 An ancient computer with a CRT monitor. The screen shows a terminal with "BTC: $12" and "Status: Rage Quit".',
            'Light Bulb Area': '💬 A single light bulb hanging from the ceiling. It flickers occasionally.',
            'Windows Area': '💬 Dirty windows showing the dark outside. You can see your reflection in the glass.'
        };
        
        const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        console.log(`TAKE command on: ${hotspot.name}`);
        
        const takeableItems = {
            'Desk Area': '💬 You can\'t take the desk, but you find a USB drive with "Important Stuff" written on it.',
            'Boxes Area': '💬 The boxes are too heavy to carry, but you find a small key in one of them.',
            'Armchair Area': '💬 You can\'t take the armchair, but you find $12 in the wallet.',
            'Washing Machine Area': '💬 You can\'t take the washing machine, but you find a sock with a hole in it.',
            'Stairs Area': '💬 You can\'t take the stairs, but you find a loose nail.',
            'Computer Area': '💬 You can\'t take the computer, but you find a floppy disk.',
            'Light Bulb Area': '💬 You can\'t take the light bulb, but you find a dead fly.',
            'Windows Area': '💬 You can\'t take the windows, but you find a spider web.'
        };
        
        const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTalkCommand(hotspot, x, y) {
        console.log(`TALK command on: ${hotspot.name}`);
        
        const talkResponses = {
            'Desk Area': '💬 "Hello desk!" - No response. It\'s just a desk.',
            'Boxes Area': '💬 "Hello boxes!" - You hear a faint rustling sound.',
            'Armchair Area': '💬 "Hello chair!" - The chair remains silent.',
            'Washing Machine Area': '💬 "Hello washing machine!" - It continues spinning.',
            'Stairs Area': '💬 "Hello stairs!" - They creak in response.',
            'Computer Area': '💬 "Hello computer!" - The terminal beeps.',
            'Light Bulb Area': '💬 "Hello light bulb!" - It flickers.',
            'Windows Area': '💬 "Hello windows!" - Your echo bounces back.'
        };
        
        const message = talkResponses[hotspot.name] || `💬 You talk to ${hotspot.name} but get no response`;
        showFloatingText(message, x, y);
    }

    handleMoveCommand(hotspot, x, y) {
        console.log(`MOVE command on: ${hotspot.name}`);
        
        const moveResponses = {
            'Desk Area': '💬 The desk is too heavy to move.',
            'Boxes Area': '💬 You try to move the boxes but they\'re stuck.',
            'Armchair Area': '💬 You move the armchair slightly. It makes a scraping sound.',
            'Washing Machine Area': '💬 The washing machine is bolted to the floor.',
            'Stairs Area': '💬 You can\'t move the stairs, but you can climb them.',
            'Computer Area': '💬 The computer is too heavy to move.',
            'Light Bulb Area': '💬 You can\'t move the light bulb, it\'s attached to the ceiling.',
            'Windows Area': '💬 You can\'t move the windows, they\'re part of the wall.'
        };
        
        const message = moveResponses[hotspot.name] || `💬 You can\'t move ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        console.log(`OPEN command on: ${hotspot.name}`);
        
        const openResponses = {
            'Desk Area': '💬 You open the desk drawer and find some old receipts.',
            'Boxes Area': '💬 You open one of the boxes and find failed NFT projects.',
            'Armchair Area': '💬 You can\'t open the armchair, it\'s not a container.',
            'Washing Machine Area': '💬 You open the washing machine door. It\'s full of socks.',
            'Stairs Area': '💬 You can\'t open the stairs, they\'re not a container.',
            'Computer Area': '💬 You open the computer case and find dust.',
            'Light Bulb Area': '💬 You can\'t open the light bulb, it\'s not a container.',
            'Windows Area': '💬 You try to open the windows but they\'re stuck.'
        };
        
        const message = openResponses[hotspot.name] || `💬 You can\'t open ${hotspot.name}`;
        showFloatingText(message, x, y);
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