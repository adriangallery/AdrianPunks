// Scene Manager - Gestor de todas las escenas del juego
class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
        this.scenesLoaded = false;
    }

    // Registrar una escena
    registerScene(sceneId, sceneClass) {
        console.log(`Registering scene: ${sceneId}`);
        this.scenes.set(sceneId, sceneClass);
    }

    // Cargar todas las escenas
    async loadScenes() {
        if (this.scenesLoaded) return;
        
        console.log('Loading all scenes...');
        
        try {
            // Cargar la clase base
            await this.loadScript('scenes/base-scene.js');
            
            // Cargar escenas específicas
            await this.loadScript('scenes/outside.js');
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

    // Cargar script dinámicamente
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Crear instancias de las escenas
    createSceneInstances() {
        // Crear instancia de outside (primera escena)
        if (typeof OutsideScene !== 'undefined') {
            const outsideScene = new OutsideScene();
            this.scenes.set('outside', outsideScene);
            console.log('Outside scene instance created');
        }
        
        // Crear instancia de basement
        if (typeof BasementScene !== 'undefined') {
            const basementScene = new BasementScene();
            this.scenes.set('basement', basementScene);
            console.log('Basement scene instance created');
        }
        
        // Crear instancia de upstairs
        if (typeof UpstairsScene !== 'undefined') {
            const upstairsScene = new UpstairsScene();
            this.scenes.set('upstairs', upstairsScene);
            console.log('Upstairs scene instance created');
        }
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
            return false;
        }
        
        // Ocultar escena actual
        if (this.currentScene) {
            this.currentScene.hide();
        }
        
        // Mostrar nueva escena
        scene.show();
        this.currentScene = scene;
        
        // Inicializar la escena si no se ha hecho
        scene.initialize();
        
        return true;
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
        sceneElement = scene.createSceneElement();
        document.getElementById('app').appendChild(sceneElement);
        
        console.log(`Scene element created: ${sceneId}`);
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

    // Reinicializar todas las escenas
    reinitializeScenes() {
        this.scenes.forEach(scene => {
            scene.initialize();
        });
    }
}

// Instancia global del SceneManager
const sceneManager = new SceneManager();

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneManager;
} 