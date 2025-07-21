// SceneManager v2 - Versión funcional y optimizada
console.log('SceneManager v2 script starting execution...');

class SceneManagerV2 {
    constructor() {
        console.log('SceneManagerV2 constructor called');
        this.scenes = new Map();
        this.currentScene = null;
        this.scenesLoaded = false;
        this.appContainer = document.getElementById('app');
        console.log('SceneManagerV2 initialized with app container:', this.appContainer);
    }

    // Cargar script dinámicamente
    loadScript(src) {
        return new Promise((resolve, reject) => {
            console.log(`Loading script: ${src}`);
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`Script loaded successfully: ${src}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`Failed to load script: ${src}`, error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    // Cargar todas las escenas
    async loadScenes() {
        if (this.scenesLoaded) {
            console.log('Scenes already loaded');
            return;
        }
        
        console.log('Loading all scenes...');
        
        try {
            // Cargar la clase base primero
            await this.loadScript('scenes/base-scene.js');
            
            // Cargar escenas específicas
            await this.loadScript('scenes/outside.js');
            await this.loadScript('scenes/frontdoor.js');
            await this.loadScript('scenes/lobby.js');
            await this.loadScript('scenes/basement.js');
            await this.loadScript('scenes/upstairs.js');
            
            // Crear instancias de las escenas
            this.createSceneInstances();
            
            this.scenesLoaded = true;
            console.log('All scenes loaded successfully');
            
        } catch (error) {
            console.error('Error loading scenes:', error);
        }
    }

    // Crear instancias de las escenas
    createSceneInstances() {
        console.log('Creating scene instances...');
        
        // Crear instancia de outside (primera escena)
        if (typeof OutsideScene !== 'undefined') {
            const outsideScene = new OutsideScene();
            this.scenes.set('outside', outsideScene);
            console.log('Outside scene instance created');
        } else {
            console.warn('OutsideScene class not available');
        }
        
        // Crear instancia de frontdoor
        if (typeof FrontDoorScene !== 'undefined') {
            const frontdoorScene = new FrontDoorScene();
            this.scenes.set('frontdoor', frontdoorScene);
            console.log('Frontdoor scene instance created');
        } else {
            console.warn('FrontDoorScene class not available');
        }
        
        // Crear instancia de lobby
        if (typeof LobbyScene !== 'undefined') {
            const lobbyScene = new LobbyScene();
            this.scenes.set('lobby', lobbyScene);
            console.log('Lobby scene instance created');
        } else {
            console.warn('LobbyScene class not available');
        }
        
        // Crear instancia de basement
        if (typeof BasementScene !== 'undefined') {
            const basementScene = new BasementScene();
            this.scenes.set('basement', basementScene);
            console.log('Basement scene instance created');
        } else {
            console.warn('BasementScene class not available');
        }
        
        // Crear instancia de upstairs
        if (typeof UpstairsScene !== 'undefined') {
            const upstairsScene = new UpstairsScene();
            this.scenes.set('upstairs', upstairsScene);
            console.log('Upstairs scene instance created');
        } else {
            console.warn('UpstairsScene class not available');
        }
        
        console.log('Available scenes:', Array.from(this.scenes.keys()));
    }

    // Obtener una escena por ID
    getScene(sceneId) {
        return this.scenes.get(sceneId);
    }

    // Cambiar a una escena específica
    changeScene(sceneId) {
        console.log(`Changing to scene: ${sceneId}`);
        
        const scene = this.getScene(sceneId);
        if (!scene) {
            console.error(`Scene not found: ${sceneId}`);
            console.log('Available scenes:', Array.from(this.scenes.keys()));
            return false;
        }
        
        // Ocultar escena actual
        if (this.currentScene) {
            this.currentScene.hide();
        }
        
        // Crear elemento HTML si no existe
        this.createSceneElement(sceneId);
        
        // Mostrar nueva escena
        scene.show();
        this.currentScene = scene;
        
        // Inicializar la escena si no se ha hecho
        if (typeof scene.initialize === 'function') {
            scene.initialize();
        }
        
        console.log(`Successfully changed to scene: ${sceneId}`);
        return true;
    }

    // Alias para changeScene para compatibilidad
    loadScene(sceneId) {
        return this.changeScene(sceneId);
    }

    // Crear elemento HTML para una escena si no existe
    createSceneElement(sceneId) {
        const scene = this.getScene(sceneId);
        if (!scene) {
            console.error(`Scene not found: ${sceneId}`);
            return null;
        }
        
        // Verificar si el elemento ya existe
        let sceneElement = document.getElementById(sceneId);
        if (sceneElement) {
            console.log(`Scene element already exists: ${sceneId}`);
            return sceneElement;
        }
        
        // Crear nuevo elemento
        if (typeof scene.createSceneElement === 'function') {
            sceneElement = scene.createSceneElement();
            console.log(`Created scene element for: ${sceneId}`);
            
            if (this.appContainer) {
                this.appContainer.appendChild(sceneElement);
                console.log(`Scene element appended to app container: ${sceneId}`);
            } else {
                console.error('App container not found!');
            }
        } else {
            console.warn(`Scene ${sceneId} does not have createSceneElement method`);
        }
        
        return sceneElement;
    }

    // Obtener escena actual
    getCurrentScene() {
        return this.currentScene;
    }

    // Obtener ID de escena actual
    getCurrentSceneId() {
        return this.currentScene ? this.currentScene.sceneId : null;
    }

    // Listar todas las escenas disponibles
    listScenes() {
        return Array.from(this.scenes.keys());
    }

    // Verificar si una escena existe
    hasScene(sceneId) {
        return this.scenes.has(sceneId);
    }
}

console.log('About to create SceneManagerV2 instance...');
const sceneManagerV2 = new SceneManagerV2();
console.log('SceneManagerV2 instance created');

// Hacer disponible globalmente
window.sceneManagerV2 = sceneManagerV2;
console.log('SceneManagerV2 made global:', sceneManagerV2);

// También mantener compatibilidad con el nombre original
window.sceneManager = sceneManagerV2;
console.log('SceneManagerV2 also available as sceneManager for compatibility');

console.log('SceneManagerV2 script execution completed'); 