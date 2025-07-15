// Upstairs Scene - Escena del piso superior
class UpstairsScene extends BaseScene {
    constructor() {
        super('upstairs', 'Upstairs');
        this.imagePath = 'scenes/images/upstairs.png';
        this.overlayText = {
            title: 'Upstairs',
            subtitle: 'Welcome to the fiat zone...'
        };
    }

    setupHotspots() {
        // Definir clickable areas (hotspots) para upstairs
        this.hotspots = [
            {
                name: 'Stairs Down',
                x: [0, 20],
                y: [70, 100],
                action: 'go_downstairs',
                message: "💬 Going back downstairs..."
            },
            {
                name: 'Fiat Zone',
                x: [40, 80],
                y: [30, 70],
                action: 'inspect_fiat',
                message: "💬 This is where the fiat money lives. It's very quiet here."
            }
        ];
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-upstairs');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos del upstairs
    handleUseCommand(hotspot, x, y) {
        console.log(`USE command on: ${hotspot.name}`);
        
        switch (hotspot.name) {
            case 'Stairs Down':
                showFloatingText('💬 Going back downstairs...', x, y);
                setTimeout(() => {
                    goToMainScreen();
                }, 1000);
                break;
                
            default:
                showFloatingText(`💬 You can't use ${hotspot.name}`, x, y);
        }
    }

    handleInspectCommand(hotspot, x, y) {
        console.log(`INSPECT command on: ${hotspot.name}`);
        
        const inspectionMessages = {
            'Stairs Down': '💬 Wooden stairs leading back down to the basement. They look safer going down.',
            'Fiat Zone': '💬 A clean, well-lit area with expensive furniture. Everything here costs real money.'
        };
        
        const message = inspectionMessages[hotspot.name] || `💬 You carefully examine ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTakeCommand(hotspot, x, y) {
        console.log(`TAKE command on: ${hotspot.name}`);
        
        const takeableItems = {
            'Stairs Down': '💬 You can\'t take the stairs, but you find a loose nail.',
            'Fiat Zone': '💬 You can\'t take the fiat zone, but you find a $100 bill under the couch.'
        };
        
        const message = takeableItems[hotspot.name] || `💬 You can\'t take ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleTalkCommand(hotspot, x, y) {
        console.log(`TALK command on: ${hotspot.name}`);
        
        const talkResponses = {
            'Stairs Down': '💬 "Hello stairs!" - They creak in response.',
            'Fiat Zone': '💬 "Hello fiat zone!" - The silence is deafening.'
        };
        
        const message = talkResponses[hotspot.name] || `💬 You talk to ${hotspot.name} but get no response`;
        showFloatingText(message, x, y);
    }

    handleMoveCommand(hotspot, x, y) {
        console.log(`MOVE command on: ${hotspot.name}`);
        
        const moveResponses = {
            'Stairs Down': '💬 You can\'t move the stairs, but you can climb them.',
            'Fiat Zone': '💬 The fiat zone is too expensive to move.'
        };
        
        const message = moveResponses[hotspot.name] || `💬 You can\'t move ${hotspot.name}`;
        showFloatingText(message, x, y);
    }

    handleOpenCommand(hotspot, x, y) {
        console.log(`OPEN command on: ${hotspot.name}`);
        
        const openResponses = {
            'Stairs Down': '💬 You can\'t open the stairs, they\'re not a container.',
            'Fiat Zone': '💬 You try to open the fiat zone but it\'s locked with a golden key.'
        };
        
        const message = openResponses[hotspot.name] || `💬 You can\'t open ${hotspot.name}`;
        showFloatingText(message, x, y);
    }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpstairsScene;
} 