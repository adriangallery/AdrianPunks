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

    handleCloseCommand(hotspot, x, y) {
        console.log(`CLOSE command on: ${hotspot.name}`);
        
        const closeResponses = {
            'Main Hall': '💬 You can\'t close the hall, it\'s an open space.',
            'Reception Desk': '💬 You close the desk drawer.',
            'Exit Door': '💬 The exit door is already closed.',
            'Stairs Down': '💬 You can\'t close the stairs, they\'re always open.'
        };
        
        const message = closeResponses[hotspot.name] || `💬 You can\'t close ${hotspot.name}`;
        showFloatingText(message, x, y);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FrontDoorScene;
} 