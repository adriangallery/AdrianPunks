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
