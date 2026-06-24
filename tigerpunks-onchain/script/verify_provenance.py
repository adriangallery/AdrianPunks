#!/usr/bin/env python3
"""
TigerPunks provenance verifier (standalone, no deps).

Recomputes the on-chain PROVENANCE hash from a curator config + the manifest, exactly
as gen_data.py bakes it: sha256( str(masterSeed) || row_1 || row_2 || ... ), where each
row is the same 10 bytes stored on-chain ([mode][punk][top][beard][hair][hat][mouth][eye]
[miscLo][miscHi]). If this matches TigerPunks.PROVENANCE() on Ethereum, the published set
is provably the one that was minted — nobody swapped traits after the fact.

Usage:
    python3 script/verify_provenance.py <config.json> [expected_0x_hash]
"""
import json, sys, hashlib, os

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.normpath(os.path.join(ROOT, "..", "tigerpunks", "manifest.json"))

def main():
    if len(sys.argv) < 2:
        print("usage: verify_provenance.py <config.json> [expected_0x_hash]"); sys.exit(2)
    manifest = json.load(open(MANIFEST))
    config   = json.load(open(sys.argv[1]))
    expected = sys.argv[2].lower() if len(sys.argv) > 2 else None

    MODES = manifest["modes"]; PUNK = manifest["punk"]; CATS = manifest["categories"]
    cat = lambda cid: next(c for c in CATS if c["id"] == cid)
    mode_idx = {m["label"]: i for i, m in enumerate(MODES)}
    punk_idx = {p["label"]: i for i, p in enumerate(PUNK["options"])}
    local    = {c["id"]: {o["label"]: i + 1 for i, o in enumerate(c["options"])} for c in CATS}
    misc_opts= [o["label"] for o in cat("Misc")["options"]]

    def at(cid, v): return 0 if (not v or v == "None") else local[cid].get(v, 0)

    h = hashlib.sha256(); h.update(str(config.get("masterSeed", 0)).encode())
    for tok in sorted(config["set"], key=lambda t: t["index"]):
        a = tok["attributes"]; mask = 0
        mv = a.get("Misc")
        if mv and mv != "None":
            for part in [p.strip() for p in mv.split("+")]: mask |= 1 << misc_opts.index(part)
        h.update(bytes([
            mode_idx[a["Mode"]], punk_idx[a["Punk"]],
            at("Top", a.get("Top")), at("Beard", a.get("Beard")), at("Hair", a.get("Hair")),
            at("Hat", a.get("Hat")), at("Mouth", a.get("Mouth")), at("Eye", a.get("Eye")),
            mask & 0xFF, (mask >> 8) & 0xFF,
        ]))
    got = "0x" + h.hexdigest()
    print("tokens     :", len(config["set"]))
    print("masterSeed :", config.get("masterSeed"))
    print("provenance :", got)
    if expected:
        ok = got == expected
        print("expected   :", expected)
        print("MATCH ✅" if ok else "MISMATCH ❌")
        sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
