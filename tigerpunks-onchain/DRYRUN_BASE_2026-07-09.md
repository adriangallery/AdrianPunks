# TigerPunks — Dry-run COMPLETO en Base (ensayo general) — 2026-07-09

> Tarea **T5** del `orquestacion-fable/planes/PLAN_TIGERPUNKS.md` (APROBADO por Adrian).
> Ensayo general del lanzamiento. Red: **Base mainnet** (chainId 8453). El lanzamiento
> real será en **Ethereum**. Deployer/owner: `0xa41D5fAF7BA8B82E276125dE2a053216e91f4814`
> (bot zero-keeper, EOA delegada EIP-7702). Firma: `DEPLOYER_PRIVATE_KEY` +
> `BASE_MAINNET_RPC_URL` (RPC público `mainnet.base.org`) del `.env` del ecosistema
> (`ZEROtoken/zero-diamond/.env`), NUNCA impresa/inline.

## Resultado en una línea

El flujo end-to-end funciona (deploy íntegro, 4 fases de mint, reveal, pago a FiftyFifty,
render generativo perfecto). **PERO se detectó un BLOQUEANTE CRÍTICO**: los 11 "1/1"
animados desplegados usan el arte **PocketAdrians (INCORRECTO)**, no el OG de
`market/adrianpunksimages/`. Es el riesgo R6 del recon, ahora CONFIRMADO visualmente
on-chain. **No lanzar en ETH (T7) hasta regenerar `out/anim/final/*.svg` desde el OG.**

## Direcciones desplegadas (Base mainnet)

| Contrato | Dirección | Creación tx |
|---|---|---|
| **TigerPunks** (ERC721SeaDrop) | `0x0A6D8CE3a89aD18fa602Ca9de8723569D8DcD0c6` | `0xa1693f6d…a772539` |
| **TigerRenderer** | `0x4EEd0F5c2a471A733F7283fCc884Cc9e0322F4A6` | `0x33a84b45…f2bd2da` |
| **TigerArt** (SSTORE2 blob) | `0x77097dA0ecc3aa996c33B5477612038163842895` | `0x11216718…acf3b04` |
| **FiftyFifty** (test, ya existía) | `0xcC897243c7e9aA460066162693fA05f6f20A4A6f` | artist `0x9AbD…9c86`, dev `0x4943…81C6` |
| SeaDrop (canónico Base) | `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5` | — |

Env del deploy: `FIFTYFIFTY=0xcC89…4A6f`, `FEE_RECIPIENT=`(default=FiftyFifty),
`CLAIM_ROOT=0x0…0` (los 1/1 no se ejercitaron por claim; cubierto por `Special.t.sol`),
`ALLOWLIST_ROOT=0x8bea5ceff…dbe38` (== root de `data/allowlist.json`),
`MINT_PRICE_WEI=1000000000000000` (0.001 ETH). `DeployFull.s.sol` con `--broadcast`.

**Nota operativa**: `forge script --broadcast --slow` con 66 txs sobre RPC público
excede el timeout de 2 min de la shell. Se completó con `--resume` (reenvía solo las
txs pendientes por nonce). Para ETH: correr en background o con un RPC dedicado.

## Estado del contrato tras el deploy (verificado on-chain)

- `maxSupply` = 10000 == `TigerMeta.SUPPLY` ✓
- `chunkCount` = 5 combos (100.000 bytes), `comboDataFrozen` = **true** ✓ (congelado en deploy)
- `specialsSeeded` = true → tokenIds 1..11 en escrow (contrato) ✓
- `PROVENANCE` = `0xccb9ada6…432ea5` (== seed de prueba horneado 153074185) ✓
- `rendererFrozen` = **false** ✓ (NO se llamó `freezeRenderer()` — correcto para ensayo)
- SeaDrop: `getAllowListMerkleRoot` = `0x8bea5ceff…dbe38` (== root de `data/allowlist.json`) ✓
- SeaDrop: `creatorPayoutAddress` = FiftyFifty ✓; `PublicDrop` price 1e15, max 100/wallet, feeBps 0 ✓
- Royalties 5% (ERC-2981) → FiftyFifty ✓

## Preparación de allowlist (T5.1)

`data/allowlist.json` ya trae ventanas UTILIZABLES: 1700000000..2000000000
(2023-11..2033-05), es decir **activas ahora**. `build_allowlist.py` es determinista:
re-ejecutado dio el MISMO root `0x8bea5ceff…dbe38` (166 entries = 83 holders ×2 fases,
fase 3 vacía por decisión de Adrian). Self-test de proofs OK. El deployer `0xa41D`
**ES holder** de AdrianPunks (snapshot block 48418537) → tiene proof en fase 1 y fase 2.
`forge test` = **25/25 verde** antes de desplegar.

## Fases de mint ejercitadas (todas contra el root real committeado)

| Fase | Método | qty | precio | tokenIds | tx | resultado |
|---|---|---|---|---|---|---|
| 1 Holders FREE | `mintAllowList` stage 1 | 3 | 0 | 12,13,14 | `0x2007123e…4f49a3` | ✓ mint gratis, proof real del deployer |
| 2 Holders PAID | `mintAllowList` stage 2 | 1 | 0.001 | 16 | `0xcc91ee10…c1d83e` | ✓ +0.001 → FiftyFifty |
| 3 Allowlist PAID | — | — | — | — | — | **VACÍA por diseño** (lista curada pendiente) |
| 4 Public PAID | `mintPublic` | 1 | 0.001 | 15 | `0xc378543f…b491ec` | ✓ +0.001 → FiftyFifty |
| `reveal()` | — | — | — | — | `0xdcf230c6…3312c0` | ✓ `revealOffset` = **9778** |
| ownerMint (muestra render) | `ownerMint` | 9 | — | 17-25 | `0x876e84f0…99fa3` | ✓ (para ampliar muestra de render) |

`totalSupply` final = **25** (11 specials en escrow + 14 minteados a deployer).
**Pago verificado**: FiftyFifty pasó de 0.005 → **0.007 ETH** = +0.002 (los 2 mints de
pago, evento `ETHReceived` de 1e15 en cada uno). El mint FREE no cobra (price 0). ✓

### Gotcha operativo (relevante para ETH): minter EOA delegada + `cast send`
- El deployer `0xa41D` es una **EOA delegada (EIP-7702)** con código
  `0xef0100…dae32b`. El delegate SÍ implementa `onERC721Received` (devuelve el magic
  value), por lo que `_safeMint` de SeaDrop a `0xa41D` funciona (verificado en traza).
- `cast send` **no acepta `--slow`** (es flag de `forge script`); provoca error de
  parseo silencioso. Un `cast send` sencillo ya espera el receipt.
- El `eth_estimateGas` del RPC público revierte espuriamente (`0xdf2d9b42`) para estos
  mints; se resuelve pasando `--gas-limit` explícito (traza `eth_call` = éxito).
- **Para ETH real**: los holders usan EOAs normales, sin este ruido. Solo tener en
  cuenta que un minter con wallet 7702 que NO implemente `onERC721Received` revertiría
  (comportamiento correcto de ERC721A `_safeMint`).

## Verificación de render (T5.4) — 18 tokenURI + contractURI

Script `verify_render.py`: para cada token, `comboOf(tokenId)` on-chain vs la fila
local de `data/combos.bin` en índice `(tokenId-1+9778) % 10000`, y atributos on-chain
del `tokenURI` vs decodificación local con las tablas de `TigerMeta.sol`.

- **14 generativos (12-25)**: `comboOf` on-chain == `combos.bin` horneado ✓;
  atributos on-chain == decode local ✓; SVG bien formado (24×24, crispEdges) ✓.
  **0 discrepancias.** (Ej.: #20 = OG-107 bg, punk NPC, pelo largo, gafas, cigarro,
  headphones — render limpio.)
- **`contractURI()`**: JSON válido, `name` "TigerPunks", descripción 416 chars,
  `external_link` correcto, **logo = TigerPunk renderizado on-chain** (SVG 6440 bytes,
  bien formado). ✓
- **Reveal**: no se trata como prueba de imparcialidad (secuenciador Base centralizado,
  aviso R7); en ETH el offset usa `prevrandao` no grindeable.

### 1/1 animados (specials 1-11) — estructura OK, **ARTE INCORRECTO**
- Estructura: SMIL `<animate>` presente, `animation_url` presente, trait "Animated 1/1",
  nombres correctos (1=Adrian, 2=Negative, 3=Checker, 4=Idea…). ✓
- **PERO el arte es el de PocketAdrians, NO el OG** (comparación visual on-chain vs
  `market/adrianpunksimages/`):
  - **#4 "Idea" (OG #221)**: on-chain = punk **GRIS**, fondo **morado oscuro**,
    **bigote**, gafas arcoíris → **idéntico a `market/omega/221.gif` (PocketAdrians)**.
    El OG `market/adrianpunksimages/221.png` es punk **BLANCO**, **mohawk arcoíris**,
    fondo **blanco**, gafas arcoíris. NO coinciden.
  - **#1 "Adrian" (OG #1)**: on-chain = punk **gris sobre fondo oscuro** con pelo
    eléctrico cian/rojo. El OG `adrianpunksimages/1.png` es el punk **blanco clásico,
    pelo negro, fondo blanco**. NO coinciden.
- **Conclusión**: `out/anim/final/*.svg` (los 11) se generaron desde el arte
  **equivocado** (PocketAdrians `omega/alpha`), no desde `market/adrianpunksimages/`.
  Es exactamente el riesgo **R6** del recon y el aviso de `LAUNCH_SPEC.md` (líneas 28-35).

## Gas / presupuesto

- Total gastado por el deployer en TODO el ensayo: **0.00311 ETH**
  = **~0.00111 ETH de gas** (deploy 66 txs + 5 mints + reveal + ownerMint) + 0.002 ETH
  de valor de mint (fue a FiftyFifty, recuperable). Muy por debajo del tope de 0.005.
- Gas price en Base durante el ensayo: ~0.006-0.011 gwei.

## Veredicto para el lanzamiento en ETH

**El flujo técnico está listo** (deploy, allowlist wiring, 4 fases, reveal, pago,
render generativo y metadata 100% on-chain, contractURI con logo). Los dos bloqueantes
que quedan son de DATOS/ARTE, no de código:

1. **CRÍTICO — arte 1/1**: regenerar `out/anim/final/*.svg` desde
   `market/adrianpunksimages/` (los 11: 1,13,69,221,369,420,555,690,777,807,911) y
   re-verificar visualmente antes de T7. Hoy son PocketAdrians.
2. **Data del set**: sigue siendo el seed de PRUEBA 153074185 (T4 aparcado por Adrian).
   Confirmar qué data va a ETH antes de T7.

`freezeRenderer()` **NO** ejecutado (correcto). Ningún contrato de otras colecciones
fue tocado; deploy nuevo y aislado.

---

# REDEPLOY del ensayo con arte 1/1 OG — 2026-07-10

El bloqueante #1 quedó **RESUELTO**: los 11 SVG se regeneraron desde el arte OG
(`market/adrianpunksimages/<og>.gif`) con el driver committeado `script/build_anim.sh`
(commit `0f2a7974`; los frame counts del OG casan 1:1 con LAUNCH_SPEC, los de omega no).
Se re-desplegó el ensayo COMPLETO en Base con `DeployFull` y los **mismos params** del
dry-run original (FIFTYFIFTY test `0xcC89…4A6f`, `CLAIM_ROOT=0x0`,
`ALLOWLIST_ROOT=0x8bea5ceff…dbe38`, precio 0.001 ETH).

## Direcciones NUEVAS del ensayo (Base mainnet) — estas SUPERSEDEN a las de arriba

| Contrato | Dirección |
|---|---|
| **TigerPunks** (redeploy OG) | `0xADA976aEC6584ae773bF7747c3b675916e1c24e2` |
| **TigerRenderer** | `0x2852B38652944308d15bD38a6372C84ef8A2261f` |
| **TigerArt** (SSTORE2) | `0xB37F5BF64583c9582356D74076ed88a482FAA262` |
| FiftyFifty (test, reutilizado) | `0xcC897243c7e9aA460066162693fA05f6f20A4A6f` |

El deploy del 9-jul (`0x0A6D8CE3…D0c6`) queda como ensayo obsoleto con arte incorrecto.

- **58 txs, 0 fallos** (antes 66: los SVG OG son más compactos → menos `addSpecialChunk`).
  Gas total del redeploy: **~0.0009 ETH** + `reveal()` (`0x04673b25…039f5b`, offset **2508**).
- Estado verificado on-chain: maxSupply 10000, specialsSeeded (1-11 en escrow),
  comboDataFrozen true, `rendererFrozen` **false** (NO congelado), mismo
  PROVENANCE `0xccb9ada6…432ea5` (misma data seed de prueba — T4 sigue aparcado).

## Verificación on-chain de los 11 1/1 (tokenURI → SVG decodificado, sin OpenSea)

Para cada tokenId 1-11: `tokenURI` → JSON base64 → `animation_url` SVG → frame 0
reconstruido píxel a píxel y comparado (histograma de color exacto, cuantizado //8)
contra `market/adrianpunksimages/<og>.gif` frame 0. **11/11 MATCH**:

| tokenId | OG # | nombre | frames | SVG KB | arte confirmado |
|---|---|---|---|---|---|
| 1 | 1 | Adrian | 4 | 8.0 | ✅ punk blanco clásico, pelo negro, fondo blanco |
| 2 | 13 | Negative | 2 | 27.7 | ✅ fondo negro (negativo) |
| 3 | 69 | Checker | 20 | 114.0 | ✅ damero B/N |
| 4 | 221 | Idea | 23 | 64.6 | ✅ punk BLANCO, gafas arcoíris, cigarro, fondo cian (frame 0) — ya NO el gris/morado/bigote de PocketAdrians |
| 5 | 369 | Laser | 12 | 37.1 | ✅ fondo negro, láser |
| 6 | 420 | 420 | 5 | 71.0 | ✅ fondo blanco |
| 7 | 555 | $ADRIAN | 4 | 26.7 | ✅ ojos "$A", fondo verde con monedas |
| 8 | 690 | Mona Punk Lisa | 2 | 17.0 | ✅ fondo negro |
| 9 | 777 | Funk | 6 | 38.3 | ✅ fondo amarillo |
| 10 | 807 | OI | 2 | 28.0 | ✅ fondo blanco |
| 11 | 911 | FFS! | 3 | 34.8 | ✅ fondo rojo |

Además #221, #1 y #555 se decodificaron y compararon **visualmente** contra el PNG/GIF
fuente: idénticos al OG. Todos con trait "Animated 1/1", SMIL `<animate>` presente y
frame counts == LAUNCH_SPEC.

## Veredicto actualizado

- ✅ Bloqueante #1 (arte 1/1) **CERRADO**: on-chain renderiza el OG.
- ⏳ Bloqueante #2 sigue: data del set = seed de PRUEBA 153074185 (T4 aparcado por Adrian).
- `freezeRenderer()` NO llamado. Para ETH (T7): correr `bash script/build_anim.sh` antes
  del deploy (out/ es regenerable y gitignored) — el driver ya pina la fuente OG.

---

# ENSAYO 3 — data DEFINITIVA (T4/G1 resueltos) — 2026-07-10

El bloqueante #2 quedó **RESUELTO**: G1 desbloqueado por Adrian con el config curado
definitivo `tigerpunks-config-368572463.json` (masterSeed **368572463**). Re-horneado (T4,
commit `708abf02`): `gen_data.py` 0 errores de validación, **10000/10000 combos únicos, 0
duplicados**, usa los 4 hats nuevos (Beret Green/Red/Black 46-227, Wobbler 135) + skin **Lama**
(345). **PROVENANCE nuevo = `0x9983c254de9c…bcaf9`** (verify_provenance MATCH). `forge test` 25/25.
Ensayo COMPLETO re-desplegado en Base con `DeployFull` (mismos params: FIFTYFIFTY test
`0xcC89…4A6f`, `CLAIM_ROOT=0x0`, `ALLOWLIST_ROOT=0x8bea5ceff…dbe38`, precio 0.001 ETH; SIN
freezeRenderer).

## Direcciones NUEVAS del ensayo 3 (Base mainnet) — SUPERSEDEN a todas las anteriores

| Contrato | Dirección |
|---|---|
| **TigerPunks** (data definitiva) | `0x9669c7898Eb214d3Dba8b02B4d42a8a98e68805a` |
| **TigerRenderer** | `0xA4DF62432d036aA81C5D8Bd4FAdF05755D8f4A2D` |
| **TigerArt** (SSTORE2) | `0xC6f33325a1Ca07A70503f0cf304c5d0F151c8FF0` |
| FiftyFifty (test, reutilizado) | `0xcC897243c7e9aA460066162693fA05f6f20A4A6f` |

Los deploys previos (`0x0A6D8CE3…D0c6` seed prueba, `0xADA976aE…24e2` seed prueba+OG) quedan
OBSOLETOS (data no definitiva).

## Estado on-chain verificado

- `maxSupply` = 10000 == `TigerMeta.SUPPLY` ✓
- **`PROVENANCE` = `0x9983c254de9c…bcaf9`** (== config definitivo; `verify_provenance.py
  tigerpunks-config-368572463.json <onchain>` = **MATCH ✅**)
- `comboDataFrozen` = true ✓, `rendererFrozen` = **false** ✓ (NO congelado)
- `specialsSeeded` = true (1..11 en escrow) ✓, `chunkCount` = 5 ✓
- SeaDrop `getAllowListMerkleRoot` = `0x8bea5ceff…dbe38` ✓; `creatorPayout` = FiftyFifty ✓

## Fases de mint ejercitadas + reveal

| Fase | Método | qty | precio | tokenIds | resultado |
|---|---|---|---|---|---|
| 1 Holders FREE | `mintAllowList` stage1 (proof del deployer-holder) | 3 | 0 | 12,13,14 | ✓ gratis |
| 4 Public PAID | `mintPublic` | 1 | 0.001 | 15 | ✓ +0.001 → FiftyFifty |
| ownerMint (sample render) | `ownerMint` | 16 | — | 16-31 | ✓ |
| `reveal()` | — | — | — | — | ✓ **revealOffset = 6363** |

`totalSupply` final = **31** (11 specials en escrow + 20 minteados). **Pago verificado**:
FiftyFifty 0.007 → **0.008 ETH** = +0.001 (el único mint de pago; el FREE no cobra). Gotchas del
RPC público (mismo patrón DRYRUN): "replacement transaction underpriced" y "in-flight tx limit
for delegated accounts" (EOA 7702) → se resuelve con `--nonce` explícito + envíos de uno en uno.

## Verificación de render — PÍXEL A PÍXEL vs curator (no solo atributos)

`pixel_verify.py`: rasteriza el SVG on-chain del `tokenURI` a 24×24 y lo compara **píxel a píxel**
contra un composite local INDEPENDIENTE de los PNG fuente del curator (`tigerpunks/traits/*`) en
el z-order del renderer (Mode>Punk>Top>Beard>Hair>Hat>Mouth>Eye>Misc, variante Tiger donde aplica).

- **20 generativos (tokenIds 12-31)**: `comboOf` on-chain == `combos.bin` horneado (índice
  `(id-1+6363)%10000`) ✓ **Y 0 diferencias de píxel** en los 20 (incluye 4 Tiger punks → arte
  tiger-variante correcto). **0 discrepancias.**
- **Traits nuevos (vía `Renderer.imageSVG(bytes)` sobre combos reales del config, sin mintear)**:
  Lama, White Tiger, Beret Green/Red/Black, Wobbler, y **Lama+Wobbler** (hat nuevo en variante
  tiger) → **7/7 pixel-match, 0 diffs**. Confirma que los hats 24-27 y el Lama rinden on-chain.
- **11 animados 1/1**: `verify_onchain_11.py` → **11/11 == arte OG** (frame 0 histograma exacto vs
  `market/adrianpunksimages/<og>.gif`; #221 "Idea" bg cian, NO PocketAdrians). Trait "Animated 1/1"
  y frame counts == LAUNCH_SPEC en todos.
- **`contractURI()`**: JSON válido, name "TigerPunks", desc 416 chars (menciona HalfxTiger),
  external_link OK, logo = TigerPunk renderizado on-chain (SVG 6440 B). ✓

## Gas / presupuesto

- Total del ensayo 3: **~0.0019 ETH** = **~0.0009 ETH de gas** (deploy 58 txs + 5 mints + reveal +
  ownerMint) + 0.001 ETH de valor de mint (fue a FiftyFifty, recuperable). Muy por debajo del tope
  0.005. Gas price Base ~0.006-0.011 gwei.

## Veredicto ensayo 3

**Flujo end-to-end verde con la DATA DEFINITIVA**: deploy íntegro, allowlist wiring, mint (free+
paid), pago, reveal, render generativo **pixel-perfect vs curator**, traits nuevos (Lama+hats)
correctos, 1/1 OG correctos, contractURI on-chain. `PROVENANCE()` on-chain casa con el config
commiteado. `freezeRenderer()` NO llamado. **Ya no queda bloqueante de datos ni de arte para ETH**
— lo pendiente es solo red/config: T6 (dapp→ETH) y T7 (FiftyFifty ETH + DeployFull ETH, OK de Adrian).
