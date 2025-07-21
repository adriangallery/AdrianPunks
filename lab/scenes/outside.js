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
        // Definir clickable areas (hotspots) para outside
        // Usar modo TEST para configurar coordenadas exactas
        this.hotspots = [
            {
                name: 'Front Door',
                x: [50, 56],  // Moved to 53.1%, 57.2%
                y: [55, 60],
                action: 'enter_building',
                message: "💬 The main entrance to AdrianLAB. The door looks inviting."
            },
            {
                name: 'Street Light',
                x: [68, 88],  // Changed from Mountain View to Street Light
                y: [18, 38],
                action: 'inspect_streetlight',
                message: "💬 A tall street light illuminates the area. It flickers occasionally."
            },
            {
                name: 'Window',
                x: [35, 40],  // New hotspot at 37.3%, 56.4%
                y: [54, 59],
                action: 'inspect_window',
                message: "💬 A window with drawn curtains. You can see a faint light inside."
            },
            {
                name: 'Sky',
                x: [44, 49],  // New hotspot at 46.5%, 38.0%
                y: [36, 41],
                action: 'inspect_sky',
                message: "💬 The sky is dark with scattered stars. A full moon casts shadows."
            },
            {
                name: 'Path',
                x: [20, 40],
                y: [70, 90],
                action: 'inspect_path',
                message: "💬 A winding path leading somewhere mysterious."
            }
        ];
        console.log('OutsideScene hotspots configured:', this.hotspots);
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-outside');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos del outside
    handleUseCommand(hotspot, x, y) {
        console.log(`USE command on: ${hotspot.name}`);
        
        switch (hotspot.name) {
            case 'Front Door':
                showFloatingText('💬 You open the door and enter AdrianLAB...', x, y);
                setTimeout(() => {
                    // Ir a la escena frontdoor en lugar del basement
                    if (typeof sceneManager !== 'undefined' && typeof sceneManager.loadScene === 'function') {
                        console.log('Using SceneManager to load frontdoor scene');
                        sceneManager.loadScene('frontdoor');
                    } else if (typeof sceneManagerV2 !== 'undefined' && typeof sceneManagerV2.loadScene === 'function') {
                        console.log('Using SceneManagerV2 to load frontdoor scene');
                        sceneManagerV2.loadScene('frontdoor');
                    } else {
                        // Fallback si no hay sceneManager
                        console.log('No scene manager available, using fallback');
                        goToMainScreen();
                    }
                }, 1500);
                break;
                
            default:
                showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
        }
    }

    handleInspectCommand(hotspot, x, y) {
        console.log(`INSPECT command on: ${hotspot.name}`);
        
        const inspectionMessages = {
            'Front Door': '💬 A solid wooden door with a brass handle. There\'s a small sign that reads "AdrianLAB - Enter at your own risk".',
            'Street Light': '💬 The street light is made of metal and has a bright bulb. It provides good illumination for the area.',
            'Window': '💬 The window has thick curtains that block most of the view inside. You can see a faint glow.',
            'Sky': '💬 The night sky is clear with many stars visible. The moon provides a soft, eerie light.',
            'Path': '💬 The path is made of old cobblestones and leads into the forest. It looks well-traveled.'
        };
        
        const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        console.log(`TAKE command on: ${hotspot.name}`);
        
        const takeableItems = {
            'Front Door': '💬 You can\'t take the door, but you find a key under the doormat.',
            'Street Light': '💬 You can\'t take the street light, but you find a broken light bulb on the ground.',
            'Window': '💬 You can\'t take the window, but you find a small pebble that could break it.',
            'Sky': '💬 You can\'t take the sky, but you find a fallen star (actually just a piece of glass).',
            'Path': '💬 You can\'t take the path, but you find an old coin on the ground.'
        };
        
        const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
        showFloatingText(message, x, y);
    }



    handleOpenCommand(hotspot, x, y) {
        console.log(`OPEN command on: ${hotspot.name}`);
        
        const openResponses = {
            'Front Door': '💬 You try to open the door but it\'s locked. Use the USE command instead.',
            'Street Light': '💬 You can\'t open the street light, it\'s not a container.',
            'Window': '💬 You try to open the window but it\'s locked from the inside.',
            'Sky': '💬 You can\'t open the sky, it\'s not a container.',
            'Path': '💬 You can\'t open the path, it\'s not a container.'
        };
        
        const message = openResponses[hotspot.name] || `💬 You can\'t open ${hotspot.name}`;
        showFloatingText(message, x, y);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OutsideScene;
} 