#!/usr/bin/env python3
"""Build the TigerPunks SeaDrop allow-list Merkle tree (phases 1-3) from the
holders snapshot, and emit:

  * data/allowlist.json  — full artifact: merkleRoot, phase params, and every
    (address, phase, mintParams, proof). Committable; drives provenance and the
    dapp. The `merkleRoot` is what goes on-chain via DeployFull's ALLOWLIST_ROOT.
  * stdout ALLOWLIST=[...]  — the exact JS array to embed in tigermint.html.

Leaf format is what SeaDrop.mintAllowList verifies:
    leaf = keccak256(abi.encode(minter_address, MintParams))
where MintParams is the static tuple
    (mintPrice, maxTotalMintableByWallet, startTime, endTime,
     dropStageIndex, maxTokenSupplyForStage, feeBps, restrictFeeRecipients)
=> 9 inline 32-byte words (address left-padded + 7 uint256 + bool).

Tree: OpenZeppelin-style commutative tree — pair hash = keccak256(min||max)
(matches SeaDrop's MerkleProof._hashPair), odd node carried up. Leaves are
sorted+deduped so the build is deterministic and independent of input order.

Phases (LAUNCH_SPEC.md):
  1 Holders FREE   price 0        max 3    dropStageIndex 1   (snapshot holders)
  2 Holders PAID   price 0.001    max 100  dropStageIndex 2   (snapshot holders)
  3 Allowlist PAID price 0.001    max 100  dropStageIndex 3   (curated list file)
Public PAID (phase 4) is a PublicDrop, NOT in this tree.

Timing: mintParams startTime/endTime are baked into each leaf. Defaults are a
WIDE window (2023..2033), matching the current dapp artifact; the mint page
gates phase order client-side. For the real launch, set LAUNCH_TS (+ optional
PHASE_WINDOW/PHASE_GAP) to bake tight 10-min windows, then redeploy the root.

Env:
  ALLOWLIST_SNAPSHOT   default data/holders-snapshot.json
  CURATED_ALLOWLIST    default data/curated-allowlist.txt (optional; 1 addr/line)
  MINT_PRICE_WEI       default 1000000000000000 (0.001 ETH)
  HOLDER_FREE_MAX      default 3
  PAID_MAX             default 100
  MAX_SUPPLY_FOR_STAGE default 10000
  LAUNCH_TS            optional unix ts; if set, phases are sequential windows
  PHASE_WINDOW         default 600 (seconds per phase, only with LAUNCH_TS)
  PHASE_GAP            default 600 (seconds between phase starts, with LAUNCH_TS)
  START_TS / END_TS    default 1700000000 / 2000000000 (used when LAUNCH_TS unset)
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _keccak import keccak256

HERE = os.path.dirname(__file__)
DATA = os.path.join(HERE, "..", "data")

SNAP_PATH = os.environ.get("ALLOWLIST_SNAPSHOT", os.path.join(DATA, "holders-snapshot.json"))
CURATED_PATH = os.environ.get("CURATED_ALLOWLIST", os.path.join(DATA, "curated-allowlist.txt"))
OUT_PATH = os.path.join(DATA, "allowlist.json")

PRICE = int(os.environ.get("MINT_PRICE_WEI", "1000000000000000"))  # 0.001 ETH
FREE_MAX = int(os.environ.get("HOLDER_FREE_MAX", "3"))
PAID_MAX = int(os.environ.get("PAID_MAX", "100"))
MAX_SUPPLY_STAGE = int(os.environ.get("MAX_SUPPLY_FOR_STAGE", "10000"))


def _phase_windows():
    """Return {dropStageIndex: (startTime, endTime)} for phases 1,2,3."""
    launch = os.environ.get("LAUNCH_TS")
    if launch:
        launch = int(launch)
        window = int(os.environ.get("PHASE_WINDOW", "600"))
        gap = int(os.environ.get("PHASE_GAP", "600"))
        return {i: (launch + (i - 1) * gap, launch + (i - 1) * gap + window) for i in (1, 2, 3)}
    start = int(os.environ.get("START_TS", "1700000000"))
    end = int(os.environ.get("END_TS", "2000000000"))
    return {i: (start, end) for i in (1, 2, 3)}


WINDOWS = _phase_windows()

# phase -> (label, price, maxQty, dropStageIndex)
PHASES = {
    1: ("Holders FREE", 0, FREE_MAX, 1),
    2: ("Holders PAID", PRICE, PAID_MAX, 2),
    3: ("Allowlist PAID", PRICE, PAID_MAX, 3),
}


def mint_params(stage_index):
    label, price, maxq, idx = PHASES[stage_index]
    start, end = WINDOWS[stage_index]
    # order == SeaDropStructs.MintParams
    return [price, maxq, start, end, idx, MAX_SUPPLY_STAGE, 0, False]


def leaf_of(address, mp):
    addr = bytes(12) + bytes.fromhex(address[2:].lower())
    words = b"".join(int(x).to_bytes(32, "big") for x in mp[:7])
    words += (b"\x00" * 31) + (b"\x01" if mp[7] else b"\x00")
    return keccak256(addr + words)


def _hash_pair(a, b):
    return keccak256(a + b if a <= b else b + a)


def build_tree(leaves):
    """Sorted, de-duped leaves -> (root, {leaf: proof[]}). OZ commutative tree."""
    layer = sorted(set(leaves))
    if not layer:
        return b"\x00" * 32, {}
    proofs = {lf: [] for lf in layer}
    index = {lf: i for i, lf in enumerate(layer)}
    positions = {lf: i for i, lf in enumerate(layer)}  # position in current layer
    nodes = list(layer)
    # track which original leaves live under each current node (to append siblings)
    groups = [[lf] for lf in layer]
    while len(nodes) > 1:
        nxt, nxt_groups = [], []
        for i in range(0, len(nodes), 2):
            if i + 1 < len(nodes):
                a, b = nodes[i], nodes[i + 1]
                parent = _hash_pair(a, b)
                for lf in groups[i]:
                    proofs[lf].append("0x" + b.hex())
                for lf in groups[i + 1]:
                    proofs[lf].append("0x" + a.hex())
                nxt.append(parent)
                nxt_groups.append(groups[i] + groups[i + 1])
            else:
                # odd node carried up unchanged (no sibling this level)
                nxt.append(nodes[i])
                nxt_groups.append(groups[i])
        nodes, groups = nxt, nxt_groups
    return nodes[0], proofs


def main():
    snap = json.load(open(SNAP_PATH))
    holders = [h["address"] for h in snap["holders"]]

    curated = []
    if os.path.exists(CURATED_PATH):
        with open(CURATED_PATH) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    curated.append(line)

    entries = []  # (address, phaseIndex)
    for a in holders:
        entries.append((a, 1))  # Holders FREE
        entries.append((a, 2))  # Holders PAID
    for a in curated:
        entries.append((a, 3))  # Allowlist PAID

    # compute leaves
    leaf_list = []
    rows = []
    for addr, stage in entries:
        mp = mint_params(stage)
        lf = leaf_of(addr, mp)
        leaf_list.append(lf)
        rows.append((addr, stage, mp, lf))

    root, proofs = build_tree(leaf_list)
    root_hex = "0x" + root.hex()

    # dapp entries
    def mp_json(mp):
        return [str(mp[0]), str(mp[1]), str(mp[2]), str(mp[3]),
                str(mp[4]), str(mp[5]), str(mp[6]), bool(mp[7])]

    allowlist = []
    for addr, stage, mp, lf in rows:
        allowlist.append({
            "address": addr,
            "phase": PHASES[stage][0],
            "mintParams": mp_json(mp),
            "proof": proofs[lf],
        })

    artifact = {
        "collection": "TigerPunks",
        "purpose": "SeaDrop allow-list phases 1-3 (Holders FREE / Holders PAID / Allowlist PAID)",
        "leafFormat": "keccak256(abi.encode(address minter, (uint256 mintPrice,uint256 maxTotalMintableByWallet,uint256 startTime,uint256 endTime,uint256 dropStageIndex,uint256 maxTokenSupplyForStage,uint256 feeBps,bool restrictFeeRecipients)))",
        "tree": "OpenZeppelin commutative (sorted pair keccak256), sorted+deduped leaves, odd node carried up",
        "merkleRoot": root_hex,
        "source": {
            "snapshotBlock": snap["block"],
            "snapshotContract": snap["contract"],
            "snapshotChainId": snap["chainId"],
            "snapshotDateUTC": snap.get("snapshotDateUTC"),
            "uniqueHolders": snap["uniqueHolders"],
            "curatedCount": len(curated),
        },
        "phases": {
            str(i): {
                "label": PHASES[i][0],
                "mintPriceWei": str(PHASES[i][1]),
                "maxTotalMintableByWallet": PHASES[i][2],
                "dropStageIndex": PHASES[i][3],
                "startTime": WINDOWS[i][0],
                "endTime": WINDOWS[i][1],
                "maxTokenSupplyForStage": MAX_SUPPLY_STAGE,
            } for i in (1, 2, 3)
        },
        "entries": allowlist,
    }

    with open(OUT_PATH, "w") as f:
        json.dump(artifact, f, indent=2)
        f.write("\n")

    # --- self-tests -------------------------------------------------------
    _selftest(rows, root, proofs)

    print(f"merkleRoot = {root_hex}", file=sys.stderr)
    print(f"entries    = {len(allowlist)} ({len(holders)} holders x2 + {len(curated)} curated)", file=sys.stderr)
    print(f"wrote {OUT_PATH}", file=sys.stderr)

    # emit the exact JS line for tigermint.html
    if "--emit-js" in sys.argv:
        print("const ALLOWLIST = " + json.dumps(allowlist, separators=(", ", ": ")) + ";")


def _verify(leaf, proof_hex, root):
    h = leaf
    for p in proof_hex:
        h = _hash_pair(h, bytes.fromhex(p[2:]))
    return h == root


def _selftest(rows, root, proofs):
    # every leaf's proof must recompute the root
    for addr, stage, mp, lf in rows:
        assert _verify(lf, proofs[lf], root), f"proof failed for {addr} phase {stage}"
    # pair-hash must equal Solidity keccak256(a||b) with a<b
    a = bytes.fromhex("11" * 32)
    b = bytes.fromhex("22" * 32)
    assert _hash_pair(a, b) == keccak256(a + b)
    assert _hash_pair(b, a) == keccak256(a + b)  # commutative (min||max)
    print("self-test OK: all proofs verify against root", file=sys.stderr)


if __name__ == "__main__":
    main()
