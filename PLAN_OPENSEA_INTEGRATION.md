# Plan de Integración OpenSea en marketosintegration/

## Objetivo
Integrar listings de OpenSea en el market, mostrándolos junto con los listings de FloorEngine y usuarios, priorizando el más barato después de convertir todos los precios a ETH.

## Estado Actual
- ✅ `market/` está funcionando correctamente (commit 7a7f185)
- ✅ GitHub Secrets configurados:
  - `OPENSEA_API_KEY`
  - `OPENSEA_MCP_TOKEN`
  - `OPENSEA_COLLECTION_SLUG`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `ALCHEMY_API_KEY`

## Estructura de Trabajo

### Fase 1: Preparación del Entorno
1. **Crear `marketosintegration/`** (usuario lo creará)
   - Copia completa de `market/` para trabajar sin afectar producción
   - Incluir todos los módulos y dependencias

### Fase 2: Creación del Módulo OpenSea
2. **Crear `marketosintegration/modules/opensea-integration.js`**
   - Función `init()`: Inicializar con configuración desde `opensea-config.js`
   - Función `fetchOpenSeaListings()`: Llamar a OpenSea API v2
   - Función `processOpenSeaListings()`: Convertir respuesta a formato interno
   - Función `getConversionRatio()`: Obtener ratio ADRIAN/ETH desde `QuoteManager` o `PriceManager`
   - Función `convertPriceToETH()`: Convertir precios ADRIAN a ETH para comparación
   - Función `mergeListings()`: Combinar listings de todas las fuentes, priorizando más barato
   - Cache de 5 minutos para evitar rate limits

### Fase 3: Actualización del Workflow de Deployment
3. **Modificar `.github/workflows/deploy-market.yml`**
   - Generar `opensea-config.js` en `market/` desde GitHub Secrets
   - Generar `opensea-config.js` en `marketosintegration/` también (si se despliega)
   - Incluir `marketosintegration/**` en los triggers del workflow si es necesario

### Fase 4: Integración en marketosintegration/index.html
4. **Cargar scripts de configuración**
   - Añadir `<script src="./opensea-config.js"></script>` antes de los módulos
   - Añadir `<script src="modules/opensea-integration.js"></script>` después de los módulos de FloorEngine

5. **Modificar `loadActiveListings()`**
   - Cargar listings de OpenSea en paralelo con Supabase
   - Esperar a que `PriceManager` y `QuoteManager` estén listos (evento `swapModulesReady`)
   - Llamar a `OpenSeaIntegration.mergeListings()` para combinar y ordenar
   - Actualizar `activeListingsData` con el resultado mergeado

6. **Modificar `displayNFTs()`**
   - Detectar si el listing es de OpenSea (`listing.source === 'opensea'`)
   - Mostrar badge "OPENSEA" con colores de marca (gradiente azul/violeta)
   - Mostrar precio en ETH para listings de OpenSea
   - Cambiar botón a "Buy on OpenSea" que redirige al `permalink`

7. **Modificar `showNFTDetails()`**
   - Verificar `activeListingsData` primero (incluye OpenSea)
   - Si hay listing de OpenSea, mostrar detalles con badge y precio en ETH
   - Botón "Buy on OpenSea" que abre el permalink en nueva pestaña

8. **Añadir estilos CSS**
   - Estilos para `.badge.opensea-badge` con gradiente de marca OpenSea
   - Soporte para dark mode

### Fase 5: Validación y Testing
9. **Verificar funcionamiento**
   - Listings de OpenSea aparecen en el grid
   - Precios convertidos correctamente a ETH
   - Merge prioriza el listing más barato
   - Badges y botones funcionan correctamente
   - No hay errores en consola

### Fase 6: Deployment
10. **Copiar cambios a `market/`**
    - Una vez validado en `marketosintegration/`, copiar cambios a `market/`
    - Verificar que el workflow genera los archivos de configuración correctamente
    - Hacer commit y push

## Consideraciones Importantes

### No Modificar `market/` Directamente
- ❌ NO hacer cambios en `market/` hasta que todo esté validado en `marketosintegration/`
- ✅ Trabajar exclusivamente en `marketosintegration/`
- ✅ Solo copiar a `market/` cuando todo funcione

### Manejo de Configuración
- Los archivos `opensea-config.js` y `runtime-config.js` se generan durante el deployment
- En desarrollo local, estos archivos pueden no existir (manejar gracefully)
- El módulo debe esperar a que los scripts se carguen antes de inicializar

### Conversión de Precios
- OpenSea: precios en ETH (ya están en la unidad correcta)
- FloorEngine/USER: precios en $ADRIAN (necesitan conversión)
- Usar ratio ADRIAN/ETH desde `QuoteManager.cachedRatio` o calcular desde `PriceManager`
- Si no hay ratio disponible, mostrar warning pero no fallar

### Ordenamiento
- Convertir todos los precios a ETH
- Ordenar por precio en ETH (ascendente)
- Para tokens duplicados, mostrar solo el más barato

## Checklist de Implementación

- [ ] Fase 1: `marketosintegration/` creado
- [ ] Fase 2: Módulo `opensea-integration.js` creado y funcional
- [ ] Fase 3: Workflow actualizado para generar configs
- [ ] Fase 4.1: Scripts cargados en `index.html`
- [ ] Fase 4.2: `loadActiveListings()` integrado con OpenSea
- [ ] Fase 4.3: `displayNFTs()` muestra listings de OpenSea
- [ ] Fase 4.4: `showNFTDetails()` muestra detalles de OpenSea
- [ ] Fase 4.5: Estilos CSS añadidos
- [ ] Fase 5: Validación completa
- [ ] Fase 6: Cambios copiados a `market/` y desplegados

## Notas Técnicas

### OpenSea API v2
- Endpoint: `https://api.opensea.io/api/v2/listings/collection/{slug}/all`
- Headers: `X-API-KEY` (opcional pero recomendado)
- Parámetros: `limit`, `order_by`, `order_direction`
- Respuesta: Array de listings con `protocol_data`, `price`, `maker`, etc.

### Formato de Listing Interno
```javascript
{
  tokenId: number,
  price: BigNumber, // en wei (ETH o ADRIAN según source)
  priceETH: number, // precio en ETH (para comparación)
  seller: string,
  source: 'opensea' | 'floorengine',
  isContractOwned: boolean,
  permalink?: string, // solo para OpenSea
  orderHash?: string // solo para OpenSea
}
```

### Prioridad de API Keys
1. `OPENSEA_API_KEY_FALLBACK` (si existe)
2. `OPENSEA_MCP_TOKEN`
3. `OPENSEA_API_KEY`


