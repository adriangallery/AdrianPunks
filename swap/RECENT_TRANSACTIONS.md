# 📊 Recent Transactions - Technical Documentation

## 🔍 Cómo Funcionan Actualmente

### **Implementación Actual**

Las "Recent Transactions" están implementadas en `swap/swap.js` y funcionan así:

#### **1. Almacenamiento Local (localStorage)**
```javascript
// En swap.js
addRecentTransaction(tx) {
  this.recentTransactions.unshift(tx); // Añade al inicio
  // Guarda en localStorage
  localStorage.setItem('adrian_swap_recent_txs', JSON.stringify(...));
}
```

**Características:**
- ✅ Solo guarda transacciones de la wallet conectada
- ✅ Se guardan en `localStorage` del navegador
- ✅ Máximo 10 transacciones (configurable en `CONFIG.MAX_RECENT_TXS`)
- ✅ Se persisten entre sesiones
- ❌ No se sincronizan entre dispositivos
- ❌ Solo muestra transacciones que el usuario hizo desde esta UI

#### **2. Datos Guardados**
```javascript
{
  hash: "0x...",           // Transaction hash
  from: "ETH",             // Token origen
  to: "ADRIAN",            // Token destino
  amount: "0.001",        // Cantidad
  timestamp: 1234567890    // Timestamp
}
```

#### **3. Cuándo Se Guardan**
- Solo cuando el usuario ejecuta un swap exitoso desde esta UI
- Se guarda automáticamente en `handleSwapSuccess()`
- No se obtienen del blockchain directamente

---

## 🌐 Cómo Obtener Transacciones Globales

Para mostrar **todas las transacciones del contrato** (no solo las del usuario), hay varias opciones:

### **Opción 1: BaseScan API (Más Fácil)** ⭐

**Ventajas:**
- ✅ Gratis (hasta cierto límite)
- ✅ Fácil de implementar
- ✅ No requiere infraestructura propia
- ✅ Datos actualizados

**Implementación:**
```javascript
// Obtener transacciones del contrato AdrianSwapper
async function getGlobalTransactions() {
  const contractAddress = '0xA4542337205a9C129C01352CD204567bB0E91878';
  const apiKey = 'YOUR_BASESCAN_API_KEY'; // Opcional pero recomendado
  
  const url = `https://api.basescan.org/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Filtrar solo swaps (métodos buyAdrian/sellAdrian)
  const swaps = data.result.filter(tx => 
    tx.methodId === '0x55c27deb' || // buyAdrian
    tx.methodId === '0xf85980a4'    // sellAdrian
  );
  
  return swaps;
}
```

**Límites:**
- Free tier: 5 calls/sec
- Con API key: 5 calls/sec (más generoso)

---

### **Opción 2: The Graph (Más Complejo pero Escalable)**

**Ventajas:**
- ✅ Indexado y optimizado
- ✅ Queries GraphQL
- ✅ Escalable
- ✅ Datos históricos completos

**Desventajas:**
- ❌ Requiere crear un subgraph
- ❌ Más complejo de implementar
- ❌ Tiempo de setup inicial

**Implementación:**
```javascript
// Query GraphQL
const query = `
  {
    swaps(
      where: { contract: "0xA4542337205a9C129C01352CD204567bB0E91878" }
      orderBy: timestamp
      orderDirection: desc
      first: 50
    ) {
      id
      hash
      from
      to
      amount
      timestamp
      user
    }
  }
`;
```

---

### **Opción 3: Eventos del Contrato (Más Técnico)**

**Ventajas:**
- ✅ Datos directos del contrato
- ✅ No depende de APIs externas
- ✅ Siempre actualizado

**Desventajas:**
- ❌ Requiere indexar eventos
- ❌ Más lento para queries históricas
- ❌ Necesita RPC calls

**Implementación:**
```javascript
// Escuchar eventos SwapExecuted
const swapperContract = new ethers.Contract(
  CONFIG.SWAPPER_ADDRESS,
  SWAPPER_ABI,
  provider
);

// Obtener eventos pasados
const filter = swapperContract.filters.SwapExecuted();
const events = await swapperContract.queryFilter(filter, fromBlock, toBlock);

// Parsear eventos
const transactions = events.map(event => ({
  hash: event.transactionHash,
  user: event.args.user,
  from: event.args.zeroForOne ? 'ETH' : 'ADRIAN',
  to: event.args.zeroForOne ? 'ADRIAN' : 'ETH',
  amount: event.args.amountSpecified.toString(),
  timestamp: (await provider.getBlock(event.blockNumber)).timestamp
}));
```

---

## 🎯 Recomendación: BaseScan API

Para tu caso, **BaseScan API es la mejor opción** porque:

1. ✅ **Fácil de implementar** - Solo un fetch
2. ✅ **Gratis** - Suficiente para mostrar transacciones recientes
3. ✅ **Sin infraestructura** - No necesitas servidor
4. ✅ **Actualizado** - Datos en tiempo real

### **Implementación Sugerida:**

```javascript
// En swap.js o nuevo archivo transactions.js

const TransactionManager = {
  // Obtener transacciones globales del contrato
  async getGlobalTransactions(limit = 20) {
    try {
      const contractAddress = CONFIG.SWAPPER_ADDRESS;
      const url = `https://api.basescan.org/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=desc&page=1&offset=${limit}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        // Filtrar solo swaps
        const swaps = data.result
          .filter(tx => {
            // buyAdrian: 0x55c27deb
            // sellAdrian: 0xf85980a4
            return tx.methodId === '0x55c27deb' || tx.methodId === '0xf85980a4';
          })
          .map(tx => ({
            hash: tx.hash,
            from: tx.methodId === '0x55c27deb' ? 'ETH' : 'ADRIAN',
            to: tx.methodId === '0x55c27deb' ? 'ADRIAN' : 'ETH',
            amount: ethers.formatEther(tx.value || '0'),
            timestamp: parseInt(tx.timeStamp) * 1000,
            user: tx.from
          }));
        
        return swaps;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching global transactions:', error);
      return [];
    }
  },
  
  // Combinar transacciones globales con locales
  async updateRecentTransactionsUI() {
    // Obtener transacciones globales
    const globalTxs = await this.getGlobalTransactions(20);
    
    // Obtener transacciones locales del usuario
    const localTxs = SwapManager.recentTransactions;
    
    // Combinar y ordenar por timestamp
    const allTxs = [...globalTxs, ...localTxs]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // Top 20 más recientes
    
    // Actualizar UI
    this.renderTransactions(allTxs);
  }
};
```

---

## 📝 Notas Importantes

### **Rate Limits de BaseScan:**
- Sin API key: 5 calls/sec
- Con API key: 5 calls/sec (pero más generoso)
- **Solución**: Cachear resultados por 30-60 segundos

### **Privacidad:**
- Las transacciones en blockchain son públicas
- Mostrar transacciones globales es normal en DeFi
- Puedes opcionalmente ocultar direcciones de wallet (mostrar solo primeros/last 4 chars)

### **Performance:**
- Cachear resultados para evitar rate limits
- Actualizar cada 30-60 segundos
- Mostrar loading state mientras carga

---

## 🚀 Próximos Pasos

1. **Obtener API key de BaseScan** (opcional pero recomendado):
   - Ve a: https://basescan.org/apis
   - Crea cuenta gratuita
   - Obtén API key

2. **Implementar función de fetch**:
   - Crear `TransactionManager.getGlobalTransactions()`
   - Filtrar solo swaps (buyAdrian/sellAdrian)
   - Parsear datos al formato esperado

3. **Actualizar UI**:
   - Mostrar transacciones globales
   - Opcional: Marcar transacciones del usuario actual
   - Añadir refresh button

4. **Añadir cache**:
   - Guardar resultados en memoria
   - Refrescar cada 60 segundos
   - Evitar rate limits

---

## 📚 Recursos

- **BaseScan API Docs**: https://docs.basescan.org/api
- **The Graph**: https://thegraph.com
- **Ethers.js Events**: https://docs.ethers.org/v6/api/contract/#Contract-queryFilter

