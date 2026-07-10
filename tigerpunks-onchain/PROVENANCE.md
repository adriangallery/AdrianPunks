# TigerPunks — Provenance & Fairness

TigerPunks is a **curated** 10,000 set: every token's traits are fixed *before* the sale and
pinned by an on-chain hash, then a one-time random `reveal()` shuffles which tokenId gets which
combo (so nobody can snipe rares during the mint). This document lets anyone prove the set wasn't
tampered with.

## The commitment

`TigerPunks.PROVENANCE()` is baked into the contract at deploy as:

```
PROVENANCE = sha256( utf8(masterSeed) ‖ row_1 ‖ row_2 ‖ … ‖ row_10000 )
```

where each `row_i` is the **same 10 bytes stored on-chain** for that position:

```
[mode][punk][top][beard][hair][hat][mouth][eye][miscLo][miscHi]
 mode,punk = 0-based   top..eye = 1-based (0 = None)   misc = 12-bit mask (lo,hi)
```

Rows are concatenated in `index` order (1..10000) from the published curator config. Because the
hash covers every trait of every token, changing any single trait changes `PROVENANCE`.

## How to verify

**CLI (Python, no deps):**

```bash
python3 script/verify_provenance.py tigerpunks-config-<seed>.json 0x<PROVENANCE-from-contract>
# -> recomputes the hash and prints MATCH ✅ / MISMATCH ❌
```

**In the browser:** open `tigerprovenance.html`, load the published config + manifest, and
optionally paste the TigerPunks contract address — it reads `PROVENANCE()` live via `eth_call`
and compares. Everything runs client-side.

**Read the on-chain value yourself:**

```bash
cast call <TigerPunks> "PROVENANCE()(bytes32)" --rpc-url <eth-rpc>
```

## What this proves (and what it doesn't)

- ✅ The published config is **exactly** the trait assignment locked at deploy — no trait was
  swapped, added or removed after the commitment.
- ✅ The reveal shuffle is a single contract-wide offset fixed once by `reveal()` (entropy from
  `blockhash + prevrandao + timestamp`), emitted as `Revealed(offset)`. `comboOf(tokenId)` =
  `row[(tokenId-1+offset) mod 10000]`, so anyone can re-derive every token's traits from the
  config + the emitted offset.
- ℹ️ The art itself (pixels) lives on-chain in `TigerArt` (SSTORE2) and is rendered by
  `TigerRenderer`; freezing the renderer (`freezeRenderer()`) makes the visual output immutable too.

## The 11 animated 1/1s and the "covered but unrendered" rows

TokenIds **1–11** are the migrated OG **animated 1/1s** (`SPECIAL_COUNT = 11`). Their `tokenURI`
returns the hand-made animated SVG held in escrow and **skips `comboOf`** entirely
(`TigerPunks.tokenURI` → `isSpecial(tokenId)` → `_specialURI`). They are *not* generative punks.

The animated SVGs are regenerated deterministically from the **ORIGINAL AdrianPunks** art
(`../market/adrianpunksimages/<ogId>.gif`, OG ids 1,13,69,221,369,420,555,690,777,807,911) by
`script/build_anim.sh` → `out/anim/final/`. ⚠️ They must NOT be built from `market/omega/` or
`market/alpha/` — those are *PocketAdrians* and were used by mistake in the first pass (caught in
the Base dry-run, risk R6; see `DRYRUN_BASE_2026-07-09.md`). Run `bash script/build_anim.sh` before
any deploy so the on-chain art is the OG.

The provenance hash still covers **all 10,000 rows** of the published config (the commitment must be
complete and tamper-evident for the whole set). But because tokenIds 1–11 render their animated art
instead of a combo, the 11 config rows that the reveal offset happens to map onto positions 1–11 are
**never rendered as generative punks**. Concretely, with the emitted `offset`, the rows at indices

```
((k - 1 + offset) mod 10000) + 1   for k = 1..11
```

are the "covered but unrendered" ones. So the collection you actually see is:

- **9,989 generative punks** (tokenIds 12–10,000), each rendered from its revealed combo, plus
- **11 animated 1/1s** (tokenIds 1–11), rendered from their escrowed SVG.

= **10,000 tokens total.** This is by design, not a bug or a missing mint: every tokenId exists and
every one of the 10,000 config rows is committed in `PROVENANCE`. It only means that if you verify the
config row-by-row you will find 11 fully-valid combos that no minted token displays, because those 11
slots are occupied by the animated 1/1s. Nothing is lost or double-counted — the count is exactly
10,000 either way.

## Files to publish at launch

- `tigerpunks-config-<seed>.json` — the final curator export (the 10k set).
- `tigerpunks/manifest.json` — the trait manifest (defines order/indices).
- `data/rarity-report.json` — trait frequencies, computed from the same config (matches on-chain).
- This file + `script/verify_provenance.py` + `tigerprovenance.html`.
