# Configuración de Alchemy RPC

## 🚀 RPC Actual

El swap está configurado para usar **Alchemy** como RPC provider principal, con fallback al RPC público de Base.

### RPC Configurado

```javascript
rpcUrls: [
  'https://base-mainnet.g.alchemy.com/v2/GCEoq-nQ0_6rZZI8CuoTEfILyQN6fR2M', // Alchemy
  'https://mainnet.base.org' // Fallback público
]
```

## ✅ Ventajas de Usar Alchemy

- ✅ **Más rápido**: 10x más rápido que RPC público
- ✅ **Más confiable**: 99.9% uptime garantizado
- ✅ **Sin rate limits**: Miles de requests por segundo
- ✅ **Mejor caché**: Respuestas instantáneas
- ✅ **Websockets**: Soporte para eventos en tiempo real

## 🔑 Usar tu Propia API Key (Opcional)

Si quieres usar tu propia cuenta de Alchemy:

### 1. Crear Cuenta en Alchemy

1. Ir a https://www.alchemy.com/
2. Sign up gratis
3. Crear una nueva app para **Base Mainnet**

### 2. Obtener API Key

1. En tu dashboard, ve a tu app
2. Copia el API Key (formato: `YOUR-API-KEY`)

### 3. Actualizar config.js

Editar línea 15 en `swap/config.js`:

```javascript
rpcUrls: [
  'https://base-mainnet.g.alchemy.com/v2/TU-API-KEY-AQUI', // ← Cambiar aquí
  'https://mainnet.base.org'
]
```

## 📊 Plan Gratuito de Alchemy

El plan gratuito incluye:

- **300M** compute units por mes
- **Requests ilimitados** (sujeto a compute units)
- **Websockets** incluidos
- **Sin tarjeta de crédito** requerida

Para el swap de ADRIAN, el plan gratuito es **más que suficiente**.

## 🔍 Verificar RPC Actual

En la consola del navegador:

```javascript
// Ver configuración actual
console.log(CONFIG.BASE_MAINNET.rpcUrls)

// Probar conexión
const provider = new ethers.BrowserProvider(window.ethereum);
const network = await provider.getNetwork();
console.log('Connected to:', network);
```

## 🌐 Otros RPC Providers (Alternativas)

Si prefieres usar otro provider:

### Infura
```javascript
'https://base-mainnet.infura.io/v3/YOUR-API-KEY'
```

### QuickNode
```javascript
'https://YOUR-ENDPOINT.base.quiknode.pro/YOUR-TOKEN/'
```

### Público (Gratis pero limitado)
```javascript
'https://mainnet.base.org'
'https://base.publicnode.com'
```

## 🚨 Rate Limits

### Con Alchemy (Actual)
- ✅ Sin rate limits prácticos
- ✅ 300M compute units/mes (gratuito)
- ✅ ~3M requests/día aproximadamente

### Sin Alchemy (RPC Público)
- ⚠️ ~30-100 requests/minuto
- ⚠️ Puede fallar en momentos de alto tráfico
- ⚠️ Más lento (300-500ms vs 50-100ms)

## 💡 Recomendación

**Mantén la configuración actual con Alchemy**. La API key incluida es suficiente para el swap de ADRIAN y está configurada específicamente para este proyecto.

Si experimentas problemas o necesitas más capacidad, crea tu propia cuenta gratuita en Alchemy.

---

**Actualizado**: Diciembre 11, 2025
**Estado**: ✅ Configurado y Funcionando

