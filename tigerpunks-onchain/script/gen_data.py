#!/usr/bin/env python3
"""
TigerPunks on-chain data generator (2026-06, 2-byte palette + new model/z-order).

Inputs:
  - <repo>/../tigerpunks/manifest.json   (modes, punk, categories)
  - <repo>/../tigerpunks/traits/*.png     (24x24-native master art)
  - <curation-config>.json                (the collection 'set'; rules already applied by the curator)

Outputs:
  - src/TigerData.sol    palette + offset table (inline literals; small)
  - src/TigerLayout.sol  flat-blob category bases/counts + tiger-punk test
  - src/TigerMeta.sol    SUPPLY, ROW_BYTES, provenance, label arrays
  - data/blob.bin        the RLE art blob (2-byte palette idx) -> SSTORE2 (TigerArt)
  - data/combos.bin      token(1..N) -> 10-byte trait row -> SSTORE2 (TigerPunks)

Palette: 2-byte index (<=65535 colours), so the blob exceeds EIP-170 and ships via
SSTORE2 in TigerArt (palette/offs stay inline in TigerData).

z-order: Mode(bg) > Punk > Top > Beard > Hair > Hat > Mouth > Eye > Misc.
Tiger / White-Tiger punks render Beard/Hair/Hat/Eye/Misc from the Tiger-* art.

Combo row (ROW_BYTES = 10): [mode][punk][top][beard][hair][hat][mouth][eye][miscLo][miscHi]
  mode & punk are 0-based; top..eye are 1-based (0=None); misc is a 12-bit mask.
"""
import json, os, sys, hashlib
from PIL import Image
import numpy as np

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUNKS    = os.path.normpath(os.path.join(ROOT, "..", "tigerpunks"))
MANIFEST = os.path.join(PUNKS, "manifest.json")
SRC      = os.path.join(ROOT, "src")
GRID     = 24
CONFIG   = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "test-config.json")

manifest = json.load(open(MANIFEST))
config   = json.load(open(CONFIG))
MODES = manifest["modes"]
PUNK  = manifest["punk"]
CATS  = manifest["categories"]                  # ordered: Top,Beard,Hair,Hat,Mouth,Eye,Misc

def cat(cid): return next(c for c in CATS if c["id"] == cid)
def reldir(d): return os.path.join(os.path.dirname(PUNKS), d)   # 'tigerpunks/traits/X' -> abs

# ---- image -> 24x24 indexed --------------------------------------------------
def load_grid(path):
    im = Image.open(path).convert("RGBA").resize((GRID, GRID), Image.NEAREST)
    return np.asarray(im).reshape(GRID, GRID, 4)

palette = {}            # (r,g,b) -> idx (1-based)
def pal_idx(rgb):
    if rgb not in palette:
        palette[rgb] = len(palette) + 1
        if len(palette) > 65535:
            raise SystemExit("palette overflow >65535 colours")
    return palette[rgb]

def to_indexed(arr):
    out = [[0] * GRID for _ in range(GRID)]
    for y in range(GRID):
        for x in range(GRID):
            r, g, b, a = (int(v) for v in arr[y, x])
            if a >= 128:
                out[y][x] = pal_idx((r, g, b))
    return out

def encode_layer(idx_grid):
    """bbox-trim + full-row RLE; each run = [len][idxLo][idxHi] (2-byte palette index)."""
    rows_used = [y for y in range(GRID) if any(idx_grid[y][x] for x in range(GRID))]
    if not rows_used:
        return bytes([0, 0])
    y0, y1 = rows_used[0], rows_used[-1]
    out = bytearray([y0, y1 - y0 + 1])
    for y in range(y0, y1 + 1):
        x = 0
        while x < GRID:
            idx = idx_grid[y][x]
            run = 1
            while x + run < GRID and idx_grid[y][x + run] == idx:
                run += 1
            out += bytes([run, idx & 0xFF, (idx >> 8) & 0xFF]); x += run
    return bytes(out)

# ---- flat trait layout (Punk, then each category normal+tiger, in manifest order) ----
groups = []   # (name, dir, options)
groups.append(("PUNK", PUNK["dir"], PUNK["options"]))
for c in CATS:
    groups.append((c["id"].upper(), c["dir"], c["options"]))
    if c.get("tigerDir"):
        groups.append((c["id"].upper() + "_T", c["tigerDir"], c["options"]))

bases = {}; flat = []
for name, d, opts in groups:
    bases[name] = len(flat)
    for o in opts:
        flat.append((reldir(d), o["file"]))

trait_blobs = [encode_layer(to_indexed(load_grid(os.path.join(d, f)))) for (d, f) in flat]

pal_bytes = bytearray([0, 0, 0])
for rgb, i in sorted(palette.items(), key=lambda kv: kv[1]):
    pal_bytes += bytes(rgb)

blob = bytearray(); offs = []
for b in trait_blobs:
    offs.append((len(blob), len(b))); blob += b
if len(blob) > 0xFFFF:
    raise SystemExit("blob > 65535 bytes: uint16 offsets overflow (need wider offs)")

# ---- index maps -------------------------------------------------------------
def local_map(opts): return {o["label"]: i + 1 for i, o in enumerate(opts)}
mode_idx = {m["label"]: i for i, m in enumerate(MODES)}
punk_idx = {p["label"]: i for i, p in enumerate(PUNK["options"])}
maps     = {c["id"]: local_map(c["options"]) for c in CATS}
misc_opts= [o["label"] for o in cat("Misc")["options"]]
N_MISC   = len(misc_opts)
tiger_punk_indices = sorted(punk_idx[p["label"]] for p in PUNK["options"] if p["id"] in PUNK.get("tigerIds", []))

def attr_local(cid, val):
    if not val or val == "None": return 0
    return maps[cid].get(val, 0)

# ---- STRICT validation (fail loud; this data is immutable once on-chain) ------
# A typo / stale label must ABORT the bake, never silently default to index 0 (which
# would render a valid-but-WRONG punk that mismatches the curated preview).
import re as _re
errs = []
if N_MISC > 16:
    errs.append(f"Misc has {N_MISC} options but the on-chain mask is 16 bits (uint16); cannot exceed 16.")
for m in MODES:
    if not _re.match(r'^#[0-9a-fA-F]{6}$', m.get("color", "")):
        errs.append(f"Mode '{m['label']}' has invalid color '{m.get('color')}' (want #RRGGBB).")

cat_ids = ["Top", "Beard", "Hair", "Hat", "Mouth", "Eye"]
# tiger-only colourways (e.g. fur-toned hairs) may only appear on tiger-type punks
tigeronly = {cid: {o["label"] for o in cat(cid)["options"] if o.get("tigerOnly")} for cid in cat_ids}
tiger_punk_labels = {p["label"] for p in PUNK["options"] if p["id"] in PUNK.get("tigerIds", [])}
the_set = config["set"]
SUPPLY  = config.get("size", len(the_set))
seen_idx = set()
for tok in the_set:
    i = tok.get("index")
    if not isinstance(i, int) or i < 1 or i > SUPPLY:
        errs.append(f"token index {i!r} out of range 1..{SUPPLY}.")
    elif i in seen_idx:
        errs.append(f"duplicate token index {i}.")
    else:
        seen_idx.add(i)
    a = tok.get("attributes", {})
    if a.get("Mode") not in mode_idx:
        errs.append(f"token {i}: Mode '{a.get('Mode')}' not in manifest.")
    if a.get("Punk") not in punk_idx:
        errs.append(f"token {i}: Punk '{a.get('Punk')}' not in manifest.")
    is_tiger_punk = a.get("Punk") in tiger_punk_labels
    for cid in cat_ids:
        v = a.get(cid)
        if v and v != "None" and v not in maps[cid]:
            errs.append(f"token {i}: {cid} '{v}' not in manifest.")
        elif v and v in tigeronly[cid] and not is_tiger_punk:
            errs.append(f"token {i}: tiger-only {cid} '{v}' on non-tiger punk '{a.get('Punk')}'.")
    mv = a.get("Misc")
    if mv and mv != "None":
        for part in [p.strip() for p in mv.split("+")]:
            if part not in misc_opts:
                errs.append(f"token {i}: Misc '{part}' not in manifest.")
if len(the_set) != SUPPLY:
    errs.append(f"set has {len(the_set)} tokens but size/SUPPLY is {SUPPLY}.")
if len(seen_idx) == SUPPLY and sorted(seen_idx) != list(range(1, SUPPLY + 1)):
    errs.append("token indices are not the contiguous range 1..SUPPLY.")
if errs:
    print("\n".join("  ✗ " + e for e in errs[:50]), file=sys.stderr)
    if len(errs) > 50: print(f"  … and {len(errs)-50} more", file=sys.stderr)
    raise SystemExit(f"gen_data: {len(errs)} validation error(s) — NOT baking.")

# ---- combos (rules already applied by the curator; labels validated above) ---
combos = bytearray()
rows_seen = {}                      # row bytes -> first token index (uniqueness check)
dupes = []
prov = hashlib.sha256(); prov.update(str(config.get("masterSeed", 0)).encode())
for tok in sorted(the_set, key=lambda t: t["index"]):
    a = tok["attributes"]
    misc_mask = 0
    mval = a.get("Misc")
    if mval and mval != "None":
        for part in [p.strip() for p in mval.split("+")]:
            misc_mask |= (1 << misc_opts.index(part))     # part guaranteed valid by validation
    row = bytes([
        mode_idx[a["Mode"]],
        punk_idx[a["Punk"]],
        attr_local("Top",   a.get("Top")),
        attr_local("Beard", a.get("Beard")),
        attr_local("Hair",  a.get("Hair")),
        attr_local("Hat",   a.get("Hat")),
        attr_local("Mouth", a.get("Mouth")),
        attr_local("Eye",   a.get("Eye")),
        misc_mask & 0xFF, (misc_mask >> 8) & 0xFF,
    ])
    if row in rows_seen:
        dupes.append((rows_seen[row], tok["index"]))
    else:
        rows_seen[row] = tok["index"]
    combos += row; prov.update(row)

if dupes:
    for (first, dup) in dupes[:20]:
        print(f"  ✗ token {dup} is an EXACT duplicate of token {first}", file=sys.stderr)
    if len(dupes) > 20: print(f"  … and {len(dupes)-20} more", file=sys.stderr)
    raise SystemExit(f"gen_data: {len(dupes)} duplicate combo row(s) — collection not unique, NOT baking. "
                     f"Re-curate (raise the dedupe retries / change masterSeed) or set maxDupes intentionally.")

provenance = "0x" + prov.hexdigest()
DATA = os.path.join(ROOT, "data"); os.makedirs(DATA, exist_ok=True)
open(os.path.join(DATA, "combos.bin"), "wb").write(bytes(combos))
open(os.path.join(DATA, "blob.bin"), "wb").write(bytes(blob))

# ---- emit Solidity ----------------------------------------------------------
def hexlit(b): return 'hex"' + b.hex() + '"'
N = len(config["set"]); TRAIT_COUNT = len(flat)
def mode_rgb(h): h = h.lstrip("#"); return (int(h[0:2],16)<<16)|(int(h[2:4],16)<<8)|int(h[4:6],16)

with open(os.path.join(SRC, "TigerData.sol"), "w") as fh:
    fh.write(f'''// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

/// AUTO-GENERATED by script/gen_data.py — DO NOT EDIT.
/// palette[0]=transparent, then RGB triples. offs: per global trait i,
/// start = OFFS[i*4]<<8|OFFS[i*4+1], len = OFFS[i*4+2]<<8|OFFS[i*4+3].
/// The art BLOB itself is too large for EIP-170 and lives in TigerArt (SSTORE2).
library TigerData {{
    uint256 internal constant GRID = {GRID};
    uint256 internal constant TRAIT_COUNT = {TRAIT_COUNT};

    function palette() internal pure returns (bytes memory) {{ return {hexlit(bytes(pal_bytes))}; }}
    function offs()    internal pure returns (bytes memory) {{ return {hexlit(b"".join(int(v).to_bytes(2,"big") for o in offs for v in o))}; }}

    function bgColors() internal pure returns (uint24[{len(MODES)}] memory) {{
        return [{", ".join("uint24(%d)" % mode_rgb(m["color"]) for m in MODES)}];
    }}
}}
''')

tiger_cond = " || ".join("p == %d" % i for i in tiger_punk_indices) or "false"
def B(name): return bases[name]
def NC(cid): return len(cat(cid)["options"])
with open(os.path.join(SRC, "TigerLayout.sol"), "w") as fh:
    fh.write(f'''// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

/// AUTO-GENERATED by script/gen_data.py — DO NOT EDIT.
/// 0-based flat-blob trait bases & counts (z-order), tiger-variant bases, tiger-punk test.
library TigerLayout {{
    uint256 internal constant N_MODE = {len(MODES)};
    uint256 internal constant N_PUNK = {len(PUNK["options"])};
    uint256 internal constant P_PUNK = {B("PUNK")};
    uint256 internal constant P_TOP   = {B("TOP")};    uint256 internal constant N_TOP   = {NC("Top")};
    uint256 internal constant P_BEARD = {B("BEARD")};  uint256 internal constant P_BEARD_T = {B("BEARD_T")}; uint256 internal constant N_BEARD = {NC("Beard")};
    uint256 internal constant P_HAIR  = {B("HAIR")};   uint256 internal constant P_HAIR_T  = {B("HAIR_T")};  uint256 internal constant N_HAIR  = {NC("Hair")};
    uint256 internal constant P_HAT   = {B("HAT")};    uint256 internal constant P_HAT_T   = {B("HAT_T")};   uint256 internal constant N_HAT   = {NC("Hat")};
    uint256 internal constant P_MOUTH = {B("MOUTH")};  uint256 internal constant N_MOUTH = {NC("Mouth")};
    uint256 internal constant P_EYE   = {B("EYE")};    uint256 internal constant P_EYE_T   = {B("EYE_T")};   uint256 internal constant N_EYE   = {NC("Eye")};
    uint256 internal constant P_MISC  = {B("MISC")};   uint256 internal constant P_MISC_T  = {B("MISC_T")};  uint256 internal constant N_MISC  = {N_MISC};

    function isTigerPunk(uint8 p) internal pure returns (bool) {{ return {tiger_cond}; }}
}}
''')

def sol_str_array(name, arr):
    items = ", ".join('"%s"' % s.replace('"', '\\"') for s in arr)
    return f'    function {name}() internal pure returns (string[{len(arr)}] memory) {{ string[{len(arr)}] memory a = [{items}]; return a; }}\n'

with open(os.path.join(SRC, "TigerMeta.sol"), "w") as fh:
    fh.write(f'''// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

/// AUTO-GENERATED by script/gen_data.py — DO NOT EDIT.
/// Combo row (ROW_BYTES = 10): [mode][punk][top][beard][hair][hat][mouth][eye][miscLo][miscHi]
/// mode & punk are 0-based; top..eye are 1-based (0=None); misc is a {N_MISC}-bit mask.
library TigerMeta {{
    uint256 internal constant SUPPLY = {N};
    uint256 internal constant ROW_BYTES = 10;
    bytes32 internal constant PROVENANCE = {provenance};

''')
    fh.write(sol_str_array("labels_Mode", [m["label"] for m in MODES]))
    fh.write(sol_str_array("labels_Punk", [p["label"] for p in PUNK["options"]]))
    for cid in ["Top","Beard","Hair","Hat","Mouth","Eye","Misc"]:
        fh.write(sol_str_array("labels_" + cid, [o["label"] for o in cat(cid)["options"]]))
    fh.write("}\n")

for _f in ("TigerCombos.sol",):
    p = os.path.join(SRC, _f)
    if os.path.exists(p): os.remove(p)

# ---- rarity report (so published rarity == what's actually on-chain) --------
def _count(key_fn):
    d = {}
    for tok in the_set:
        for label in key_fn(tok["attributes"]):
            d[label] = d.get(label, 0) + 1
    return dict(sorted(d.items(), key=lambda kv: kv[1]))   # rarest first

def _one(cid):    return lambda a: [a.get(cid)] if a.get(cid) and a.get(cid) != "None" else ["None"]
def _misc(a):
    mv = a.get("Misc")
    return [p.strip() for p in mv.split("+")] if mv and mv != "None" else ["None"]
def _tcount(a):
    n = sum(1 for cid in ["Top","Beard","Hair","Hat","Mouth","Eye"] if a.get(cid) and a.get(cid) != "None")
    n += len(_misc(a)) if _misc(a) != ["None"] else 0
    return [f"{n} traits"]

rarity = {
    "supply": N, "masterSeed": config.get("masterSeed"), "provenance": provenance,
    "Mode": _count(_one("Mode")), "Punk": _count(_one("Punk")),
    "Top": _count(_one("Top")), "Beard": _count(_one("Beard")), "Hair": _count(_one("Hair")),
    "Hat": _count(_one("Hat")), "Mouth": _count(_one("Mouth")), "Eye": _count(_one("Eye")),
    "Misc": _count(_misc), "TraitCount": _count(_tcount),
}
open(os.path.join(DATA, "rarity-report.json"), "w").write(json.dumps(rarity, indent=2, ensure_ascii=False))

art = len(pal_bytes) + len(blob) + len(offs) * 4
print(f"palette colours    : {len(palette)} (2-byte index)")
print(f"traits             : {TRAIT_COUNT}")
print(f"blob (SSTORE2)     : {len(blob)} B ({len(blob)/1024:.1f} KB) -> data/blob.bin")
print(f"palette+offs inline: {len(pal_bytes)+len(offs)*4} B")
print(f"ART total          : {art} B ({art/1024:.1f} KB)")
print(f"combos             : {len(combos)} B ({N} tokens) -> data/combos.bin")
print(f"tiger punks        : {tiger_punk_indices}")
print(f"unique combos      : {len(rows_seen)}/{N} (0 duplicates)")
print(f"provenance         : {provenance}")
print(f"rarity report      : data/rarity-report.json")
print("wrote TigerData.sol, TigerLayout.sol, TigerMeta.sol, data/blob.bin, data/combos.bin")
