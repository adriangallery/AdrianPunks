# 🚀 Quick Start - ADRIAN Swap

## ✅ El Swap Está Listo para Usar AHORA

Todo está configurado y funcionando. ¡Puedes hacer swaps inmediatamente!

---

## 📍 Información del Contrato Desplegado

- **Dirección**: `0xA4542337205a9C129C01352CD204567bB0E91878`
- **Red**: Base Mainnet (Chain ID: 8453)
- **BaseScan**: https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
- **Estado**: ✅ Verificado y Operativo

---

## 🎯 Usar el Swap en 3 Pasos

### 1️⃣ Abrir la Interfaz

```bash
# Desde tu computadora
open swap/index.html

# O navega a la carpeta /swap/ y abre index.html
```

### 2️⃣ Conectar Wallet

1. Click en "Connect Wallet"
2. Aprobar en MetaMask
3. La app cambiará automáticamente a Base Mainnet
4. Verás tus balances de ETH y ADRIAN

### 3️⃣ Hacer tu Primer Swap

**Comprar ADRIAN con ETH:**
1. Asegúrate que "ETH" está seleccionado arriba
2. Ingresa la cantidad de ETH (ej: 0.001)
3. Verás cuánto ADRIAN recibirás (con 10% tax incluido)
4. Click en "Swap ETH → ADRIAN"
5. Aprobar en MetaMask
6. ¡Listo! Recibirás ADRIAN en segundos

**Vender ADRIAN por ETH:**
1. Click en el botón de intercambio ⇅
2. Ahora "ADRIAN" estará arriba
3. Ingresa la cantidad de ADRIAN
4. Si es tu primera vez, necesitarás aprobar (2 transacciones)
5. Click en "Swap ADRIAN → ETH"
6. Aprobar en MetaMask
7. ¡Listo! Recibirás ETH en segundos

---

## ⚙️ Configuración (Opcional)

Click en el icono ⚙️ para ajustar:

- **Slippage**: Por defecto 1% (adicional al 10% tax)
- **Deadline**: Tiempo máximo para la transacción (20 min por defecto)
- **Modo Experto**: Desactiva confirmaciones (no recomendado)

---

## 💡 Tips Útiles

### Balance Mínimo
- Para comprar: Ten al menos 0.001 ETH (más gas ~0.0002 ETH)
- Para vender: Ten ADRIAN + ETH para gas (~0.0002 ETH)

### Gas Fees
- Base Mainnet es muy barato: ~$0.01-0.05 por transacción
- Las transacciones se confirman en 1-2 segundos

### Tax del 10%
- Se aplica automáticamente en TODOS los swaps
- Ya está incluido en la cotización que ves
- Se distribuye: 9.8% FloorEngine, 0.1% Treasury, 0.1% TaxReaper

### Botón MAX
- Click en "MAX" para usar todo tu balance
- Si es ETH, deja un poco para gas automáticamente

### Precio en Tiempo Real
- La cotización se actualiza mientras escribes
- Se recalcula cada 10 segundos
- Usa `staticCall` para simular sin gastar gas

---

## 📊 Ver tus Transacciones

### En la Interfaz
- Scroll hacia abajo
- Verás "Transacciones Recientes"
- Click en "Ver en BaseScan ↗" para detalles

### En BaseScan
Todas tus transacciones aparecen en:
```
https://basescan.org/address/TU_WALLET_ADDRESS
```

---

## 🔧 Troubleshooting Rápido

### "Red Incorrecta"
➡️ Click en el banner "Cambiar a Base" o cambia manualmente en MetaMask

### "Saldo Insuficiente"
➡️ Verifica que tienes suficiente ETH/ADRIAN + gas

### "Slippage Excedido"
➡️ Aumenta el slippage en configuración (⚙️) a 2% o 5%

### "Aprobar ADRIAN"
➡️ Normal la primera vez que vendes ADRIAN. Es 1 transacción extra de ~$0.01

### No Carga la Cotización
➡️ Verifica que estás conectado y en Base Mainnet. Recarga la página.

---

## 🚀 Deploy a Producción

Una vez probado y todo funciona:

```bash
# Commit y push
git add swap/
git commit -m "Add ADRIAN Swap interface - Fully functional"
git push origin main

# En 1-2 minutos estará en:
# https://adrianpunks.com/swap/
```

---

## 📱 Usar en Mobile

El swap es 100% mobile-friendly:

1. Abre en navegador móvil (Chrome/Safari)
2. Asegúrate de tener MetaMask mobile instalado
3. El menú se colapsa automáticamente
4. Todos los botones son touch-friendly
5. Los inputs usan teclado numérico

---

## 🎮 Probar Funcionalidad Completa

```bash
# 1. Conectar wallet
#    ✅ Debe mostrar tu dirección

# 2. Ver balances
#    ✅ Debe mostrar ETH y ADRIAN

# 3. Ingresar 0.001 ETH
#    ✅ Debe calcular ADRIAN a recibir

# 4. Hacer swap
#    ✅ MetaMask debe abrir
#    ✅ Confirmar transacción
#    ✅ Ver en BaseScan

# 5. Ver historial
#    ✅ Debe aparecer en "Transacciones Recientes"

# 6. Probar en mobile
#    ✅ Debe verse bien y funcionar
```

---

## 📈 Estadísticas y Monitoreo

### Ver Actividad del Pool
- Pool en Uniswap: https://app.uniswap.org/explore/pools/base/0x79cdf2d48abd42872a26d1b1c92ece4245327a4837b427dc9cff5f1acc40e379

### Ver Actividad del Swapper
- BaseScan del contrato: https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
- Ver todas las transacciones
- Ver holders
- Ver eventos

### Debug en Consola
```javascript
// Ver estado completo
debugSwap()

// Ver configuración
console.log(CONFIG)

// Ver último quote
console.log(QuoteManager.lastQuote)

// Ver transacciones recientes
console.log(SwapManager.recentTransactions)
```

---

## 🎉 ¡Eso es Todo!

El swap está **100% operativo**. 

**No necesitas configurar nada más**. Solo:
1. Abre `index.html`
2. Conecta wallet
3. ¡Swap!

---

## 📞 Soporte

Si algo no funciona:

1. **Revisa la consola** (F12 en Chrome) para ver errores
2. **Verifica la red** (debe ser Base Mainnet)
3. **Comprueba gas** (necesitas un poco de ETH)
4. **Pregunta en Discord**: https://discord.gg/ZtyBkXGtwd

---

**¡Feliz Swapping!** 🚀💰

*El swap cobra un 10% de tax en cada transacción que va a:*
- *9.8% → FloorEngine (compra NFTs del floor)*
- *0.1% → Treasury (desarrollo)*
- *0.1% → TaxReaper (burns)*

*Este sistema ayuda a mantener el ecosistema AdrianPunks saludable.*

