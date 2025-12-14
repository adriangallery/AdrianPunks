# 📋 Especificaciones Técnicas del Marketplace AdrianPunks

## 📑 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Conexión a Base de Datos](#conexión-a-base-de-datos)
3. [Integración con Alchemy](#integración-con-alchemy)
4. [Contratos Inteligentes](#contratos-inteligentes)
5. [Estructura del Frontend](#estructura-del-frontend)
6. [Flujo de Datos](#flujo-de-datos)
7. [Configuración y Variables](#configuración-y-variables)
8. [Funciones Principales](#funciones-principales)
9. [Sistema de Caché y Rate Limiting](#sistema-de-caché-y-rate-limiting)
10. [Despliegue](#despliegue)
11. [Guía para Extrapolar a Otra Colección](#guía-para-extrapolar-a-otra-colección)

---

## 🏗️ Arquitectura General

### Stack Tecnológico

- **Frontend**: HTML5, JavaScript (Vanilla), Bootstrap 5.3.0, Ethers.js v5
- **Backend API**: Node.js, Express.js
- **Base de Datos Local**: SQLite3 (`adrianpunks.db`)
- **Base de Datos en la Nube**: Supabase (PostgreSQL)
- **RPC Provider**: Alchemy (Base Mainnet) con fallback a Infura
- **Blockchain**: Base (Chain ID: 8453)
- **Despliegue**: Vercel

### Arquitectura de Capas

```
┌─────────────────────────────────────────┐
│         Frontend (index.html)           │
│  - UI/UX con Bootstrap                   │
│  - Interacción con contratos (Ethers.js) │
│  - Caché local y rate limiting          │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│  Supabase   │  │  Alchemy RPC    │
│  (PostgreSQL)│  │  (Base Mainnet) │
└─────────────┘  └─────────────────┘
       │                │
       └───────┬────────┘
               │
┌──────────────▼──────────────┐
│   Contratos Inteligentes   │
│  - FloorEngine (Marketplace)│
│  - ERC721 (AdrianPunks NFT)│
│  - ERC20 ($ADRIAN Token)   │
│  - Multicall3 (Optimización)│
└─────────────────────────────┘
```

---

## 💾 Conexión a Base de Datos

### 1. SQLite (Base de Datos Local)

**Ubicación**: `/market/adrianpunks.db`

**Propósito**: Almacenar metadata de NFTs localmente (atributos, rarity, imágenes, etc.)

**Inicialización**: `init_db.js`

**Esquema de Tabla**:
```sql
CREATE TABLE IF NOT EXISTS nfts (
    token_id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    image TEXT,
    external_url TEXT,
    attributes TEXT,        -- JSON stringificado
    compiler TEXT,
    masterminds TEXT,       -- JSON stringificado
    rarity REAL
)
```

**API Endpoints** (Express.js en `api.js`):
- `GET /api/nfts` - Obtener todos los NFTs
- `GET /api/nfts/:id` - Obtener NFT específico

**Uso en el Frontend**:
```javascript
// Los datos se cargan desde adrianpunks.json directamente
const response = await fetch('./adrianpunks.json');
const data = await response.json();
nftData = data.collection.filter(nft => {
    const tokenId = parseInt(nft.name.split('#')[1]);
    return tokenId <= mintedCount; // Filtro por tokens minteados
});
```

### 2. Supabase (Base de Datos en la Nube)

**Configuración**: `supabase-config.js`
```javascript
window.SUPABASE_URL = 'https://scsxdqudvprtfikkepmu.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Inicialización en Frontend**:
```javascript
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
let supabaseClient = null;

function initSupabase() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}
```

**Tablas Principales**:

#### `active_punk_listings` (Vista)
Vista simplificada de listings activos:
- `token_id` (INTEGER)
- `price_adrian_wei` (TEXT) - Precio en wei como string
- `is_engine_owned` (BOOLEAN) - Si el listing es del FloorEngine
- `seller` (TEXT) - Dirección del vendedor
- `last_block_number` (BIGINT) - Último bloque sincronizado

#### `trade_events`
Eventos de compra/venta:
- `token_id` (INTEGER)
- `buyer` (TEXT)
- `seller` (TEXT)
- `price_wei` (TEXT)
- `is_contract_owned` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

#### `sweep_events`
Eventos de floor sweeps del FloorEngine:
- `token_id` (INTEGER)
- `buy_price_wei` (TEXT)
- `relist_price_wei` (TEXT)
- `caller` (TEXT)
- `created_at` (TIMESTAMPTZ)

**Función de Carga desde Supabase**:
```javascript
async function loadListingsFromSupabase() {
    const { data: listings, error } = await supabaseClient
        .from('active_punk_listings')
        .select('token_id, price_adrian_wei, is_engine_owned, seller, last_block_number')
        .order('last_block_number', { ascending: false });
    
    // Convertir a formato compatible
    const activeListings = listings.map(l => ({
        tokenId: l.token_id,
        price: ethers.BigNumber.from(convertToDecimalString(l.price_adrian_wei)),
        seller: l.is_engine_owned ? FLOOR_ENGINE_ADDRESS : l.seller,
        isContractOwned: l.is_engine_owned
    }));
    
    return { listings: activeListings, lastBlock: maxBlock };
}
```

**Estrategia de Sincronización**:
1. Cargar primero desde Supabase (rápido)
2. Verificar si hay más de 10 bloques de diferencia con la blockchain
3. Si es necesario, sincronizar en background desde la blockchain
4. Actualizar UI con datos frescos

---

## 🔗 Integración con Alchemy

### Configuración

**Archivo**: `supabase-config.js`
```javascript
window.ALCHEMY_API_KEY = 'pqRmKgTaLqm2eak9iML1f';
```

**URL del Endpoint**:
```javascript
const ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
```

### Uso en el Frontend

**Provider de Lectura (Read-Only)**:
```javascript
let readProvider;

// Inicialización
const rpcUrl = ALCHEMY_RPC_URL || INFURA_URL; // Fallback a Infura
readProvider = new ethers.providers.JsonRpcProvider(rpcUrl, {
    name: "base",
    chainId: 8453
});
```

**Contratos de Solo Lectura**:
```javascript
tokenReadContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, readProvider);
nftReadContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, readProvider);
floorEngineReadContract = new ethers.Contract(FLOOR_ENGINE_ADDRESS, FLOOR_ENGINE_ABI, readProvider);
multicallReadContract = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, readProvider);
```

**Provider de Escritura (Con Wallet)**:
```javascript
// Solo cuando el usuario conecta su wallet
if (window.ethereum) {
    window.provider = new ethers.providers.Web3Provider(window.ethereum);
    window.signer = window.provider.getSigner();
    
    // Contratos con signer para transacciones
    tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
    nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
    floorEngineContract = new ethers.Contract(FLOOR_ENGINE_ADDRESS, FLOOR_ENGINE_ABI, signer);
}
```

### Optimizaciones para Rate Limiting

**Rate Limiter**:
```javascript
class RateLimiter {
    constructor(maxRequests = 25, windowMs = 1000) {
        this.maxRequests = maxRequests;  // 25 requests por segundo
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    async waitForSlot() {
        // Limpiar requests antiguos
        this.requests = this.requests.filter(time => Date.now() - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            // Esperar hasta que haya espacio
            const waitTime = this.windowMs - (Date.now() - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.waitForSlot();
        }
        
        this.requests.push(Date.now());
    }
}
```

**Retry con Exponential Backoff**:
```javascript
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await rateLimiter.waitForSlot();
            return await fn();
        } catch (error) {
            if (error.status === 429) {  // Too Many Requests
                const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}
```

---

## 📜 Contratos Inteligentes

### 1. FloorEngine (Marketplace)

**Dirección**: `0x0351F7cBA83277E891D4a85Da498A7eACD764D58`

**Archivo Solidity**: `FloorEngine.sol`

**Funcionalidad Principal**:
- Marketplace custodial (los NFTs se transfieren al contrato al listar)
- Sistema de "Floor Sweep" automático
- Recompensas para callers que ejecutan sweeps
- Premium markup en relistings del engine

**Estructura de Listing**:
```solidity
struct Listing {
    address seller;          // Vendedor original o address(this) si es del contrato
    uint256 price;           // Precio en $ADRIAN (18 decimals)
    bool isContractOwned;    // True si es inventario del contrato
}
```

**Funciones Principales**:

#### Para Usuarios:
- `list(uint256 tokenId, uint256 price)` - Listar un NFT
- `cancel(uint256 tokenId)` - Cancelar listing propio
- `buy(uint256 tokenId)` - Comprar un NFT listado

#### Para Floor Engine:
- `sweepFloorWithBalance()` - Comprar el listing más barato, relistear con premium, y recompensar al caller

#### View Functions:
- `listings(uint256 tokenId)` - Obtener detalles de un listing
- `isListed(uint256 tokenId)` - Verificar si está listado
- `getListedTokenIds()` - Obtener todos los token IDs listados
- `getListedCount()` - Contar listings activos

**ABI Completo** (definido en `index.html`):
```javascript
const FLOOR_ENGINE_ABI = [
    // Events
    "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price, bool isContractOwned)",
    "event Cancelled(uint256 indexed tokenId, address indexed seller)",
    "event Bought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, bool isContractOwned)",
    "event FloorSweep(uint256 indexed tokenId, uint256 buyPrice, uint256 relistPrice, address indexed caller, uint256 callerReward)",
    
    // Main functions
    "function list(uint256 tokenId, uint256 price) external",
    "function cancel(uint256 tokenId) external",
    "function buy(uint256 tokenId) external",
    "function sweepFloorWithBalance() external",
    
    // View functions
    "function listings(uint256 tokenId) external view returns (address seller, uint256 price, bool isContractOwned)",
    "function isListed(uint256 tokenId) external view returns (bool)",
    "function getListedTokenIds() external view returns (uint256[])",
    "function getListedCount() external view returns (uint256)",
    // ... más funciones
];
```

### 2. ERC721 - AdrianPunks NFT

**Dirección**: `0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566`

**ABI**:
```javascript
const NFT_ABI = [
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function approve(address to, uint256 tokenId) external",
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved) external",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function totalMinted() view returns (uint256)"
];
```

**Total Supply**: 1000 tokens (hardcoded en el frontend)

### 3. ERC20 - $ADRIAN Token

**Dirección**: `0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea`

**ABI**:
```javascript
const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];
```

**Decimals**: 18

### 4. Multicall3 (Optimización)

**Dirección**: `0xcA11bde05977b3631167028862bE2a173976CA11` (Base Mainnet)

**Propósito**: Agrupar múltiples llamadas RPC en una sola transacción para reducir latencia

**ABI**:
```javascript
const MULTICALL3_ABI = [
    "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) external payable returns (tuple(bool success, bytes returnData)[] returnData)"
];
```

**Ejemplo de Uso**:
```javascript
// Obtener múltiples token IDs de un usuario
const calls = [];
for (let i = 0; i < totalTokens; i++) {
    calls.push({
        target: NFT_ADDRESS,
        allowFailure: true,
        callData: nftReadContract.interface.encodeFunctionData('tokenOfOwnerByIndex', [userAccount, i])
    });
}

const results = await multicallReadContract.callStatic.aggregate3(calls);
```

---

## 🎨 Estructura del Frontend

### Archivos Principales

1. **`index.html`** (4443 líneas)
   - HTML completo con estilos embebidos
   - Todo el JavaScript del frontend
   - Integración con Bootstrap, Ethers.js, Supabase

2. **`config.js`**
   - URLs base de la API
   - IPFS Gateway
   - Función `getImageUrl()` para convertir IPFS URLs

3. **`supabase-config.js`**
   - Credenciales de Supabase
   - API Key de Alchemy
   - Variables globales `window.SUPABASE_URL`, `window.SUPABASE_ANON_KEY`, `window.ALCHEMY_API_KEY`

4. **`styles.css`**
   - Estilos personalizados
   - Dark mode support
   - FloorEngine Dashboard styles

5. **`components/menu.html` y `components/menu.js`**
   - Menú de navegación
   - Conexión de wallet
   - Gestión de tema (dark/light)

### Estructura de Datos

**NFT Data**:
```javascript
let nftData = [];  // Array de objetos NFT desde adrianpunks.json
// Estructura:
{
    name: "AdrianPunks#1",
    description: "...",
    image: "https://ipfs.io/ipfs/...",
    attributes: [...],
    rarity: 1.0,
    masterminds: [...]
}
```

**Active Listings**:
```javascript
let activeListingsData = [];  // Listings activos
// Estructura:
{
    tokenId: 1,
    seller: "0x...",
    price: ethers.BigNumber,  // Precio en wei
    isContractOwned: false
}
```

### Componentes UI Principales

1. **NFT Grid**: Muestra todos los NFTs con sus precios
2. **FloorEngine Dashboard**: Dashboard estilo PunkStrategy mostrando:
   - Balance del FloorEngine
   - NFTs en holdings
   - NFTs vendidos
   - Cheapest listing
   - Sales history
3. **NFT Modal**: Detalles de un NFT individual
4. **Filters**: Filtros por traits (background, type, accessory, etc.)

---

## 🔄 Flujo de Datos

### 1. Carga Inicial de NFTs

```
Usuario abre página
    ↓
loadNFTs()
    ↓
1. Cargar adrianpunks.json
2. Filtrar por tokens minteados (≤ 1000)
3. loadActiveListings()
    ↓
   ├─→ Verificar caché (30s TTL)
   ├─→ Cargar desde Supabase (rápido)
   ├─→ Verificar sincronización (si >10 bloques de diferencia)
   └─→ Sincronizar desde blockchain si es necesario
    ↓
extractTraits() → renderTraitFilters() → filterAndDisplayNFTs()
    ↓
updateFloorEngineDashboard()
```

### 2. Carga de Listings

```
loadActiveListings()
    ↓
¿Caché válido?
    ├─→ SÍ: Usar caché
    └─→ NO: Continuar
        ↓
    loadListingsFromSupabase()
        ↓
    ¿Hay datos?
        ├─→ SÍ: Usar datos de Supabase
        │       ↓
        │   checkNeedSync(lastBlock)
        │       ↓
        │   ¿Necesita sync?
        │       ├─→ SÍ: syncListingsFromChain() en background
        │       └─→ NO: Usar datos de Supabase
        └─→ NO: syncListingsFromChain() directamente
            ↓
        Guardar en caché (30s TTL)
```

### 3. Sincronización desde Blockchain

```
syncListingsFromChain()
    ↓
floorEngineReadContract.getListedTokenIds()
    ↓
Para cada tokenId:
    floorEngineReadContract.listings(tokenId)
    ↓
Construir array de listings
    ↓
Retornar listings actualizados
```

### 4. Compra de NFT

```
Usuario hace clic en "Buy Now"
    ↓
buyToken(tokenId, priceStr)
    ↓
1. Verificar allowance de $ADRIAN
2. Si no hay suficiente: approve()
3. floorEngineContract.buy(tokenId)
    ↓
Transacción confirmada
    ↓
loadNFTs() (recargar datos)
```

### 5. Listar NFT

```
Usuario hace clic en "List for Sale"
    ↓
createListing(tokenId)
    ↓
1. Verificar approval del NFT
2. Si no está aprobado: nftContract.approve()
3. floorEngineContract.list(tokenId, price)
    ↓
Transacción confirmada
    ↓
loadNFTs() (recargar datos)
```

---

## ⚙️ Configuración y Variables

### Variables de Entorno / Configuración

**`supabase-config.js`**:
```javascript
window.SUPABASE_URL = 'https://scsxdqudvprtfikkepmu.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
window.ALCHEMY_API_KEY = 'pqRmKgTaLqm2eak9iML1f';
```

**`config.js`**:
```javascript
const config = {
    API_BASE_URL: 'https://marketplace-ks4ktpit5-adrians-projects-43090263.vercel.app',
    DB_URL: 'https://marketplace-ks4ktpit5-adrians-projects-43090263.vercel.app/api/nfts',
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
};
```

**Direcciones de Contratos** (en `index.html`):
```javascript
const TOKEN_ADDRESS = "0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea";  // $ADRIAN
const NFT_ADDRESS = "0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566";      // AdrianPunks
const FLOOR_ENGINE_ADDRESS = "0x0351F7cBA83277E891D4a85Da498A7eACD764D58"; // FloorEngine
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";   // Multicall3
```

**Chain Configuration**:
```javascript
const INFURA_URL = "https://base-mainnet.infura.io/v3/cc0c8013b1e044dcba79d4f7ec3b2ba1";
const CHAIN_ID = 8453;  // Base Mainnet
```

### Archivos de Metadata

- **`adrianpunks.json`**: Metadata completa de todos los NFTs (43622 líneas)
- **`halfxadrian.json`**: Metadata alternativa para otra colección
- **`adrianpunksimages/`**: Imágenes locales (1000 PNGs + 11 GIFs)
- **`halfxadrianimages/`**: Imágenes de la colección alternativa (1000 JPGs)

---

## 🔧 Funciones Principales

### Gestión de NFTs

**`loadNFTs()`**:
- Carga metadata desde `adrianpunks.json`
- Filtra por tokens minteados
- Carga listings activos
- Extrae traits y renderiza filtros
- Muestra NFTs en el grid

**`displayNFTs(nfts)`**:
- Renderiza el grid de NFTs
- Muestra precios y badges (ENGINE/USER)
- Maneja diferentes colecciones de imágenes

**`showNFTDetails(nftName)`**:
- Muestra modal con detalles del NFT
- Verifica ownership
- Muestra listing activo si existe
- Botones para listar/comprar/cancelar

### Gestión de Listings

**`loadActiveListings()`**:
- Estrategia híbrida: Supabase primero, blockchain como fallback
- Sistema de caché (30s TTL)
- Sincronización en background si es necesario

**`loadListingsFromSupabase()`**:
- Carga listings desde Supabase
- Convierte precios de string a BigNumber
- Maneja notación científica

**`syncListingsFromChain()`**:
- Obtiene todos los token IDs listados
- Para cada uno, obtiene detalles del listing
- Retorna array completo de listings

**`checkNeedSync(supabaseLastBlock)`**:
- Compara último bloque de Supabase con blockchain
- Retorna `true` si hay más de 10 bloques de diferencia

### Interacciones con Contratos

**`createListing(tokenId)`**:
1. Verifica approval del NFT
2. Aprueba si es necesario
3. Llama a `floorEngineContract.list()`

**`buyToken(tokenId, priceStr)`**:
1. Verifica allowance de $ADRIAN
2. Aprueba si es necesario
3. Llama a `floorEngineContract.buy()`

**`cancelListing(tokenId)`**:
- Llama a `floorEngineContract.cancel()`

**`sweepFloor()`**:
- Llama a `floorEngineContract.sweepFloorWithBalance()`
- Muestra información del sweep (precio compra, relist, reward)

### Dashboard del FloorEngine

**`updateFloorEngineDashboard()`**:
- Obtiene balance del FloorEngine
- Cuenta holdings (NFTs listados por el engine)
- Obtiene contador de vendidos desde Supabase
- Encuentra cheapest user listing
- Actualiza todas las cards del dashboard

**`getFloorEngineSoldCount()`**:
- Consulta `trade_events` en Supabase
- Filtra por seller = FloorEngine y is_contract_owned = true
- Retorna count

**`updateSalesSection()`**:
- Obtiene últimas ventas del FloorEngine
- Empareja con sweep_events para mostrar profit
- Renderiza lista de sales

### Utilidades

**`convertToDecimalString(value)`**:
- Convierte notación científica a string decimal completo
- Necesario porque Supabase puede retornar números grandes en notación científica

**`getImageUrl(nft)`**:
- Convierte URLs IPFS a gateway URL
- Maneja diferentes formatos de imagen

**`retryWithBackoff(fn, maxRetries, baseDelay)`**:
- Reintenta función con exponential backoff
- Maneja errores 429 (rate limiting)

---

## 💾 Sistema de Caché y Rate Limiting

### Caché Simple

```javascript
class SimpleCache {
    constructor(ttlMs = 30000) {  // 30 segundos por defecto
        this.cache = new Map();
        this.ttlMs = ttlMs;
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
}
```

**Uso**:
```javascript
const contractCache = new SimpleCache(30000);  // 30s TTL

// Verificar caché antes de hacer llamada
const cacheKey = 'activeListings';
const cached = contractCache.get(cacheKey);
if (cached) {
    activeListingsData = cached;
    return;
}

// Guardar en caché después de obtener datos
contractCache.set(cacheKey, activeListingsData);
```

### Rate Limiter

**Configuración**:
- 25 requests por segundo máximo
- Ventana de 1 segundo

**Uso**:
```javascript
const rateLimiter = new RateLimiter(25, 1000);

// Antes de cada llamada RPC
await rateLimiter.waitForSlot();
const result = await contract.someFunction();
```

---

## 🚀 Despliegue

### Vercel Configuration

**`vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Dependencias

**`package.json`**:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "sqlite3": "^5.1.6"
  }
}
```

### Variables de Entorno en Vercel

Las credenciales se inyectan vía `supabase-config.js` (probablemente generado por GitHub Actions según el comentario en el archivo).

---

## 📚 Guía para Extrapolar a Otra Colección

### Pasos para Adaptar el Marketplace

#### 1. Actualizar Direcciones de Contratos

En `index.html`, buscar y reemplazar:
```javascript
const TOKEN_ADDRESS = "0x...";      // Nueva dirección del token ERC20
const NFT_ADDRESS = "0x...";        // Nueva dirección del NFT ERC721
const FLOOR_ENGINE_ADDRESS = "0x..."; // Nueva dirección del FloorEngine
```

#### 2. Actualizar Metadata de NFTs

- Reemplazar `adrianpunks.json` con el nuevo archivo JSON de metadata
- Ajustar el formato si es diferente
- Actualizar la lógica de filtrado si el total supply es diferente:
```javascript
// Cambiar de:
const mintedCount = 1000;

// A:
const mintedCount = await nftReadContract.totalMinted(); // O el valor correcto
```

#### 3. Actualizar Imágenes

- Reemplazar carpeta `adrianpunksimages/` con las nuevas imágenes
- Ajustar la función `getImageUrl()` si la estructura de URLs es diferente

#### 4. Actualizar Supabase

**Crear nuevas tablas/vistas**:
- `active_punk_listings` → `active_[coleccion]_listings`
- `trade_events` → `[coleccion]_trade_events`
- `sweep_events` → `[coleccion]_sweep_events`

**Actualizar queries en el código**:
```javascript
// Cambiar:
.from('active_punk_listings')

// A:
.from('active_[coleccion]_listings')
```

#### 5. Verificar ABI de Contratos

Si los contratos tienen funciones diferentes:
- Actualizar `FLOOR_ENGINE_ABI` con las funciones correctas
- Verificar `NFT_ABI` y `TOKEN_ABI`
- Ajustar llamadas a funciones si los nombres/parámetros cambian

#### 6. Actualizar Configuración

**`config.js`**:
- Actualizar `API_BASE_URL` si es diferente
- Verificar `IPFS_GATEWAY`

**`supabase-config.js`**:
- Mantener las mismas credenciales si usas el mismo proyecto Supabase
- O actualizar si creas un nuevo proyecto

#### 7. Actualizar Textos y Branding

- Buscar y reemplazar "AdrianPunks" por el nombre de la nueva colección
- Actualizar títulos, descripciones, etc.

#### 8. Verificar Chain ID

Si la nueva colección está en otra red:
```javascript
const CHAIN_ID = 8453;  // Cambiar si es necesario (1 = Ethereum, 137 = Polygon, etc.)
const ALCHEMY_RPC_URL = `https://[red]-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
```

#### 9. Testing

- Verificar carga de NFTs
- Probar listar NFT
- Probar comprar NFT
- Verificar sincronización con Supabase
- Probar floor sweep (si aplica)
- Verificar dashboard del FloorEngine

#### 10. Desplegar

- Actualizar `vercel.json` si es necesario
- Hacer commit y push
- Verificar despliegue en Vercel

---

## 📝 Notas Adicionales

### Optimizaciones Implementadas

1. **Caché de 30 segundos** para listings activos
2. **Rate limiting** de 25 req/s para evitar errores 429
3. **Retry con exponential backoff** para manejar errores temporales
4. **Multicall3** para agrupar múltiples llamadas RPC
5. **Sincronización híbrida**: Supabase primero (rápido), blockchain como fallback
6. **Read-only provider** separado para evitar prompts de wallet innecesarios

### Consideraciones de Seguridad

- Las credenciales de Supabase y Alchemy están en `supabase-config.js` (considerar mover a variables de entorno)
- Las transacciones requieren aprobación explícita del usuario
- El contrato FloorEngine tiene funciones de rescate para el owner

### Limitaciones Conocidas

- El total supply está hardcoded a 1000 (debería leerse del contrato)
- La sincronización con Supabase depende de un indexer externo
- El rate limiter es básico (considerar implementar token bucket más sofisticado)

---

## 🔗 Referencias

- **FloorEngine Contract**: `FloorEngine.sol`
- **Documentación de Supabase**: Ver `activity/instruccions.md` para esquemas de tablas
- **Alchemy Dashboard**: https://dashboard.alchemy.com
- **Base Explorer**: https://basescan.org
- **Ethers.js Docs**: https://docs.ethers.io/v5/

---

**Última actualización**: Generado automáticamente basado en el código actual del marketplace.



