# TigerPunks — Plan vivo (builder + colección)

> Documento de trabajo. Última actualización: 2026-06-07.
> Live: https://adrianpunks.com/tigerbuilder.html · Repo: `AdrianPunks/` · On-chain PoC: `tigerpunks-onchain/`

---

## ⚠️ DECISIONES PENDIENTES (bloquean el plan detallado de la colección)

Antes de diseñar el plan definitivo de minteo/colección hay que decidir:

1. **Mecánica de minteo** (AÚN ABIERTA — mantener ambas en juego):
   - **A) Build-your-own → mint:** el usuario diseña en el builder y mintea ESA combinación. Más creativo, usa el builder tal cual. Requiere política de duplicados/unicidad.
   - **B) Subasta diaria estilo nouns:** 1 TigerPunk autogenerado/día desde seed on-chain, subasta inglesa en $ZERO, settle→mint→siguiente.
   - (Posible híbrido: build-your-own para el público + un "1/día" curado por subasta.)
2. **Rareza de traits:** ¿hay rareza/pesos por trait? ¿quién la define?
   - Si **build-your-own**: ¿la rareza importa o es "diseña libre"? ¿se limita el uso de traits raros? ¿traits desbloqueables?
   - Si **nouns/aleatorio**: definir pesos por trait y por categoría (tabla de rareza on-chain).
   - ¿Algún trait es 1/1 o legendario (p.ej. fondo/skin especiales)?
3. **Supply y modelo económico:**
   - ¿Supply fijo (p.ej. 1.000 / 10.000) o abierto/perpetuo (nouns)?
   - Precio de mint en $ZERO (o subasta). ¿100% burn, treasury, split?
4. **Unicidad:** ¿se permiten TigerPunks con traits idénticos? Si no, hash on-chain de la combinación para rechazar duplicados.
5. **Skins/fondos como traits oficiales:** los skins (Classic/Tiger/Tan/Zombie/Alien/Albino/Ape/Ghost) y fondos (Orange/Dark/Light) ¿cuentan como atributos con rareza? Hoy son generados por código.
6. **Relación con AdrianPunks/$ZERO:** ¿holders de AdrianPunks tienen ventaja (free/allowlist)? ¿se integra en adrianzero.com?
7. **Customización post-mint:** ¿NFT interactivo (quemar $ZERO para cambiar traits, estilo AdrianLAB/TraitLAB) sí/no?

> **Acción:** resolver estos puntos → luego convertir la sección "Roadmap colección on-chain" en plan ejecutable con números.

---

## ✅ Estado actual (hecho y verificado)

### Builder (LIVE, off-chain) — simplificado 2026-06-07
- `tigerbuilder.html` en adrianpunks.com/tigerbuilder. Estética Bootstrap de adrianpunks.com + navbar compartido. **Tema claro único** (dark mode eliminado). **UI en inglés.**
- Capas: **Background** (Orange/Dark/Light) · **Skin** (Classic/Alien/Zombie/Tiger — recolor de la cara blanca) · **Traits**: Beard, Mouth, Eyes, Hair, Hat, Misc(multi).
- Base = cara limpia (sin 3D Glitch/anaglifo; look CryptoPunk). `traits/Base/base.png`.
- Funciones: picker manual, randomizer seed-determinista (mulberry32), descarga PNG (badge HalfxTiger), **export SVG** (72×72, técnica svgmaker), compartir (Web Share/X), galería localStorage, panel Attributes → JSON.
- Data-driven vía `tigerpunks/manifest.json`. Cache-busting (`VERSION` + `?v=`) + meta no-cache.
- **Eliminado 2026-06-07:** sección 3D Glitch + recolor, categoría Top (+archivos), skins Tan/Albino/Ape/Ghost, dark mode.

### On-chain PoC (VALIDADO end-to-end, NO desplegado)
- `tigerpunks-onchain/` (Foundry). `TigerData.sol` (paleta+RLE) + `TigerRenderer.sol` (`renderSVG`→SVG 100% on-chain) + test forge PASS.
- **Salida del contrato verificada visualmente = idéntica al builder.**
- ⚠️ Los datos del PoC (`TigerData.sol`) se generaron ANTES de la simplificación (incluyen base 50% glitch + Top, ya no existentes). Regenerar al construir el renderer de producción con los traits actuales.

### Hallazgos clave
- **Arte completo (90 traits) on-chain = 19.6 KB** (paleta 119 colores + RLE). Cabe en 1 chunk SSTORE2.
- **Coste Base:** deploy único arte+renderer ~**$5–20**; mint ~**$0.05–0.30**; `tokenURI` (lectura) **gratis**.
- **Fully on-chain confirmado:** SVG generado en `tokenURI` (`data:application/json` + `image=data:image/svg+xml`). **OpenSea/Blur lo leen y muestran atributos.**
- Token típico ~493 rects / SVG ~30 KB.

---

## 🛠️ Roadmap — Builder (optimizaciones, agnóstico a mecánica)

- [ ] **Gorros:** decidir definitivo entre semitransparencia restaurada (actual, muestra textura del ala sobre fondo claro) vs aplanar a sólido. (Pendiente feedback Adrian.)
- [ ] Revisar z-order y combinaciones raras (traits que chocan) caso a caso.
- [ ] Posible "share to gallery" pública / contador de creaciones.
- [ ] Pulir randomizer (pesos por categoría) — se alinea con la decisión de rareza.
- [ ] (Si aplica) integrar el builder en adrianzero.com / navegación AdrianPunks.

## 🔗 Roadmap — Colección on-chain (FASES; cerrar tras decisiones de arriba)

**Fase 1 — Renderer producción** (agnóstico a mecánica)
- [ ] Optimizar `renderSVG`: hoy ~37M gas en view (O(n²) por `abi.encodePacked`). Usar buffer pre-dimensionado para que cualquier RPC/marketplace lo trague holgado.
- [ ] Meter los **90 traits** vía **SSTORE2** (blob de 19.6 KB).
- [ ] Tablas de **skins** y **fondos** on-chain.
- [ ] `tokenURI` completo: nombre + descripción + **attributes JSON** (incl. Skin, Background, 3D, traits) + image SVG.
- [ ] Tests forge: fidelidad visual + gas + límites.

**Fase 2 — Mint** (DEPENDE de la mecánica elegida)
- Opción A build-your-own → reusar **Diamond Mint Facet Pattern** (índices desde el builder) + control de duplicados (hash de combinación).
- Opción B subasta diaria → reusar **MovieAuctionFacet** (subasta inglesa en $ZERO) + generador seed-on-chain + settle→mint→siguiente.
- [ ] Tabla/lógica de **rareza** (si aplica).
- [ ] Modelo económico ($ZERO: precio/burn/treasury).

**Fase 3 — Frontend + lanzamiento**
- [ ] Conectar el builder al mint elegido (preview = tokenURI real).
- [ ] Página de colección / mint en adrianpunks.com o adrianzero.com.
- [ ] Auditoría ligera + deploy en Base.

---

## 🧱 Piezas reutilizables del ecosistema (de memoria)
- **MovieAuctionFacet** — subasta inglesa en $ZERO (live en Base) → base para nouns-daily.
- **GumballMintFacet** — mint-on-demand pagando $ZERO → base para aleatorio.
- **Diamond Mint Facet Pattern** — mint en $ZERO con preservación de tags → base para build-your-own.
- **svgmaker** (`/Users/adrian/Documents/GitHub/svgmaker/`) — punks compuestos → SVG pixelado; técnica reusada para el export y el renderer.

## ⚠️ Gotchas registrados
- **NUNCA `%` ni espacios** en nombres de assets servidos por GitHub Pages (`%` → percent-encoding inválido → HTTP 400; `python http.server` local es permisivo → "funciona en local, no online"). Depurar local-vs-online comprobando status HTTP de cada asset.
- Cache de GitHub Pages/Cloudflare: usar cache-busting `?v=VERSION` + meta no-cache; al iterar, bump `VERSION`.
- `foundry.toml` necesita `via_ir=true` (stack too deep en el renderer).
- Manifest `dir` con prefijo `tigerpunks/` (HTML en raíz del repo).

---
*Detalle y contexto histórico en la memoria del proyecto: `project_tigerpunks.md`.*
