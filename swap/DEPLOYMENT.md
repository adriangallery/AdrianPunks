# ✅ Contrato AdrianSwapper - Ya Desplegado

## 🎉 ¡El Contrato Ya Está en Producción!

**No necesitas desplegar nada**. El contrato `AdrianSwapper` ya está desplegado y verificado en Base Mainnet:

### 📍 Información del Contrato

- **Dirección**: `0xA4542337205a9C129C01352CD204567bB0E91878`
- **Red**: Base Mainnet (Chain ID: 8453)
- **BaseScan**: https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
- **Deployment Tx**: https://basescan.org/tx/0x2449866ccfc13cf863bea788e6437b55846ef5f4e4a2ef734dc3fc9d1e56b097
- **Estado**: ✅ Desplegado y Verificado
- **Código**: ✅ Verificado en BaseScan

### 🚀 ¿Qué Puedo Hacer Ahora?

1. **Usar el Swap** - Abre `/swap/index.html` y empieza a hacer swaps
2. **Ver el Contrato** - Revisa el código en BaseScan
3. **Probar las Funciones** - Usa "Read Contract" y "Write Contract" en BaseScan

---

## 📚 Guía de Despliegue (Solo para Referencia)

Esta guía se mantiene por si en el futuro necesitas desplegar una versión actualizada del contrato.

## 📋 Requisitos Previos

- ✅ MetaMask instalado y configurado
- ✅ ETH en Base Mainnet para gas fees (~0.001 ETH)
- ✅ Acceso a Remix IDE o Hardhat/Foundry

## 🎯 Método 1: Remix IDE (Recomendado)

### Paso 1: Preparar Remix

1. Ir a https://remix.ethereum.org
2. Crear un nuevo archivo llamado `AdrianSwapper.sol`
3. Copiar el contenido de `AdrianSwapper.sol` en el archivo

### Paso 2: Instalar Dependencias

Como el contrato importa de `@uniswap/v4-core`, necesitas las interfaces:

**Opción A: Usar GitHub Import (Simple)**

Reemplazar las importaciones en el contrato con URLs directas:

```solidity
import "https://github.com/Uniswap/v4-core/blob/main/src/interfaces/IPoolManager.sol";
import "https://github.com/Uniswap/v4-core/blob/main/src/types/PoolKey.sol";
// etc...
```

**Opción B: Copiar Interfaces Manualmente**

Crear los archivos de interfaz necesarios en Remix con las definiciones mínimas.

### Paso 3: Compilar

1. Ir a la pestaña "Solidity Compiler"
2. Seleccionar versión: **0.8.24** o superior
3. Habilitar optimización (200 runs)
4. Click en "Compile AdrianSwapper.sol"
5. Verificar que no hay errores

### Paso 4: Conectar a Base Mainnet

1. Abrir MetaMask
2. Cambiar a **Base Mainnet**
   - Si no está añadida, usar:
     - Network Name: `Base`
     - RPC URL: `https://mainnet.base.org`
     - Chain ID: `8453`
     - Currency: `ETH`
     - Block Explorer: `https://basescan.org`

### Paso 5: Desplegar

1. Ir a la pestaña "Deploy & Run Transactions"
2. Environment: Seleccionar **"Injected Provider - MetaMask"**
3. Verificar que MetaMask muestra "Base" y tu dirección
4. En "Contract", seleccionar `AdrianSwapper`
5. En "Deploy", junto al botón naranja, ingresar el constructor arg:

```
0x498581fF718922c3f8e6A244956aF099B2652b2b
```

Este es el PoolManager de Uniswap V4 en Base Mainnet.

6. Click en "transact" (botón naranja)
7. Confirmar transacción en MetaMask
8. Esperar confirmación (1-2 minutos)

### Paso 6: Copiar Dirección

Una vez desplegado:

1. Copiar la dirección del contrato (aparece en "Deployed Contracts")
2. Guardar esta dirección - la necesitarás para el frontend

### Paso 7: Verificar Contrato (Opcional pero Recomendado)

1. Ir a https://basescan.org
2. Buscar la dirección de tu contrato
3. Click en "Contract" → "Verify and Publish"
4. Seleccionar:
   - Compiler Type: `Solidity (Single file)`
   - Compiler Version: `v0.8.24+commit...`
   - License: `MIT`
5. Copiar el código completo del contrato
6. Si usaste imports de GitHub, cambiarlos por código inline
7. Optimización: `Yes`, 200 runs
8. Submit
9. Verificar que pase

## 🎯 Método 2: Hardhat (Avanzado)

### Paso 1: Setup del Proyecto

```bash
mkdir adrian-swapper
cd adrian-swapper
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers
npm install @uniswap/v4-core
npx hardhat init
```

### Paso 2: Configurar Hardhat

Editar `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453
    }
  }
};
```

### Paso 3: Crear .env

```bash
echo "PRIVATE_KEY=tu_clave_privada_aqui" > .env
```

⚠️ **IMPORTANTE**: Nunca compartas tu clave privada. Añadir `.env` a `.gitignore`.

### Paso 4: Script de Deploy

Crear `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const POOL_MANAGER = "0x498581fF718922c3f8e6A244956aF099B2652b2b";

  console.log("Deploying AdrianSwapper...");

  const AdrianSwapper = await hre.ethers.getContractFactory("AdrianSwapper");
  const swapper = await AdrianSwapper.deploy(POOL_MANAGER);

  await swapper.waitForDeployment();

  const address = await swapper.getAddress();
  console.log("AdrianSwapper deployed to:", address);
  console.log("Update config.js with this address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Paso 5: Desplegar

```bash
npx hardhat run scripts/deploy.js --network base
```

### Paso 6: Verificar

```bash
npx hardhat verify --network base DIRECCION_CONTRATO "0x498581fF718922c3f8e6A244956aF099B2652b2b"
```

## ✅ Verificar que Todo Funciona

### 1. Comprobar Configuración

Abrir la consola del navegador en `/swap/index.html`:

```javascript
// Verificar configuración
validateConfig()

// Debe retornar true ✅
```

### 2. Revisar Dirección del Contrato

```javascript
console.log(CONFIG.SWAPPER_ADDRESS)
// Debe mostrar: 0xA4542337205a9C129C01352CD204567bB0E91878 ✅
```

### 3. Probar Transacción

**Test de Compra (ETH → ADRIAN):**

1. Conectar wallet
2. Ingresar 0.0001 ETH
3. Ver cotización
4. Ejecutar swap
5. Verificar transacción en BaseScan

**Test de Venta (ADRIAN → ETH):**

1. Tener ADRIAN en wallet
2. Ingresar cantidad de ADRIAN
3. Aprobar ADRIAN (primera vez)
4. Ejecutar swap
5. Verificar transacción en BaseScan

## 🔍 Verificar el Contrato

Puedes verificar que el contrato funciona correctamente:

```javascript
// En la consola del navegador
const provider = new ethers.BrowserProvider(window.ethereum);
const swapper = new ethers.Contract(
  'TU_DIRECCION_SWAPPER',
  SWAPPER_ABI,
  provider
);

// Verificar pool manager
const pm = await swapper.poolManager();
console.log('PoolManager:', pm);
// Debe mostrar: 0x498581fF718922c3f8e6A244956aF099B2652b2b

// Verificar versión
const version = await swapper.version();
console.log('Version:', version);
// Debe mostrar: 1.0.0
```

## 🐛 Problemas Comunes

### Error: "Out of gas"

➡️ **Solución**: Aumentar gas limit en MetaMask o usar más ETH

### Error: "Revert: Only PoolManager"

➡️ **Solución**: Verificar que PoolManager address es correcta

### Error: "Import not found"

➡️ **Solución**: Usar imports de GitHub directo o copiar interfaces

### Contrato no se verifica

➡️ **Solución**: 
- Verificar versión del compilador exacta
- Verificar optimización settings
- Usar Flatten si tienes múltiples archivos

## 📝 Direcciones para Referencia

| Componente | Dirección |
|------------|-----------|
| **PoolManager** | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| **ADRIAN Token** | `0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea` |
| **Hook** | `0x2546FA3eA62Ac09029b1eA1Bae00eAD9Cb2500CC` |

## 🎉 ¡Listo!

Una vez desplegado y actualizado el config, tu interfaz de swap estará completamente funcional.

Usuarios podrán:
- ✅ Comprar ADRIAN con ETH
- ✅ Vender ADRIAN por ETH
- ✅ Ver precios en tiempo real
- ✅ Configurar slippage
- ✅ Ver historial de transacciones

---

**¿Necesitas ayuda?** 

- Discord: https://discord.gg/ZtyBkXGtwd
- X: https://x.com/adriancerda

¡Buena suerte con el despliegue! 🚀

