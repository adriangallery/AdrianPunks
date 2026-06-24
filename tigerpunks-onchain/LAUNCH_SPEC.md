# TigerPunks — Launch Spec (decisiones cerradas 2026-06-20)

## Mecánica
- **Aleatorio curado** sobre set curado de **10.000** (HalfXTiger cura). NO build-your-own.
- **Reveal RETARDADO** con random offset post-mint (anti-sniping). Placeholder "mystery" on-chain durante el mint; `reveal()` fija el offset vía blockhash tras acabar → todos se revelan.
- Mint vía **SeaDrop** (mint page propia, NO drop hosted de OpenSea). Builder = preview/marketing.

## Red
- **FINAL: Ethereum mainnet** (ETH) — confirmado por Adrian con plena info de que su ecosistema está en Base. Minters pagan gas ETH (~$2-5/mint).
- **Tests: Base** (coste ~0, OpenSea lo ve) — ya desplegado test 10k en `0xd603…633a`.

## Direcciones del ecosistema (TODAS en Base)
- **FiftyFifty** (split 50/50 artist/dev): `0x6190DF4949BAd254999CAB1E620BD524B04E34b4` — **solo en Base**. Fuente: `Contratos/AdrianPunks/fiftyfifty.sol`.
- **AdrianPunks** (NFT, 1000 supply): `0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566` — **solo en Base**.
- ⚠️ **TAREA por ir a ETH**: redesplegar **FiftyFifty en Ethereum mainnet** (o dar otra wallet receptora ETH) → será el `creatorPayout` SeaDrop + receptor royalties. Snapshot de holders AdrianPunks se hace en Base (direcciones) → Merkle válido en ETH.

## Fases de mint (4 fases, ventana 10 min entre cada una)
- **Precio de pago: 0.001 ETH/mint.** Máx 100/wallet en pública.
1. **Holders FREE**: holders AdrianPunks, **3 gratis** c/u (allowlist Merkle, price 0, max 3).
2. **Holders PAID**: holders AdrianPunks, 0.001 (allowlist Merkle).
3. **Allowlisted PAID**: lista curada aparte, 0.001 (allowlist Merkle). (Pendiente: direcciones de esa allowlist.)
4. **Public PAID**: 0.001, abierta hasta agotar (PublicDrop).
- Implementación: fases 1-3 = leaves del mismo Merkle root con su (price, maxQty, startTime, endTime); fase 4 = PublicDrop. Snapshot AdrianPunks (Base) → direcciones → Merkle en ETH.

## FiftyFifty redeploy
- **Base (test): `0xcC897243c7e9aA460066162693fA05f6f20A4A6f`** (artist 0x9AbD…9c86, dev 0x4943…81C6). Para ETH: redeploy igual (¿artist = HalfXTiger? confirmar).

## 1/1 animados — migración del arte OG (ORIGINAL AdrianPunks)
- ⚠️ OJO: el arte bueno está en **`AdrianPunks/market/adrianpunksimages/`** (= colección ORIGINAL). NO `omega/` ni `alpha/` (esas son **PocketAdrians**, error inicial).
- 11 1/1 animados, ids **1,13,69,221,369,420,555,690,777,807,911** (¡#911, NO #1000!), frames: #1:4 #13:2 #69:20 #221:23 #369:12 #420:5 #555:4 #690:2 #777:6 #807:2 #911:3.
- Original #221 = punk blanco, fondo CIAN, gafas arcoíris (la de pocketadrians era gris/morado/bigote).
- Migrar **arte OG tal cual** → SVG animado on-chain (SMIL opacity discreta), 24×24. Override por token. Van en tokenIds 1-11, minteados primero; normales (9.989) después con reveal/offset.
- Entrega: **claim con ventana + airdrop a dueños si no reclaman**. Snapshot (Base, AdrianPunks `0x79BE…7566`), 8 únicos:
  #1,#690=0x4943…81C6 · #13=0x5d1f…E1aA · #69,#555=0x5BE2…415E · #221=0x466c…f1C3 · #369,#420=0x9E83…d0c2 · #777=0x0351…4D58 · #807=0x214f…F553 · #911=0x3028…006a
- **POC en vivo (Base)**: AnimTest `0x86ab00866CBfB25c37032b92b0aDA05DaB075aa3` token 221 — usó arte de PocketAdrians (técnica idéntica). Sirve para verificar que OpenSea ANIMA un SVG SMIL on-chain (gating). Para el real, regenerar desde adrianpunksimages. #221 OG = 23 frames; a 24×24 ~250KB (delta ~17px/frame → delta-encoding si hace falta).

## Nombres 1/1 (de adrianpunks.json rankedTokens, trait "1/1") + mapeo tokenId
TigerPunks tokenId → OG # → nombre (setSpecialName + sale como trait "1/1" + name):
1→#1 "Adrian" · 2→#13 "Negative" · 3→#69 "Checker" · 4→#221 "Idea" · 5→#369 "Laser" · 6→#420 "420" · 7→#555 "$ADRIAN" · 8→#690 "Mona Punk Lisa" · 9→#777 "Funk" · 10→#807 "OI" · 11→#911 "FFS!"
(El owner del snapshot de cada OG # reclama el tokenId correspondiente.)
NOTA: metadata original AdrianPunks = IPFS (off-chain); la nuestra = 100% on-chain (attributes en tokenURI). Trait metadata ya on-chain.

## Sobrantes / fully-mint
- Añadir al contrato **owner-mint/airdrop flexible** (solo-owner) para mintear lo no reclamado tras las fases. Política (sweep treasury / airdrop holders / dejar) se decide según vaya el mint.

## Pre-reveal
- Silueta de punk (capa base blanca sobre fondo `rgb(43,43,43)`), 100% on-chain. Igual para todos hasta reveal(). Verificado visualmente = referencia de Adrian.

## Económico / metadata
- **Royalties 5%** (ERC-2981) + **FORZAR** (operator filter activo).
- **Ingresos del mint + royalties → wallet "fiftyfifty"** (Pendiente: dirección exacta; test usa AdrianBOT `0xa41D…4814`).
- **Token: name "TigerPunks", symbol "TPUNKS"** (inmutables tras deploy).
- **Metadata de colección ON-CHAIN** (`contractURI` data-URI: logo SVG + descripción).
- **tokenURI ya 100% on-chain** (name/desc/image SVG/attributes).
- **Descripción definitiva: TBD** (actual provisional: "TigerPunks - fully on-chain, hand-drawn pixel punks by HalfxTiger.").

## Inmutabilidad
- **Renderer ACTUALIZABLE** (setRenderer abierto, NO congelar) — por si hay que corregir bugs.
- Combos sí se pueden congelar (freezeComboData) — decisión aparte, recomendable tras verificar.

## PENDIENTE de Adrian (no bloquea el código, sí el lanzamiento real)
1. Dirección wallet **fiftyfifty** (ingresos + royalties).
2. Dirección contrato **AdrianPunks** (para snapshot allowlist).
3. **Precio** público del mint.
4. **Copy** definitivo (descripción token + colección + logo).
5. **JSON definitivo** de los 10k (ahora usamos el de prueba seed 935799516).

## Estado técnico
- Contrato test desplegado en Base: TigerPunks `0xd603dcdcdea73f0a96a145ea85090ce32ed6633a`, renderer `0xA34D938201C1b82eA1cE8195dF6Ac52175b0C5d8`.
- Falta implementar en contrato: random offset + reveal + placeholder, ERC2981 5%, operator filter enforce, contractURI on-chain, allowlist Merkle, maxPerWallet 100, setRenderer sin gate de freeze.
