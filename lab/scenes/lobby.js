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
        // Definir clickable areas (hotspots) para lobby
        this.hotspots = [
            // Hotspots básicos - se pueden expandir después
            {
                name: 'Main Area',
                x: [30, 70],
                y: [40, 80],
                action: 'explore_lobby',
                messages: {
                    explore: "🏢 Welcome to the AdrianLAB lobby! This is where all the web3 magic happens.",
                    use: "🔧 You interact with the lobby's main terminal. It's running some kind of blockchain node.",
                    take: "💎 You can't take the lobby, but you find a mysterious NFT fragment on the floor!",
                    inspect: "🔍 The lobby is filled with retro-futuristic equipment. Everything has a crypto theme.",
                    open: "🚪 You open the main access panel. It reveals a complex network of smart contracts.",
                    close: "🔒 You close the access panel. Security protocols are now active."
                }
            }
        ];
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
        showFloatingText(hotspot.messages?.use || `You use the ${hotspot.name}.`, x, y);
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