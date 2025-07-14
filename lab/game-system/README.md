# AdrianLAB Adventure Game System

Un sistema modular de aventura gráfica point-and-click para AdrianLAB, construido con JavaScript moderno y arquitectura modular.

## Estructura del Sistema

```
game-system/
├── game-engine.js          # Motor principal del juego
├── screen-base.js          # Clase base para todas las pantallas
├── ui-manager.js           # Gestor de interfaz de usuario
├── game-init.js            # Inicialización del sistema
├── game-styles.css         # Estilos del sistema
├── screens/                # Pantallas específicas del juego
│   ├── intro-screen.js     # Pantalla de introducción
│   └── basement-screen.js  # Pantalla del sótano
└── README.md              # Esta documentación
```

## Características Principales

### 🎮 Sistema Modular
- **Game Engine**: Maneja la lógica general, navegación y estado del juego
- **Screen System**: Cada pantalla es una clase independiente con sus propios hotspots
- **UI Manager**: Gestiona menús, inventario, notificaciones y conexión de wallet
- **Event System**: Sistema de eventos para comunicación entre módulos

### 🖱️ Point & Click
- **Hotspots Expandidos**: Márgenes ampliados de 15% a 20% para mejor usabilidad
- **Mensajes Flotantes**: Texto que aparece al hacer clic en áreas interactivas
- **Navegación entre Pantallas**: Sistema de transiciones entre diferentes áreas
- **Acciones Personalizables**: Cada hotspot puede tener acciones específicas

### 🎨 Interfaz Retro
- **Estilo Retro**: Diseño inspirado en juegos clásicos de aventura
- **Responsive**: Adaptable a diferentes tamaños de pantalla
- **Animaciones**: Transiciones suaves y efectos visuales
- **Fuentes Retro**: Press Start 2P y VT323 para autenticidad

### 💾 Sistema de Estado
- **Persistencia**: Guardado y carga del estado del juego
- **Flags**: Sistema de banderas para eventos y progreso
- **Inventario**: Gestión de items y tokens NFT
- **Descubrimientos**: Tracking de elementos descubiertos

## Cómo Usar

### 1. Cargar el Sistema
```html
<script src="game-system/game-init.js"></script>
```

### 2. Crear una Nueva Pantalla
```javascript
class MyScreen extends GameScreen {
    constructor() {
        const config = {
            backgroundImage: 'my-background.png',
            hotspots: [
                {
                    name: 'My Hotspot',
                    x: [20, 40],
                    y: [30, 50],
                    action: 'custom_action',
                    message: "💬 This is my hotspot!"
                }
            ]
        };
        
        super('my_screen', config);
    }
    
    // Override para acciones específicas
    triggerAction(actionName, hotspot) {
        if (actionName === 'custom_action') {
            // Tu lógica aquí
        }
    }
}
```

### 3. Registrar la Pantalla
```javascript
const myScreen = new MyScreen();
myScreen.init();
gameEngine.registerScreen('my_screen', myScreen);
```

### 4. Navegar a la Pantalla
```javascript
gameEngine.changeScreen('my_screen');
```

## Configuración de Hotspots

Los hotspots se definen con coordenadas en porcentajes:

```javascript
{
    name: 'Nombre del Hotspot',
    x: [x1, x2],        // Rango horizontal (0-100)
    y: [y1, y2],        // Rango vertical (0-100)
    action: 'action_name',
    message: "Mensaje que aparece al hacer clic",
    targetScreen: 'screen_id',  // Para navegación
    popupId: 'popup_id'         // Para popups
}
```

## Tipos de Acciones

- **inspect_***: Inspección de objetos
- **change_screen**: Navegación a otra pantalla
- **show_popup**: Mostrar popup
- **custom**: Acción personalizada

## Sistema de Eventos

```javascript
// Escuchar eventos
gameEngine.on('screenChange', (screenId) => {
    console.log(`Cambió a pantalla: ${screenId}`);
});

gameEngine.on('itemDiscovered', (itemName) => {
    console.log(`Descubierto: ${itemName}`);
});

// Emitir eventos
gameEngine.emit('flagSet', 'my_flag', true);
```

## Gestión de Estado

```javascript
// Guardar estado
gameEngine.saveGameState();

// Cargar estado
gameEngine.loadGameState();

// Obtener estado actual
const state = gameEngine.getGameState();
```

## UI Manager

El UI Manager maneja:

- **Conexión de Wallet**: Integración con MetaMask
- **Inventario**: Visualización de tokens NFT
- **Menú Principal**: Opciones de juego
- **Notificaciones**: Sistema de mensajes
- **Controles de Audio**: Mute/unmute

## Personalización

### Estilos CSS
Los estilos están en `game-styles.css` y pueden ser personalizados:

```css
.game-button {
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #00ff00;
    color: #00ff00;
    /* Personalizar aquí */
}
```

### Configuración de Pantallas
Cada pantalla puede tener su propia configuración:

```javascript
const config = {
    backgroundImage: 'background.png',
    hotspots: [...],
    music: 'background-music.mp3',
    customProperty: 'value'
};
```

## Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (modernos)
- **Dispositivos**: Desktop, tablet, móvil
- **Blockchain**: Base Network (Ethereum L2)
- **Wallets**: MetaMask y compatibles

## Desarrollo

### Agregar Nueva Pantalla
1. Crear archivo en `screens/`
2. Extender `GameScreen`
3. Definir hotspots y acciones
4. Registrar en `game-init.js`

### Agregar Nueva Funcionalidad
1. Extender el módulo apropiado
2. Agregar eventos si es necesario
3. Actualizar documentación

## Troubleshooting

### Problemas Comunes
- **Scripts no cargan**: Verificar rutas en `game-init.js`
- **Hotspots no funcionan**: Verificar coordenadas en porcentajes
- **Estilos no aplican**: Verificar que `game-styles.css` se cargue
- **Wallet no conecta**: Verificar que MetaMask esté instalado

### Debug
```javascript
// Acceder a componentes globales
window.gameEngine    // Motor del juego
window.uiManager     // Gestor de UI
window.gameSystem    // Sistema completo
```

## Próximas Características

- [ ] Sistema de inventario avanzado
- [ ] Más pantallas y áreas
- [ ] Sistema de puzzles
- [ ] Integración con más contratos
- [ ] Sistema de logros
- [ ] Modo multijugador básico 