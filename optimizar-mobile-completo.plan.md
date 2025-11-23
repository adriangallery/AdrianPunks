# Plan: Versión Móvil Completa y Responsiva

## Objetivo
Crear una versión móvil optimizada y completa de `activity/index.html` basada en el commit `6b635b66`, implementando todas las funcionalidades necesarias sin crashes.

## Pasos

### 1. Renombrar archivos
- Renombrar `activity/index.html` → `activity/indexbackup.html`
- Renombrar `activity/index-mobile.html` → `activity/index.html`
- Esto preserva la versión original como backup

### 2. Restaurar versión base del commit 6b635b66
- Usar `git show 6b635b66:activity/index-mobile.html` como base
- Esta versión tiene la estructura limpia sin crashes

### 3. Implementar carga de reglas JSON
- Función `loadRules()` que carga:
  - `./rules/address-tags.json` → `addressTagsRules`
  - `./rules/image-rules.json` → `imageRules`
  - `./rules/event-rules.json` → `eventRules`
- Llamar `loadRules()` en `init()` antes de cargar datos

### 4. Implementar todas las consultas de Supabase
En `fetchEvents()`, agregar consultas para todos los contratos:

#### 4.1 FloorEngine (ya implementado parcialmente)
- `listing_events` (Listed, Cancelled)
- `trade_events` (Bought)
- `sweep_events` (FloorSweep)
- `engine_config_events` (PremiumUpdated, MaxBuyPriceUpdated)

#### 4.2 ERC20
- `erc20_transfers` (Transfer)
- `erc20_approvals` (Approval)
- `erc20_custom_events` (Staked, WithdrawnStake, TaxFeeUpdated, etc.)

#### 4.3 AdrianLABCore (ERC721)
- `erc721_transfers` (Transfer)
- `erc721_approvals` (Approval)
- `erc721_approvals_for_all` (ApprovalForAll)
- `erc721_custom_events` (TokenMinted, TokenBurnt, SkinAssigned, etc.)

#### 4.4 ERC1155 (AdrianLAB)
- `erc1155_transfers_single` (TransferSingle)
- `erc1155_transfers_batch` (TransferBatch)
- `erc1155_approvals_for_all` (ApprovalForAll)
- `erc1155_uri_updates` (URI)
- `erc1155_custom_events` (AssetMinted, AssetBurned, PackOpened, SerumUsed)

#### 4.5 TraitsExtensions
- `traits_extensions_events` (TraitApplied, TraitsAppliedBatch, AssetAddedToInventory, TraitRemoved)

#### 4.6 AdrianShop
- `shop_events` (ItemPurchased, BatchPurchase, ItemListed, ItemDelisted)

#### 4.7 AdrianNameRegistry (NUEVO)
- `name_registry_events` (NameSet, NameRemoved)
- `name_registry_config_events` (PriceUpdated, TreasuryUpdated)
- Dirección: `0xaeC5ED33c88c1943BB7452aC4B571ad0b4c4068C`

#### 4.8 AdrianSerumModule (NUEVO)
- `serum_module_events` (SerumApplied, SerumFailed)
- Dirección: mantener placeholder `0x0000000000000000000000000000000000000000` por ahora

#### 4.9 PunkQuest (NUEVO)
- `punk_quest_staking_events` (Staked, Unstaked)
- `punk_quest_item_events` (ItemPurchased, ItemUsed)
- `punk_quest_event_events` (EventStarted, EventCompleted)
- Dirección: mantener placeholder `0x0000000000000000000000000000000000000000` por ahora

### 5. Implementar renderizado completo de eventos
- Función `formatEventDetails(event)` que maneje todos los tipos de eventos
- Incluir todos los campos relevantes según el tipo de evento
- Usar `shortAddress()` para direcciones
- Usar `formatADRIAN()` para valores en wei

### 6. Implementar sistema de imágenes completo
- `getNFTImageUrl(tokenId)` - usar `imageRules.adrianPunks`
- `getAdrianLABImageUrls(tokenId)` - usar `imageRules.adrianLAB` con fallbacks (.svg, .png, .gif)
- `createAdrianLABImage(tokenId)` - con sistema de fallback usando data attributes
- `tryNextAdrianLABImage(img)` - función para intentar siguiente imagen en fallback
- `getEventImageUrl(eventType)` - usar `imageRules.eventImages`
- `createEventImage(eventType)` - para imágenes de eventos (TraitApplied, ERC20)
- `createTraitsAppliedBatchImage(event)` - imagen dinámica con tokenId y traitIds
- `getEventImage(event)` - función principal que decide qué imagen mostrar según el evento

### 7. Implementar filtrado y etiquetado contextual
- `applyEventFilteringRules(events)` - implementar regla de mints redundantes desde `eventRules.filtering.redundantMints`
- `applyContextualTagging(events)` - implementar regla de FloorSweep desde `eventRules.contextualTagging.floorSweep`
- `getAddressTagBadge(address, contextualTag)` - usar `addressTagsRules` o tag contextual

### 8. Implementar Intersection Observer para scroll infinito
- Función `setupIntersectionObserver()` que:
  - Crea un elemento "sentinel" al final de la lista
  - Usa Intersection Observer API para detectar cuando el sentinel es visible
  - Carga más eventos automáticamente cuando `hasMore && !isLoading`
- Configuración: `root: null` (viewport), `rootMargin: '100px'`, `threshold: 0.1`
- Mover sentinel al final después de cada renderizado

### 9. Agregar tabs simples (sin Bootstrap)
- HTML: Dos botones simples para "Activity" y "Statistics"
- CSS: Estilos básicos para tabs activos/inactivos
- JavaScript: Funciones `showActivityTab()` y `showStatisticsTab()`
- Por ahora, solo implementar tab de Activity (Statistics será placeholder)

### 10. Agregar constantes de nuevos contratos
- `ADRIAN_NAME_REGISTRY_ADDRESS = '0xaeC5ED33c88c1943BB7452aC4B571ad0b4c4068C'`
- `ADRIAN_SERUM_MODULE_ADDRESS = '0x0000000000000000000000000000000000000000'` (placeholder)
- `PUNK_QUEST_ADDRESS = '0x0000000000000000000000000000000000000000'` (placeholder)

### 11. Agregar opciones de filtro para nuevos contratos
- En el select `#filterContract`, agregar:
  - `<option value="adriannameregistry">AdrianNameRegistry</option>`
  - `<option value="adrianserummodule">AdrianSerumModule</option>`
  - `<option value="punkquest">PunkQuest</option>`

### 12. Optimizaciones móviles
- Mantener estructura sin scroll anidado (scroll de página completa)
- Gestión de memoria: `MAX_ITEMS_IN_DOM = 100`
- Usar `DocumentFragment` para renderizado eficiente
- Lazy loading de imágenes: `loading="lazy"` y `decoding="async"`
- Simplificar HTML en móviles si es necesario

### 13. Funciones helper necesarias
- `formatADRIAN(weiString)` - formatear wei a ADRIAN con manejo de notación científica
- `shortAddress(address)` - acortar direcciones
- `formatWeiString(weiValue)` - convertir notación científica a string decimal
- `createCollapsibleAddress(address, label)` - direcciones colapsables (opcional)

## Archivos a modificar
- `activity/index.html` (nuevo, desde index-mobile.html)
- `activity/indexbackup.html` (renombrado desde index.html actual)

## Archivos de referencia
- `activity/rules/address-tags.json`
- `activity/rules/image-rules.json`
- `activity/rules/event-rules.json`
- `activity/indexbackup.html` (para consultar implementaciones complejas si es necesario)

## Notas importantes
- No usar Bootstrap para tabs inicialmente (solo CSS simple)
- Mantener código limpio y modular
- Evitar doble carga de datos
- Asegurar que Intersection Observer se limpie correctamente
- Manejar errores de carga de imágenes gracefully
- Usar placeholders para direcciones de contratos no disponibles aún

