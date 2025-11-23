# 📊 Documentación de Estadísticas y Métricas - $ADRIAN Token ERC20

## 🎯 CONTEXTO

Este documento describe toda la información nueva disponible en la base de datos para generar estadísticas y métricas del token **$ADRIAN** (ERC20) en el frontend.

### Información del Contrato

- **Nombre**: $ADRIAN Token
- **Dirección**: `0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea` (lowercase: `0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea`)
- **Red**: Base Mainnet (Chain ID: 8453)
- **Explorer**: https://basescan.org/address/0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea
- **Bloque de Deployment**: `26367738` (hace ~9 meses)
- **Tipo**: ERC20 con funcionalidades extendidas (staking, fees, gallery)

### Características del Token

1. **Transferencias Estándar**: Transferencias normales entre wallets
2. **Sistema de Fees**: Tax fee, creator fee, burn fee configurables
3. **Staking**: Sistema de staking con recompensas
4. **Gallery Actions**: Acciones especiales relacionadas con la galería
5. **Fee Exemptions**: Direcciones exentas de fees

---

## 🗄️ ESTRUCTURA DE TABLAS

### Tabla 1: `erc20_transfers`

**Propósito**: Histórico completo de todas las transferencias del token

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGINT | Primary key (auto-increment) |
| `contract_address` | TEXT | Dirección del contrato (siempre `0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea`) |
| `from_address` | TEXT | Dirección origen (lowercase) |
| `to_address` | TEXT | Dirección destino (lowercase) |
| `value_wei` | NUMERIC | Cantidad transferida en wei (1 token = 10^18 wei) |
| `tx_hash` | TEXT | Hash de la transacción |
| `log_index` | INTEGER | Índice del log en la transacción |
| `block_number` | BIGINT | Número de bloque |
| `created_at` | TIMESTAMPTZ | Timestamp de creación |

**Constraints**:
- `UNIQUE(tx_hash, log_index)` - Garantiza idempotencia

**Índices**:
- `idx_erc20_transfers_contract_address` - Búsqueda por contrato
- `idx_erc20_transfers_from_address` - Búsqueda por remitente
- `idx_erc20_transfers_to_address` - Búsqueda por destinatario
- `idx_erc20_transfers_block_number` - Ordenamiento por bloque

**Notas Importantes**:
- `from_address = '0x0000000000000000000000000000000000000000'` indica minting (creación de tokens)
- `to_address = '0x0000000000000000000000000000000000000000'` indica burning (quema de tokens)
- Todos los valores están en wei (dividir por 1e18 para obtener tokens)

---

### Tabla 2: `erc20_approvals`

**Propósito**: Histórico de aprobaciones de gasto (permisos para que otra dirección gaste tokens)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGINT | Primary key |
| `contract_address` | TEXT | Dirección del contrato |
| `owner` | TEXT | Dueño de los tokens (lowercase) |
| `spender` | TEXT | Dirección autorizada para gastar (lowercase) |
| `value_wei` | NUMERIC | Cantidad aprobada en wei |
| `tx_hash` | TEXT | Hash de la transacción |
| `log_index` | INTEGER | Índice del log |
| `block_number` | BIGINT | Número de bloque |
| `created_at` | TIMESTAMPTZ | Timestamp |

**Constraints**:
- `UNIQUE(tx_hash, log_index)`

**Índices**:
- `idx_erc20_approvals_contract_address`
- `idx_erc20_approvals_owner`
- `idx_erc20_approvals_spender`
- `idx_erc20_approvals_block_number`

**Notas**:
- `value_wei = 0` indica revocación de aprobación
- Útil para tracking de permisos a contratos (DEX, staking, etc.)

---

### Tabla 3: `erc20_custom_events`

**Propósito**: Eventos custom del contrato (configuración, staking, gallery, etc.)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | BIGINT | Primary key |
| `contract_address` | TEXT | Dirección del contrato |
| `event_name` | TEXT | Nombre del evento (ver lista abajo) |
| `event_data` | JSONB | Datos del evento (estructura varía por tipo) |
| `tx_hash` | TEXT | Hash de la transacción |
| `log_index` | INTEGER | Índice del log |
| `block_number` | BIGINT | Número de bloque |
| `created_at` | TIMESTAMPTZ | Timestamp |

**Constraints**:
- `UNIQUE(tx_hash, log_index)`

**Índices**:
- `idx_erc20_custom_events_contract_address`
- `idx_erc20_custom_events_event_name`
- `idx_erc20_custom_events_block_number`
- `idx_erc20_custom_events_event_data` (GIN index para búsquedas JSONB)

**Tipos de Eventos**:

1. **TaxFeeUpdated**: Cambio en la tax fee
   ```json
   {
     "newTaxFee": "500"  // En basis points (500 = 5%)
   }
   ```

2. **CreatorFeeUpdated**: Cambio en la creator fee
   ```json
   {
     "newCreatorFee": "200"  // En basis points
   }
   ```

3. **BurnFeeUpdated**: Cambio en la burn fee
   ```json
   {
     "newBurnFee": "100"  // En basis points
   }
   ```

4. **TaxAddressUpdated**: Cambio en la dirección que recibe tax
   ```json
   {
     "newTaxAddress": "0x..."  // Dirección en lowercase
   }
   ```

5. **CreatorAddressUpdated**: Cambio en la dirección del creador
   ```json
   {
     "newCreatorAddress": "0x..."
   }
   ```

6. **FeeExemptionUpdated**: Cambio en exención de fees para una dirección
   ```json
   {
     "account": "0x...",
     "isExempt": true  // o false
   }
   ```

7. **Staked**: Tokens staked por un usuario
   ```json
   {
     "staker": "0x...",
     "amount": "1000000000000000000"  // En wei
   }
   ```

8. **WithdrawnStake**: Retiro de staking con recompensas
   ```json
   {
     "staker": "0x...",
     "amount": "1000000000000000000",  // Cantidad retirada
     "reward": "50000000000000000"     // Recompensa ganada
   }
   ```

9. **RewardRateUpdated**: Cambio en la tasa de recompensas de staking
   ```json
   {
     "newRewardRate": "1000"  // En basis points
   }
   ```

10. **GalleryAction**: Acción relacionada con la galería
    ```json
    {
      "from": "0x...",
      "to": "0x...",
      "amount": "1000000000000000000",
      "action": "purchase"  // u otro tipo de acción
    }
    ```

---

## 📊 QUERIES PARA ESTADÍSTICAS Y MÉTRICAS

### 1. Estadísticas Generales del Token

#### Total de Transferencias
```sql
SELECT COUNT(*) as total_transfers
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea';
```

#### Volumen Total Transferido
```sql
SELECT 
  SUM(value_wei::numeric / 1e18) as total_volume_tokens,
  COUNT(DISTINCT from_address) as unique_senders,
  COUNT(DISTINCT to_address) as unique_receivers
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea';
```

#### Transferencias por Día
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transfers_count,
  SUM(value_wei::numeric / 1e18) as volume_tokens
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

### 2. Estadísticas de Minting y Burning

#### Total de Tokens Minted
```sql
SELECT 
  SUM(value_wei::numeric / 1e18) as total_minted
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND from_address = '0x0000000000000000000000000000000000000000';
```

#### Total de Tokens Burned
```sql
SELECT 
  SUM(value_wei::numeric / 1e18) as total_burned
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND to_address = '0x0000000000000000000000000000000000000000';
```

#### Supply Circulante (Aproximado)
```sql
SELECT 
  (SELECT COALESCE(SUM(value_wei::numeric / 1e18), 0) 
   FROM erc20_transfers
   WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
     AND from_address = '0x0000000000000000000000000000000000000000') -
  (SELECT COALESCE(SUM(value_wei::numeric / 1e18), 0)
   FROM erc20_transfers
   WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
     AND to_address = '0x0000000000000000000000000000000000000000') 
  as circulating_supply;
```

---

### 3. Estadísticas por Usuario/Wallet

#### Balance Actual de un Usuario
```sql
SELECT 
  (SELECT COALESCE(SUM(value_wei::numeric / 1e18), 0)
   FROM erc20_transfers
   WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
     AND to_address = '0x...') -
  (SELECT COALESCE(SUM(value_wei::numeric / 1e18), 0)
   FROM erc20_transfers
   WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
     AND from_address = '0x...')
  as current_balance;
```

#### Historial de Transferencias de un Usuario
```sql
SELECT 
  block_number,
  CASE 
    WHEN from_address = '0x...' THEN 'sent'
    WHEN to_address = '0x...' THEN 'received'
  END as type,
  CASE 
    WHEN from_address = '0x...' THEN to_address
    WHEN to_address = '0x...' THEN from_address
  END as counterparty,
  value_wei::numeric / 1e18 as amount,
  tx_hash,
  created_at
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND (from_address = '0x...' OR to_address = '0x...')
ORDER BY block_number DESC
LIMIT 100;
```

#### Top Holders (Top 10)
```sql
WITH balances AS (
  SELECT 
    COALESCE(received.total, 0) - COALESCE(sent.total, 0) as balance,
    COALESCE(received.address, sent.address) as address
  FROM (
    SELECT to_address as address, SUM(value_wei::numeric / 1e18) as total
    FROM erc20_transfers
    WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
    GROUP BY to_address
  ) received
  FULL OUTER JOIN (
    SELECT from_address as address, SUM(value_wei::numeric / 1e18) as total
    FROM erc20_transfers
    WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
    GROUP BY from_address
  ) sent ON received.address = sent.address
)
SELECT 
  address,
  balance
FROM balances
WHERE balance > 0
ORDER BY balance DESC
LIMIT 10;
```

---

### 4. Estadísticas de Staking

#### Total de Tokens Staked
```sql
SELECT 
  SUM((event_data->>'amount')::numeric / 1e18) as total_staked
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'Staked';
```

#### Total de Recompensas Distribuidas
```sql
SELECT 
  SUM((event_data->>'reward')::numeric / 1e18) as total_rewards_distributed
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'WithdrawnStake';
```

#### Top Stakers
```sql
SELECT 
  event_data->>'staker' as staker,
  SUM((event_data->>'amount')::numeric / 1e18) as total_staked,
  COUNT(*) as stake_events
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'Staked'
GROUP BY event_data->>'staker'
ORDER BY total_staked DESC
LIMIT 10;
```

#### Staking por Período
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as stake_events,
  SUM((event_data->>'amount')::numeric / 1e18) as staked_tokens
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'Staked'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

### 5. Estadísticas de Fees

#### Historial de Cambios de Fees
```sql
SELECT 
  event_name,
  event_data->>'newTaxFee' as tax_fee,
  event_data->>'newCreatorFee' as creator_fee,
  event_data->>'newBurnFee' as burn_fee,
  block_number,
  created_at
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name IN ('TaxFeeUpdated', 'CreatorFeeUpdated', 'BurnFeeUpdated')
ORDER BY block_number DESC;
```

#### Configuración Actual de Fees
```sql
SELECT 
  event_name,
  CASE 
    WHEN event_name = 'TaxFeeUpdated' THEN event_data->>'newTaxFee'
    WHEN event_name = 'CreatorFeeUpdated' THEN event_data->>'newCreatorFee'
    WHEN event_name = 'BurnFeeUpdated' THEN event_data->>'newBurnFee'
  END as fee_value,
  block_number,
  created_at
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name IN ('TaxFeeUpdated', 'CreatorFeeUpdated', 'BurnFeeUpdated')
ORDER BY block_number DESC
LIMIT 3;
```

#### Direcciones Exentas de Fees
```sql
SELECT DISTINCT
  event_data->>'account' as exempt_address,
  MAX((event_data->>'isExempt')::boolean) as is_exempt,
  MAX(block_number) as last_update_block
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'FeeExemptionUpdated'
GROUP BY event_data->>'account'
HAVING MAX((event_data->>'isExempt')::boolean) = true;
```

---

### 6. Estadísticas de Gallery Actions

#### Total de Gallery Actions
```sql
SELECT 
  COUNT(*) as total_actions,
  SUM((event_data->>'amount')::numeric / 1e18) as total_volume
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'GalleryAction';
```

#### Gallery Actions por Tipo
```sql
SELECT 
  event_data->>'action' as action_type,
  COUNT(*) as count,
  SUM((event_data->>'amount')::numeric / 1e18) as total_volume
FROM erc20_custom_events
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND event_name = 'GalleryAction'
GROUP BY event_data->>'action'
ORDER BY count DESC;
```

---

### 7. Estadísticas de Aprobaciones (Approvals)

#### Total de Aprobaciones Activas
```sql
SELECT 
  COUNT(*) as total_approvals,
  COUNT(DISTINCT owner) as unique_owners,
  COUNT(DISTINCT spender) as unique_spenders
FROM erc20_approvals
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND value_wei::numeric > 0;
```

#### Top Spenders (Contratos más aprobados)
```sql
SELECT 
  spender,
  COUNT(DISTINCT owner) as unique_approvers,
  MAX(value_wei::numeric / 1e18) as max_approval
FROM erc20_approvals
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND value_wei::numeric > 0
GROUP BY spender
ORDER BY unique_approvers DESC
LIMIT 10;
```

---

### 8. Estadísticas Temporales (Time Series)

#### Actividad por Hora
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as transfers,
  SUM(value_wei::numeric / 1e18) as volume
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

#### Actividad por Semana
```sql
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as transfers,
  COUNT(DISTINCT from_address) as unique_senders,
  COUNT(DISTINCT to_address) as unique_receivers,
  SUM(value_wei::numeric / 1e18) as volume
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

---

### 9. Estadísticas Comparativas (Cross-Contract)

#### Actividad Total: FloorEngine vs ERC20
```sql
SELECT 
  'FloorEngine' as source,
  COUNT(*) as events,
  SUM(price_wei::numeric / 1e18) as volume_eth
FROM trade_events

UNION ALL

SELECT 
  'ERC20 Transfers' as source,
  COUNT(*) as events,
  SUM(value_wei::numeric / 1e18) as volume_tokens
FROM erc20_transfers
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea';
```

#### Usuarios Activos en Ambos Ecosistemas
```sql
SELECT 
  address,
  COUNT(DISTINCT 'FloorEngine') as floor_engine_trades,
  COUNT(DISTINCT 'ERC20') as erc20_transfers
FROM (
  SELECT buyer as address, 'FloorEngine' as source
  FROM trade_events
  UNION ALL
  SELECT seller as address, 'FloorEngine' as source
  FROM trade_events
  UNION ALL
  SELECT from_address as address, 'ERC20' as source
  FROM erc20_transfers
  WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
  UNION ALL
  SELECT to_address as address, 'ERC20' as source
  FROM erc20_transfers
  WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
) combined
GROUP BY address
HAVING COUNT(DISTINCT source) = 2
ORDER BY floor_engine_trades + erc20_transfers DESC
LIMIT 20;
```

---

## 📈 MÉTRICAS CLAVE PARA EL FRONTEND

### Dashboard Principal

1. **Total Supply**
   - Tokens minted - Tokens burned

2. **Circulating Supply**
   - Balance total de todos los holders (excluyendo burn address)

3. **Total Holders**
   - Direcciones únicas con balance > 0

4. **24h Volume**
   - Suma de transferencias en las últimas 24 horas

5. **24h Transactions**
   - Número de transferencias en las últimas 24 horas

6. **Total Staked**
   - Suma de todos los stakes activos

7. **Total Rewards Distributed**
   - Suma de todas las recompensas de staking

### Página de Usuario

1. **Balance Actual**
   - Balance del usuario

2. **Total Received**
   - Suma de todas las transferencias recibidas

3. **Total Sent**
   - Suma de todas las transferencias enviadas

4. **Staking Stats**
   - Total staked actual
   - Total rewards ganados
   - Número de stakes realizados

5. **Transaction History**
   - Lista de todas las transferencias (sent/received)

### Página de Staking

1. **Total Staked (Global)**
2. **Total Rewards Distributed**
3. **Current Reward Rate**
4. **Top Stakers**
5. **Staking History** (por día/semana)

### Página de Analytics

1. **Volume Chart** (por día/semana/mes)
2. **Transaction Count Chart**
3. **Holder Growth Chart**
4. **Staking Activity Chart**
5. **Top Holders Table**
6. **Top Traders Table**

---

## 🔗 RELACIONES CON DATOS EXISTENTES

### Relación con FloorEngine

Los datos de ERC20 pueden relacionarse con FloorEngine a través de direcciones de wallet:

```sql
-- Usuarios que han hecho trades en FloorEngine Y tienen $ADRIAN
SELECT DISTINCT
  t.buyer as address,
  (SELECT SUM(value_wei::numeric / 1e18)
   FROM erc20_transfers
   WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
     AND (from_address = t.buyer OR to_address = t.buyer)) as adrian_balance
FROM trade_events t
WHERE EXISTS (
  SELECT 1
  FROM erc20_transfers
  WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea'
    AND (from_address = t.buyer OR to_address = t.buyer)
)
LIMIT 10;
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Conversión de Wei a Tokens**: Siempre dividir por `1e18` (10^18)
2. **Direcciones en Lowercase**: Todas las direcciones se almacenan en lowercase
3. **Idempotencia**: Los eventos están garantizados como únicos por `(tx_hash, log_index)`
4. **Timestamps**: Usar `created_at` para ordenamiento temporal (más confiable que `block_number` para comparaciones)
5. **Burn Address**: `0x0000000000000000000000000000000000000000` se usa para minting/burning
6. **JSONB Queries**: Para eventos custom, usar operadores JSONB de PostgreSQL (`->`, `->>`, `@>`)

---

## 🚀 EJEMPLOS DE API ENDPOINTS SUGERIDOS

### GET /api/erc20/stats
Retorna estadísticas generales del token

### GET /api/erc20/holders/top
Retorna top holders

### GET /api/erc20/user/:address/balance
Retorna balance actual de un usuario

### GET /api/erc20/user/:address/history
Retorna historial de transferencias de un usuario

### GET /api/erc20/staking/stats
Retorna estadísticas de staking

### GET /api/erc20/staking/top
Retorna top stakers

### GET /api/erc20/volume/chart
Retorna datos para gráfico de volumen (time series)

### GET /api/erc20/transactions/chart
Retorna datos para gráfico de transacciones (time series)

---

## 📝 FORMATO DE RESPUESTA SUGERIDO

```json
{
  "success": true,
  "data": {
    "totalSupply": "1000000000.0",
    "circulatingSupply": "950000000.0",
    "totalHolders": 1234,
    "volume24h": "50000.0",
    "transactions24h": 150,
    "totalStaked": "10000000.0",
    "totalRewardsDistributed": "500000.0"
  },
  "timestamp": "2025-01-18T21:00:00Z"
}
```

---

## 🔄 ACTUALIZACIÓN DE DATOS

Los datos se actualizan en tiempo real mediante el bot listener que:
- Sincroniza eventos cada 1 minuto (configurable)
- Procesa bloques desde el deployment (bloque 26367738)
- Maneja rate limiting automáticamente
- Usa sincronización histórica cuando hay muchos bloques pendientes

**Última Sincronización**: Verificar en tabla `sync_state`:
```sql
SELECT 
  contract_address,
  last_synced_block,
  updated_at
FROM sync_state
WHERE contract_address = '0x7e99075ce287f1cf8cbcaaa6a1c7894e404fd7ea';
```

---

## 📚 REFERENCIAS

- **Contrato en Basescan**: https://basescan.org/address/0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea
- **Documentación de Schema**: Ver `DATABASE_SCHEMA.md`
- **Documentación de FloorEngine**: Ver `PROMPT_PARA_LLM.md`

---

**Última Actualización**: 2025-01-18
**Versión**: 1.0.0

