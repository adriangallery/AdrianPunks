// Outside Scene - Escena exterior (primera escena del juego)
class OutsideScene extends BaseScene {
    constructor() {
        super('outside', 'Outside');
        this.imagePath = 'scenes/images/outside.png';
        this.overlayText = {
            title: 'Outside AdrianLAB',
            subtitle: 'The adventure begins...'
        };
    }

    setupHotspots() {
        // Definir clickable areas (hotspots) para outside
        // Usar modo TEST para configurar coordenadas exactas
        this.hotspots = [
            {
                name: 'Front Door',
                x: [40, 60],
                y: [60, 80],
                action: 'enter_building',
                message: "💬 The main entrance to AdrianLAB. The door looks inviting."
            },
            {
                name: 'Mountain View',
                x: [70, 90],
                y: [20, 40],
                action: 'inspect_mountain',
                message: "💬 Majestic mountains in the distance. They seem to hold secrets."
            },
            {
                name: 'Path',
                x: [20, 40],
                y: [70, 90],
                action: 'inspect_path',
                message: "💬 A winding path leading somewhere mysterious."
            }
        ];
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
                    if (window.sceneManager) {
                        window.sceneManager.loadScene('frontdoor');
                    } else {
                        // Fallback si no hay sceneManager
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
            'Mountain View': '💬 The mountains are covered in snow and seem to stretch forever. You can see some strange lights in the distance.',
            'Path': '💬 The path is made of old cobblestones and leads into the forest. It looks well-traveled.'
        };
        
        const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        console.log(`TAKE command on: ${hotspot.name}`);
        
        const takeableItems = {
            'Front Door': '💬 You can\'t take the door, but you find a key under the doormat.',
            'Mountain View': '💬 You can\'t take the mountains, but you find a small rock with strange markings.',
            'Path': '💬 You can\'t take the path, but you find an old coin on the ground.'
        };
        
        const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTalkCommand(hotspot, x, y) {
        console.log(`TALK command on: ${hotspot.name}`);
        
        const talkResponses = {
            'Front Door': '💬 "Hello door!" - The door remains silent, but you hear faint music from inside.',
            'Mountain View': '💬 "Hello mountains!" - Your voice echoes back from the peaks.',
            'Path': '💬 "Hello path!" - The path doesn\'t respond, but you hear rustling in the bushes.'
        };
        
        const message = talkResponses[hotspot.name] || `💬 You talk to ${hotspot.name} but get no response`;
        showFloatingText(message, x, y);
    }

    handleMoveCommand(hotspot, x, y) {
        console.log(`MOVE command on: ${hotspot.name}`);
        
        const moveResponses = {
            'Front Door': '💬 The door is too heavy to move.',
            'Mountain View': '💬 You can\'t move the mountains, they\'re too big.',
            'Path': '💬 You can\'t move the path, it\'s part of the ground.'
        };
        
        const message = moveResponses[hotspot.name] || `💬 You can\'t move ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        console.log(`OPEN command on: ${hotspot.name}`);
        
        const openResponses = {
            'Front Door': '💬 You try to open the door but it\'s locked. Use the USE command instead.',
            'Mountain View': '💬 You can\'t open the mountains, they\'re not a container.',
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