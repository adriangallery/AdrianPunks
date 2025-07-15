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
        // Definir clickable areas (hotspots) para frontdoor
        // Usar modo TEST para configurar coordenadas exactas
        this.hotspots = [
            {
                name: 'Main Hall',
                x: [30, 70],
                y: [40, 80],
                action: 'enter_hall',
                message: "💬 The main hall of AdrianLAB. You can see various doors leading to different areas."
            },
            {
                name: 'Reception Desk',
                x: [10, 30],
                y: [20, 40],
                action: 'inspect_reception',
                message: "💬 An old wooden reception desk with a computer terminal."
            },
            {
                name: 'Exit Door',
                x: [70, 90],
                y: [80, 95],
                action: 'exit_building',
                message: "💬 The door back to the outside world."
            },
            {
                name: 'Stairs Down',
                x: [40, 60],
                y: [80, 95],
                action: 'go_basement',
                message: "💬 Stairs leading down to the basement laboratory."
            }
        ];
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-frontdoor');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos del frontdoor
    handleUseCommand(hotspot, x, y) {
        console.log(`USE command on: ${hotspot.name}`);
        
        switch (hotspot.name) {
            case 'Main Hall':
                showFloatingText('💬 You walk into the main hall...', x, y);
                setTimeout(() => {
                    // Aquí iría la transición a la escena del hall principal
                    // Por ahora vamos al basement como placeholder
                    goToMainScreen();
                }, 1500);
                break;
                
            case 'Exit Door':
                showFloatingText('💬 You exit AdrianLAB and return to the outside...', x, y);
                setTimeout(() => {
                    // Volver a la escena outside
                    if (typeof sceneManager !== 'undefined') {
                        sceneManager.loadScene('outside');
                    }
                }, 1500);
                break;
                
            case 'Stairs Down':
                showFloatingText('💬 You descend the stairs to the basement...', x, y);
                setTimeout(() => {
                    goToMainScreen(); // Ir al basement
                }, 1500);
                break;
                
            default:
                showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
        }
    }

    handleInspectCommand(hotspot, x, y) {
        console.log(`INSPECT command on: ${hotspot.name}`);
        
        const inspectionMessages = {
            'Main Hall': '💬 A spacious hall with high ceilings. The walls are covered with scientific posters and schematics. You can hear the hum of machinery from below.',
            'Reception Desk': '💬 The desk has an old CRT monitor displaying a login screen. There\'s a guest book and some brochures about AdrianLAB\'s research.',
            'Exit Door': '💬 A heavy metal door with security features. There\'s a sign that reads "Authorized Personnel Only" but it\'s crossed out.',
            'Stairs Down': '💬 Metal stairs leading down to the basement. You can see flickering lights and hear strange sounds coming from below.'
        };
        
        const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        console.log(`TAKE command on: ${hotspot.name}`);
        
        const takeableItems = {
            'Main Hall': '💬 You can\'t take the hall, but you find a visitor badge on the floor.',
            'Reception Desk': '💬 You can\'t take the desk, but you find a key card in the drawer.',
            'Exit Door': '💬 You can\'t take the door, but you find a security manual nearby.',
            'Stairs Down': '💬 You can\'t take the stairs, but you find a flashlight on the railing.'
        };
        
        const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTalkCommand(hotspot, x, y) {
        console.log(`TALK command on: ${hotspot.name}`);
        
        const talkResponses = {
            'Main Hall': '💬 "Hello hall!" - Your voice echoes through the empty space.',
            'Reception Desk': '💬 "Hello desk!" - The computer terminal beeps in response.',
            'Exit Door': '💬 "Hello door!" - The door remains silent.',
            'Stairs Down': '💬 "Hello stairs!" - You hear a distant echo from below.'
        };
        
        const message = talkResponses[hotspot.name] || `💬 You talk to ${hotspot.name} but get no response`;
        showFloatingText(message, x, y);
    }

    handleMoveCommand(hotspot, x, y) {
        console.log(`MOVE command on: ${hotspot.name}`);
        
        const moveResponses = {
            'Main Hall': '💬 You can\'t move the hall, it\'s part of the building.',
            'Reception Desk': '💬 The desk is bolted to the floor and too heavy to move.',
            'Exit Door': '💬 The door is too heavy to move.',
            'Stairs Down': '💬 You can\'t move the stairs, they\'re part of the building structure.'
        };
        
        const message = moveResponses[hotspot.name] || `💬 You can\'t move ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        console.log(`OPEN command on: ${hotspot.name}`);
        
        const openResponses = {
            'Main Hall': '💬 You can\'t open the hall, it\'s not a container.',
            'Reception Desk': '💬 You open the desk drawer and find some office supplies.',
            'Exit Door': '💬 You try to open the exit door but it\'s locked from the outside.',
            'Stairs Down': '💬 You can\'t open the stairs, they\'re not a container.'
        };
        
        const message = openResponses[hotspot.name] || `💬 You can\'t open ${hotspot.name}`;
        showFloatingText(message, x, y);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrontDoorScene;
} 