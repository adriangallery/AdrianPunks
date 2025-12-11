# Integración del Swap con el Ecosistema AdrianPunks

Este documento explica cómo el Swap está integrado con el resto del sitio y cómo personalizarlo.

## 🔗 Integración con el Menú Principal

El swap utiliza el mismo menú Bootstrap que el resto del sitio, pero **incluido directamente** en el HTML (no como componente externo).

### Actualizar Enlaces del Menú

Si necesitas agregar/quitar enlaces, editar en `/swap/index.html` líneas 33-62:

```html
<ul class="navbar-nav me-auto">
  <li class="nav-item">
    <a class="nav-link" href="https://adrianpunks.com">Home</a>
  </li>
  <li class="nav-item">
    <a class="nav-link" href="https://adrianpunks.com/swap/">Swap</a>
  </li>
  <!-- Agregar más aquí -->
</ul>
```

### Sincronizar con Otros Sitios

Para mantener consistencia con `/market/` y otros:

1. Copiar estructura del menú de `/components/menu.html`
2. Pegar en `/swap/index.html`
3. Añadir botones de wallet (desktop y mobile)

## 🎨 Estilos y Colores

### Herencia de Estilos

El swap hereda estilos de:

1. **Bootstrap 5.3.0** (framework base)
2. **`/market/styles.css`** (estilos compartidos)
3. **`swap-styles.css`** (estilos específicos del swap)

### Variables CSS Principales

Definidas en `/market/styles.css`:

```css
:root {
  --menu-bg: #1c1c1c;              /* Fondo del menú */
  --wallet-btn: #ff6b2b;           /* Botón de wallet (naranja) */
  --wallet-btn-hover: #ff8142;     /* Hover del botón */
  --background-color: #f0f0f0;     /* Fondo de página */
  --card-background: #ffffff;      /* Fondo de tarjetas */
  --text-primary: #04111d;         /* Texto principal */
  --text-secondary: #707a83;       /* Texto secundario */
  --border-color: #e5e8eb;         /* Bordes */
}
```

### Personalizar Colores del Swap

Editar `/swap/swap-styles.css`:

```css
/* Cambiar color del botón de swap */
.swap-btn {
  background: var(--wallet-btn);  /* ← Cambiar aquí */
}

/* Cambiar color de hover */
.swap-btn:hover:not(:disabled) {
  background: var(--wallet-btn-hover);  /* ← Cambiar aquí */
}

/* Cambiar colores de impacto de precio */
.price-impact-low { color: #10b981; }    /* Verde */
.price-impact-medium { color: #f59e0b; } /* Amarillo */
.price-impact-high { color: #ef4444; }   /* Rojo */
```

## 📱 Mobile Responsiveness

### Breakpoints

El swap usa los mismos breakpoints que el market:

```css
/* Tablet */
@media (max-width: 768px) { }

/* Mobile */
@media (max-width: 576px) { }

/* Small Mobile */
@media (max-width: 380px) { }
```

### Botón de Wallet Mobile

El menú tiene **dos botones de wallet**:

1. **Desktop**: Visible en pantallas grandes (≥992px)
2. **Mobile**: Visible en pantallas pequeñas (<992px)

Ambos están sincronizados por `wallet.js`.

## 🔄 Integración con Otras Páginas

### Añadir el Swap al Market

En `/market/index.html`, añadir link al swap en el menú:

```html
<li class="nav-item">
  <a class="nav-link" href="../swap/">Swap</a>
</li>
```

### Añadir al Home

En `/index.html`, añadir sección de swap:

```html
<div class="swap-section">
  <h2>🔄 Swap $ADRIAN</h2>
  <p>Intercambia ETH por $ADRIAN directamente en Base Mainnet</p>
  <a href="swap/" class="btn btn-primary">Ir al Swap</a>
</div>
```

## 🔌 Compartir Estado de Wallet

Si quieres que el swap comparta el estado de wallet con otras páginas:

### Opción 1: localStorage

```javascript
// En wallet.js, al conectar:
localStorage.setItem('adrian_wallet_address', this.address);
localStorage.setItem('adrian_wallet_connected', 'true');

// En otras páginas, leer:
const address = localStorage.getItem('adrian_wallet_address');
const connected = localStorage.getItem('adrian_wallet_connected');
```

### Opción 2: Query Parameters

```javascript
// Redirigir con wallet conectada:
window.location.href = `/market/?wallet=${address}`;

// En market, auto-conectar:
const urlParams = new URLSearchParams(window.location.search);
const wallet = urlParams.get('wallet');
if (wallet) WalletManager.connect();
```

## 📊 Analytics y Tracking

### Google Analytics

Para trackear eventos del swap:

```javascript
// En swap.js, después de swap exitoso:
if (typeof gtag !== 'undefined') {
  gtag('event', 'swap_success', {
    'event_category': 'Swap',
    'event_label': fromSymbol + '_to_' + toSymbol,
    'value': amountIn
  });
}
```

### Tracking de Errores

```javascript
// En swap.js, en handleSwapError:
if (typeof gtag !== 'undefined') {
  gtag('event', 'swap_error', {
    'event_category': 'Error',
    'event_label': error.message
  });
}
```

## 🌐 SEO y Meta Tags

Añadir en `<head>` de `/swap/index.html`:

```html
<!-- SEO -->
<meta name="description" content="Intercambia ETH por $ADRIAN en Base Mainnet. Swap descentralizado con Uniswap V4.">
<meta name="keywords" content="ADRIAN, swap, Base, Uniswap, DeFi, crypto">

<!-- Open Graph -->
<meta property="og:title" content="ADRIAN Swap - Intercambia ETH por $ADRIAN">
<meta property="og:description" content="Swap descentralizado en Base Mainnet">
<meta property="og:image" content="https://adrianpunks.com/adrian1.ico">
<meta property="og:url" content="https://adrianpunks.com/swap/">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="ADRIAN Swap">
<meta name="twitter:description" content="Intercambia ETH por $ADRIAN en Base">
<meta name="twitter:image" content="https://adrianpunks.com/adrian1.ico">
```

## 🔐 Seguridad

### Content Security Policy

Si usas CSP, asegúrate de permitir:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' https: data:;
  connect-src 'self' https://mainnet.base.org https://basescan.org;
">
```

### CORS para APIs

Si añades endpoints externos:

```javascript
// En config.js, asegurar HTTPS
API: {
  basescan: 'https://api.basescan.org/api',
  coingecko: 'https://api.coingecko.com/api/v3'
}
```

## 🚀 Performance

### Lazy Loading de Scripts

Para mejorar carga inicial:

```html
<!-- En index.html, añadir defer -->
<script defer src="config.js"></script>
<script defer src="network.js"></script>
<!-- etc -->
```

### Code Splitting

Si el bundle es muy grande, considera separar:

```html
<!-- Core (siempre necesario) -->
<script src="core.bundle.js"></script>

<!-- Swap (solo si se usa) -->
<script defer src="swap.bundle.js"></script>
```

## 📦 Deployment

### GitHub Pages

El swap funciona out-of-the-box en GitHub Pages.

Estructura de URLs:
- Home: `https://adrianpunks.com/`
- Market: `https://adrianpunks.com/market/`
- Swap: `https://adrianpunks.com/swap/`

### Vercel

Si usas Vercel, crear `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/swap", "destination": "/swap/index.html" },
    { "source": "/market", "destination": "/market/index.html" }
  ]
}
```

### Custom Domain

Si usas dominio custom, actualizar en:

1. `/swap/index.html` - Links del menú
2. `/CNAME` - Dominio
3. GitHub Settings → Pages → Custom domain

## 🔧 Mantenimiento

### Actualizar Uniswap V4

Si Uniswap V4 actualiza contratos:

1. Actualizar `POOL_MANAGER` en `config.js`
2. Re-desplegar `AdrianSwapper.sol`
3. Actualizar `SWAPPER_ADDRESS` en `config.js`

### Actualizar Bootstrap

Si actualizas Bootstrap:

1. Cambiar URL del CDN en `index.html`
2. Revisar breaking changes
3. Testear responsiveness

### Actualizar Ethers.js

Si actualizas ethers.js:

1. Cambiar versión del CDN
2. Revisar API changes (v5 vs v6)
3. Actualizar imports si es necesario

## 🎯 Testing Checklist

Antes de push a producción:

- [ ] Swap funciona en desktop
- [ ] Swap funciona en mobile
- [ ] Menú se colapsa correctamente en mobile
- [ ] Wallet conecta y desconecta
- [ ] Red cambia correctamente a Base
- [ ] Balances se actualizan
- [ ] Cotizaciones cargan
- [ ] Transacciones se ejecutan
- [ ] Errores se manejan bien
- [ ] Todas las páginas tienen links correctos
- [ ] Favicon se muestra
- [ ] Meta tags funcionan (preview en redes sociales)

## 📞 Soporte

Para problemas de integración:

- **Discord**: https://discord.gg/ZtyBkXGtwd
- **GitHub Issues**: (crear repo si no existe)
- **X**: https://x.com/adriancerda

---

**¡El swap está listo para producción!** 🎉

