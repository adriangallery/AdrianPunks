# ADRIAN Swap Interface

Interfaz de usuario personalizada para realizar swaps entre **$ADRIAN** y **ETH** en Base Mainnet utilizando Uniswap V4.

## 🚀 Características

- ✅ Interfaz moderna y responsive (mobile-friendly)
- ✅ Integración completa con Uniswap V4 en Base Mainnet
- ✅ Soporte para MetaMask y wallets compatibles
- ✅ Cambio automático de red a Base Mainnet
- ✅ Cálculo de precios en tiempo real
- ✅ Sistema de slippage configurable
- ✅ Historial de transacciones recientes
- ✅ Tax del 10% automático integrado
- ✅ Diseño consistente con AdrianPunks Market

## 📦 Estructura del Proyecto

```
/swap/
├── index.html           # Página principal
├── swap-styles.css      # Estilos personalizados
├── config.js            # Configuración (tokens, contratos, etc.)
├── network.js           # Gestión de red (Base Mainnet)
├── wallet.js            # Gestión de wallet (conexión, balances)
├── quotes.js            # Cálculo de precios y cotizaciones
├── swap.js              # Ejecución de transacciones
├── app.js               # Orquestador principal
├── abis/
│   ├── erc20.js        # ABI del token ERC20
│   └── swapper.js      # ABI del contrato Swapper
└── README.md           # Este archivo
```

## ⚙️ Configuración

### ✅ El Contrato Ya Está Desplegado

**¡Buenas noticias!** El contrato `AdrianSwapper` ya está desplegado en Base Mainnet y listo para usar:

- **Dirección**: `0xA4542337205a9C129C01352CD204567bB0E91878`
- **BaseScan**: https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
- **Deployment Tx**: https://basescan.org/tx/0x2449866ccfc13cf863bea788e6437b55846ef5f4e4a2ef734dc3fc9d1e56b097

**No necesitas hacer nada**, el `config.js` ya tiene la dirección correcta configurada.

### 1. (Opcional) Revisar el Contrato en BaseScan

Si quieres ver el código verificado del contrato:

1. Ir a https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
2. Clic en "Contract" → "Read Contract" / "Write Contract"
3. Ver las funciones `buyAdrian` y `sellAdrian`

#### Código del Contrato (Para Referencia)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AdrianSwapper is IUnlockCallback {
    using CurrencyLibrary for Currency;

    IPoolManager public immutable poolManager;
    
    // Pool ADRIAN/ETH con nuestro hook
    address constant ADRIAN = 0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea;
    address constant HOOK = 0x2546FA3eA62Ac09029b1eA1Bae00eAD9Cb2500CC;
    uint24 constant FEE = 0;
    int24 constant TICK_SPACING = 60;

    struct SwapCallbackData {
        address sender;
        bool zeroForOne;
        int256 amountSpecified;
        uint256 ethValue;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    function buyAdrian(uint256 amountIn) external payable returns (uint256 amountOut) {
        require(msg.value == amountIn, "ETH mismatch");
        
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            zeroForOne: true,
            amountSpecified: -int256(amountIn),
            ethValue: msg.value
        });

        bytes memory result = poolManager.unlock(abi.encode(data));
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        amountOut = uint256(int256(delta.amount1()));
    }

    function sellAdrian(uint256 amountIn) external returns (uint256 amountOut) {
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            zeroForOne: false,
            amountSpecified: -int256(amountIn),
            ethValue: 0
        });

        bytes memory result = poolManager.unlock(abi.encode(data));
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        amountOut = uint256(int256(delta.amount0()));
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");

        SwapCallbackData memory data = abi.decode(rawData, (SwapCallbackData));

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(ADRIAN),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        uint160 sqrtPriceLimitX96 = data.zeroForOne 
            ? 4295128740
            : 1461446703485210103287273052203988822378723970340;

        BalanceDelta delta = poolManager.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: data.zeroForOne,
                amountSpecified: data.amountSpecified,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            bytes("")
        );

        int256 delta0 = delta.amount0();
        int256 delta1 = delta.amount1();

        if (delta0 < 0) {
            poolManager.settle{value: uint256(-delta0)}();
        }
        if (delta1 < 0) {
            poolManager.sync(poolKey.currency1);
            IERC20(ADRIAN).transferFrom(data.sender, address(poolManager), uint256(-delta1));
            poolManager.settle();
        }

        if (delta0 > 0) {
            poolManager.take(poolKey.currency0, data.sender, uint256(delta0));
        }
        if (delta1 > 0) {
            poolManager.take(poolKey.currency1, data.sender, uint256(delta1));
        }

        return abi.encode(delta);
    }

    receive() external payable {}
}

interface IHooks {}
```

### 2. ¡Listo para Usar!

El swap está **completamente funcional** ahora mismo. Solo necesitas:

1. Abrir `/swap/index.html` en tu navegador
2. Conectar tu wallet
3. ¡Hacer swaps!

**No se requiere configuración adicional**. Todo está listo.

## 🎨 Personalización

### Colores y Estilos

Los estilos heredan del marketplace (`/market/styles.css`):

- **Color primario (naranja)**: `#ff6b2b`
- **Fuente**: Share Tech Mono
- **Tema**: Retro/Robótico

Para personalizar, editar `swap-styles.css`.

### Configuración de Slippage

Por defecto: **1%** (adicional al 10% de tax)

Ajustable desde el modal de configuración (⚙️).

## 🔗 Direcciones de Contratos

### Base Mainnet

| Contrato | Dirección |
|----------|-----------|
| **ADRIAN Token** | `0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea` |
| **PoolManager** | `0x498581fF718922c3f8e6A244956aF099B2652b2b` |
| **Hook** | `0x2546FA3eA62Ac09029b1eA1Bae00eAD9Cb2500CC` |
| **Swapper** | ⚠️ **Por desplegar** |

## 📱 Mobile Friendly

La interfaz está completamente optimizada para móviles:

- Diseño responsive con Bootstrap 5
- Botones táctiles grandes
- Menú colapsable
- Inputs optimizados para teclado numérico
- Breakpoints en 768px, 576px y 380px

## 🔐 Seguridad

- ✅ Verificación de red antes de transacciones
- ✅ Validación de balances
- ✅ Sistema de aprobaciones ERC20
- ✅ Manejo de errores completo
- ✅ Slippage protection
- ✅ Deadline de transacción

## 🧪 Testing

### Probar en Tesnet (Opcional)

Si quieres probar primero en testnet:

1. Cambiar configuración de red en `config.js`
2. Desplegar contrato en Base Sepolia
3. Usar tokens de prueba

### Verificar Funcionalidad

1. **Conectar Wallet**: Debe mostrar dirección
2. **Cambiar Red**: Debe detectar y solicitar cambio a Base
3. **Ver Balances**: Debe mostrar ETH y ADRIAN
4. **Cotizar**: Ingresar cantidad debe calcular precio
5. **Aprobar**: Para vender ADRIAN debe solicitar aprobación
6. **Swap**: Debe ejecutar transacción y actualizar balances

## 📊 Información del Tax

- **Total Tax**: 10% en cada transacción
- **Distribución**:
  - FloorEngine: 9.8% → `0x0351F7cBA83277E891D4a85Da498A7eACD764D58`
  - Treasury: 0.1% → `0x83Aa2CE87E4D037FaA3EbC9b2df64c2a88e222d0`
  - TaxReaper: 0.1% → `0xcEf912AB1934f8A0DC7A5F628E9704bdC17c6194`

El tax se aplica **automáticamente** por el hook de Uniswap V4.

## 🐛 Troubleshooting

### Error: "Swapper contract not deployed"

➡️ **Solución**: Desplegar el contrato AdrianSwapper y actualizar `config.js`

### Error: "Red incorrecta"

➡️ **Solución**: Clic en "Cambiar a Base" o cambiar manualmente en MetaMask

### Error: "Saldo insuficiente"

➡️ **Solución**: Verificar que tienes suficiente ETH/ADRIAN + gas fees

### Error: "Slippage excedido"

➡️ **Solución**: Aumentar slippage en configuración (⚙️)

### Cotización no carga

➡️ **Solución**: Verificar conexión RPC, recargar página

## 📚 Recursos

- **BaseScan**: https://basescan.org
- **Uniswap V4 Docs**: https://docs.uniswap.org/contracts/v4/overview
- **Base Docs**: https://docs.base.org

## 🤝 Soporte

Para problemas o preguntas:

- Discord: https://discord.gg/ZtyBkXGtwd
- X (Twitter): https://x.com/adriancerda

## 📝 Licencia

MIT License - AdrianPunks 2024-2025

---

**¡Disfruta del swap!** 🚀

