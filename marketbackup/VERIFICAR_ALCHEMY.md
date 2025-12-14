# 🔍 Verificar Configuración de Alchemy

## Tu Configuración Actual

```javascript
API Key: 5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot
Endpoint: https://base-mainnet.g.alchemy.com/v2/5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot
Network: Base Mainnet (Chain ID: 8453)
```

## ⚠️ IMPORTANTE: Verificar tu Plan

Aunque dices que tienes plan de pago, los errores 429 sugieren que podrías estar:

1. **Todavía en FREE tier** sin saberlo
2. **Usando la API key equivocada** (free tier en lugar de paid)
3. **Límites agotados** (Compute Units mensuales)

## 🔎 Cómo Verificar

### Opción 1: Herramienta Automática
Abre en tu navegador:
```
market/verificar-alchemy.html
```

Esta herramienta te mostrará:
- ✅ Si la API key funciona
- ⚡ Prueba de rate limits
- 📊 Latencia de respuesta

### Opción 2: Verificación Manual

1. **Ve al Dashboard de Alchemy:**
   ```
   https://dashboard.alchemy.com
   ```

2. **Busca tu app "Base Mainnet"**

3. **Verifica estas cosas:**

   #### A) Plan Actual
   ```
   Settings → Billing → Current Plan
   ```
   Debería decir: **Growth** (o superior)
   
   #### B) API Key Correcta
   ```
   Dashboard → View Key
   ```
   Compara con: `5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot`
   
   ⚠️ **Si tienes varias API keys**, asegúrate de usar la del plan de pago!

   #### C) Compute Units
   ```
   Dashboard → Usage
   ```
   - **FREE**: 300M CU/mes
   - **GROWTH**: 3B CU/mes (10x más)
   
   Si ya gastaste tus CU mensuales, tendrás errores 429 aunque tengas plan de pago.

   #### D) Rate Limits
   ```
   Dashboard → Rate Limits
   ```
   - **FREE**: ~25-100 req/s (varía)
   - **GROWTH**: ~330 req/s
   - **SCALE**: ~660 req/s

   #### E) Restricciones de Dominio
   ```
   Settings → Security → Allowlist
   ```
   Si tienes restricciones, agrega:
   - `adriangallery.github.io`
   - `localhost` (para desarrollo)

## 🚨 Problemas Comunes

### Error 1: API Key del FREE tier
**Síntoma:** Errores 429 a pesar de tener plan de pago

**Solución:**
1. Ve a tu app en Alchemy Dashboard
2. Verifica que el plan sea "Growth" (no "Free")
3. Si tienes múltiples apps, asegúrate de usar la API key correcta
4. Crea una NUEVA API key desde la app de pago
5. Actualiza `market/supabase-config.js`

### Error 2: Compute Units Agotados
**Síntoma:** Funcionaba bien pero ahora da 429

**Solución:**
1. Ve a Dashboard → Usage
2. Revisa "Compute Units Used This Month"
3. Si alcanzaste el límite:
   - Espera al próximo mes
   - O actualiza a plan superior

### Error 3: Múltiples Apps Mezcladas
**Síntoma:** Confusión sobre qué API key usar

**Solución:**
1. En Dashboard, lista todas tus apps
2. Identifica cuál tiene plan de pago
3. Usa SOLO la API key de esa app
4. Borra o desactiva las otras apps para evitar confusión

## ✅ Configuración Correcta Confirmada Cuando:

```
✅ Dashboard muestra plan "Growth" o superior
✅ API key coincide con la del plan de pago
✅ Compute Units disponibles > 0
✅ Rate limits son ~330 req/s o más
✅ Sin restricciones de dominio (o allowlist configurado)
✅ Endpoint correcto: https://base-mainnet.g.alchemy.com/v2/[TU_API_KEY]
```

## 🔧 Actualizar API Key (si es necesario)

Si descubres que necesitas usar otra API key:

1. **En Alchemy Dashboard:**
   - Ve a tu app de pago en Base Mainnet
   - Copy la API key correcta

2. **Actualiza el repositorio:**
   ```bash
   # Opción A: Editar localmente
   nano market/supabase-config.js
   # Cambia la línea 4 con la nueva API key
   
   # Opción B: GitHub Secrets (recomendado)
   # Ve a: Settings → Secrets and variables → Actions
   # Edita: ALCHEMY_API_KEY
   ```

3. **Re-deploy:**
   ```bash
   git add market/supabase-config.js
   git commit -m "Actualizar API key de Alchemy"
   git push
   ```

## 📊 Monitoreo Post-Verificación

Después de confirmar la configuración correcta:

1. **Abre la consola del browser** en tu marketplace
2. **Busca estos logs:**
   ```
   ✅ Alchemy API key loaded successfully
   API Key (masked): 5qIXA1UZ...W7Ot
   ```

3. **NO deberías ver:**
   ```
   ❌ POST https://base-mainnet.g.alchemy.com/v2/... 429
   ⚠️ Error 429, reintentando...
   ```

4. **Deberías ver cada 60s:**
   ```
   📊 Cache Stats: X hits, Y misses (Z% hit rate)
   ```

## 💡 Recomendación Final

**Si después de verificar TODO lo anterior siguen los errores 429:**

1. Contacta directamente a Alchemy Support:
   ```
   support@alchemy.com
   ```
   
2. Menciona:
   - Plan actual (Growth/Scale)
   - API key afectada (últimos 4 chars)
   - Errores 429 a pesar de optimizaciones
   - Request para revisar tu cuenta

3. Pide que verifiquen:
   - Límites aplicados a tu cuenta
   - Posibles throttling no documentados
   - Migración correcta de Free a Paid tier

---

**Archivo creado:** 2025-11-20  
**Última actualización:** Después de implementar optimizaciones  
**Estado:** Configuración en verificación

