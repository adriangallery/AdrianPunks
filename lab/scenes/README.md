# Estructura de Escenas - AdrianLAB

Esta carpeta contiene toda la lógica modular de las escenas del juego point-and-click.

## Estructura de Archivos

```
lab/scenes/
├── README.md                 # Esta documentación
├── base-scene.js            # Clase base para todas las escenas
├── scene-manager.js         # Gestor de todas las escenas
├── basement.js              # Escena del sótano
├── upstairs.js              # Escena del piso superior
└── images/                  # Imágenes de las escenas
    ├── basement.png
    ├── upstairs.png
    └── (futuras imágenes...)
```

## Cómo Agregar una Nueva Escena

### 1. Crear la imagen
Coloca la imagen de la escena en `lab/scenes/images/` con un nombre descriptivo (ej: `kitchen.png`).

### 2. Crear el archivo de la escena
Crea un nuevo archivo `lab/scenes/kitchen.js` siguiendo este patrón:

```javascript
// Kitchen Scene - Escena de la cocina
class KitchenScene extends BaseScene {
    constructor() {
        super('kitchen', 'Kitchen');
        this.imagePath = 'scenes/images/kitchen.png';
        this.overlayText = {
            title: 'Kitchen',
            subtitle: 'Where the magic happens...'
        };
    }

    setupHotspots() {
        // Definir zonas clickeables
        this.hotspots = [
            {
                name: 'Stove',
                x: [20, 40],
                y: [60, 80],
                action: 'inspect_stove',
                message: "💬 An old gas stove."
            }
            // ... más hotspots
        ];
    }

    setupEventListeners() {
        const clickArea = document.getElementById('click-area-kitchen');
        if (clickArea) {
            clickArea.addEventListener('click', (event) => this.handleClick(event));
        }
    }

    // Sobrescribir comandos específicos si es necesario
    handleUseCommand(hotspot, x, y) {
        // Lógica específica para USE en esta escena
    }
}
```

### 3. Registrar la escena
En `scene-manager.js`, agrega la carga de la nueva escena:

```javascript
// En loadScenes()
await this.loadScript('scenes/kitchen.js');

// En createSceneInstances()
if (typeof KitchenScene !== 'undefined') {
    const kitchenScene = new KitchenScene();
    this.scenes.set('kitchen', kitchenScene);
}
```

### 4. Usar la escena
Para cambiar a la nueva escena:

```javascript
sceneManager.changeScene('kitchen');
```

## Clase BaseScene

Todas las escenas heredan de `BaseScene` que proporciona:

- **Gestión de hotspots**: Zonas clickeables con coordenadas
- **Sistema de comandos**: EXPLORE, USE, INSPECT, etc.
- **Manejo de clicks**: Lógica automática para hotspots y clicks generales
- **Creación de HTML**: Generación automática del elemento de la escena
- **Gestión de estado**: Mostrar/ocultar escenas

## Comandos Disponibles

Cada escena puede sobrescribir estos métodos para comportamiento específico:

- `handleExploreCommand(hotspot, x, y)` - Comando EXPLORE
- `handleUseCommand(hotspot, x, y)` - Comando USE
- `handleInspectCommand(hotspot, x, y)` - Comando INSPECT
- `handleTakeCommand(hotspot, x, y)` - Comando TAKE
- `handleTalkCommand(hotspot, x, y)` - Comando TALK
- `handleMoveCommand(hotspot, x, y)` - Comando MOVE
- `handleOpenCommand(hotspot, x, y)` - Comando OPEN
- `handleTestCommand(hotspot, x, y)` - Comando TEST (modo desarrollo)

## Hotspots

Los hotspots se definen con coordenadas en porcentaje:

```javascript
{
    name: 'Nombre del área',
    x: [xMin, xMax],    // Porcentaje horizontal (0-100)
    y: [yMin, yMax],    // Porcentaje vertical (0-100)
    action: 'accion_id',
    message: "Mensaje por defecto para EXPLORE"
}
```

## Modo TEST

El comando TEST muestra coordenadas exactas para ayudar a configurar hotspots:

1. Selecciona el comando TEST
2. Haz click en cualquier parte de la escena
3. Verás las coordenadas exactas en porcentaje
4. Usa estas coordenadas para definir hotspots

## Escenas Actuales

### Basement
- **ID**: `basement`
- **Imagen**: `basement.png`
- **Hotspots**: 8 áreas interactivas
- **Funcionalidad especial**: Área central para mint popup

### Upstairs
- **ID**: `upstairs`
- **Imagen**: `upstairs.png`
- **Hotspots**: 2 áreas interactivas
- **Funcionalidad especial**: Navegación de regreso al basement

## Próximas Escenas Sugeridas

- `kitchen.js` - Cocina
- `roof.js` - Techo
- `garden.js` - Jardín
- `garage.js` - Garaje
- `attic.js` - Ático 