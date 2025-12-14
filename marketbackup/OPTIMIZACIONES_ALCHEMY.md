# Optimizaciones de Rate Limiting para Alchemy API

## Problema Identificado

La aplicación estaba recibiendo errores **429 (Too Many Requests)** de Alchemy API debido a:
1. Llamadas API sin control de rate limiting
2. Múltiples llamadas individuales en loops (cientos de requests)
3. Sin sistema de caché para datos que no cambian frecuentemente
4. Reinicialización innecesaria de contratos
5. Falta de retry logic con exponential backoff

## Soluciones Implementadas

### 1. **Rate Limiter** ✅
- Implementado un sistema de rate limiting: **25 requests por segundo**
- Control automático de ventana deslizante
- Espera inteligente cuando se alcanza el límite

```javascript
class RateLimiter {
  constructor(maxRequests = 25, windowMs = 1000)
  async waitForSlot() // Espera automáticamente si es necesario
}
```

### 2. **Retry Logic con Exponential Backoff** ✅
- Reintentos automáticos en errores 429
- Backoff exponencial: 1s, 2s, 4s, 8s, 16s
- Máximo 5 reintentos antes de fallar
- Jitter aleatorio para evitar thundering herd

```javascript
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 1000)
```

### 3. **Sistema de Caché** ✅
- TTL configurable (default: 30 segundos)
- Caché automático para:
  - Active listings del FloorEngine
  - Balance del FloorEngine
  - Información de Sweep Floor
- Estadísticas de hit/miss rate
- Limpieza automática al cambiar de cuenta

```javascript
class SimpleCache {
  constructor(ttlMs = 30000)
  get(key), set(key, value), clear()
  getStats() // Monitoreo de rendimiento
}
```

### 4. **Multicall3 Batch Requests** ✅
- Reemplazados loops individuales con batch calls
- `loadActiveListings()`: De N llamadas → 1 llamada multicall
- `updateSweepFloorInfo()`: De 6+ llamadas → 1 llamada multicall
- Reducción de ~95% en llamadas para listings

**Antes:**
```javascript
for (const tokenId of listedTokenIds) {
  const listing = await floorEngineReadContract.listings(tokenId); // N llamadas
}
```

**Después:**
```javascript
const results = await multicallReadContract.aggregate3(calls); // 1 llamada
```

### 5. **Optimización de initContracts()** ✅
- Evita reinicialización innecesaria de providers
- Verifica si ya está inicializado antes de continuar
- Elimina llamadas duplicadas a `updateFloorEngineBalance()`

### 6. **Uso de readProvider** ✅
- Todas las llamadas de lectura usan `readProvider` (Alchemy)
- Evita prompts de wallet innecesarios
- Mejor performance y menos overhead

## Impacto Esperado

### Antes de Optimizaciones:
- ~100-200 llamadas API en carga inicial
- Sin control de rate limiting
- Errores 429 frecuentes
- Sin retry logic

### Después de Optimizaciones:
- ~10-20 llamadas API en carga inicial (**90% reducción**)
- Rate limiting automático (25 req/s)
- Retry inteligente con backoff
- Caché para datos frecuentes
- Batch requests con Multicall3

## Monitoreo

### Console Logs:
```
🚀 Iniciando aplicación con optimizaciones...
✅ Rate Limiter: 25 req/segundo con exponential backoff
✅ Cache: 30 segundos TTL
✅ Multicall3: Batch requests optimizadas
📊 Cache Stats: 15 hits, 5 misses (75.0% hit rate), 3 items
```

### Estadísticas de Caché:
- Se muestran cada 60 segundos
- Hit rate: % de llamadas evitadas por caché
- Size: número de items cacheados

## Funciones Optimizadas

| Función | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| `loadActiveListings()` | N llamadas | 1 multicall | ~95% |
| `updateSweepFloorInfo()` | 6+ llamadas | 1 multicall | ~85% |
| `updateFloorEngineBalance()` | 1 llamada c/vez | Caché 30s | ~90% |
| `initContracts()` | Siempre reinicia | Skip si ya existe | 100% |

## Configuración de Alchemy

La API key se carga desde `supabase-config.js`:
```javascript
window.ALCHEMY_API_KEY = '5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot';
```

## Próximos Pasos (Opcional)

1. **Aumentar Rate Limit** si tienes plan Growth:
   ```javascript
   const rateLimiter = new RateLimiter(50, 1000); // 50 req/s
   ```

2. **Ajustar TTL de Caché** según necesidades:
   ```javascript
   const contractCache = new SimpleCache(60000); // 60 segundos
   ```

3. **Implementar Service Worker** para caché persistente entre sesiones

4. **WebSocket** para actualizaciones en tiempo real (reduce polling)

## Testing

1. Abre la consola del navegador
2. Recarga la página
3. Verifica los logs de optimización
4. Espera 60s para ver estadísticas de caché
5. No deberías ver errores 429

---

**Fecha de implementación:** 2025-11-20  
**Versión del mercado:** v4.0.1  
**Estado:** ✅ Implementado y probado

