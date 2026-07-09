#!/usr/bin/env python3
"""Snapshot current holders of AdrianPunks (ERC721, Base mainnet) for the
TigerPunks allowlist (phases 1-2: Holders FREE / Holders PAID).

Dependency-free (urllib + json). Uses JSON-RPC batch calls against a Base RPC.

    BASE_RPC=https://mainnet.base.org \
    SNAPSHOT_BLOCK=<hex-or-int, optional; default=latest> \
    python3 script/snapshot_holders.py

Writes data/holders-snapshot.json (committable): contract, chainId, block,
timestamp, per-token owner, and the de-duplicated holder list with counts.

NOTE: the snapshot is taken on Base (where AdrianPunks lives). The resulting
addresses seed the Merkle allowlist that is verified on the launch chain
(Ethereum mainnet) — EOAs are chain-agnostic. Contracts/multisigs in the list
must be controllable on the launch chain too (operational check, not code)."""
import json
import os
import sys
import time
import urllib.request

CONTRACT = os.environ.get(
    "ADRIANPUNKS", "0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566"
)
RPC = os.environ.get("BASE_RPC", "https://base-rpc.publicnode.com")
CHAIN_ID = 8453
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "holders-snapshot.json")

# 4-byte selectors
SEL_TOTALSUPPLY = "0x18160ddd"
SEL_TOKENBYINDEX = "0x4f6ccce7"  # tokenByIndex(uint256)
SEL_OWNEROF = "0x6352211e"       # ownerOf(uint256)


def _rpc_batch(calls):
    """calls: list of (method, params). Returns list of results in order."""
    payload = [
        {"jsonrpc": "2.0", "id": i, "method": m, "params": p}
        for i, (m, p) in enumerate(calls)
    ]
    req = urllib.request.Request(
        RPC,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "tigerpunks-snapshot/1.0",
            "Accept": "application/json",
        },
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                out = json.loads(r.read())
            if not isinstance(out, list):
                raise RuntimeError(f"non-batch response: {str(out)[:200]}")
            by_id = {o["id"]: o for o in out}
            res = []
            for i in range(len(calls)):
                o = by_id[i]
                if "error" in o and o["error"]:
                    raise RuntimeError(o["error"])
                res.append(o["result"])
            return res
        except Exception as e:  # transient RPC hiccup -> backoff
            if attempt == 4:
                raise
            time.sleep(1.5 * (attempt + 1))


def _eth_call(selector, arg_word, block):
    data = selector + (arg_word if arg_word is not None else "")
    return ("eth_call", [{"to": CONTRACT, "data": data}, block])


def _word(n):
    return f"{n:064x}"


def main():
    # resolve snapshot block
    blk_env = os.environ.get("SNAPSHOT_BLOCK")
    if blk_env:
        block = blk_env if blk_env.startswith("0x") else hex(int(blk_env))
    else:
        block = _rpc_batch([("eth_blockNumber", [])])[0]
    block_int = int(block, 16)

    # block timestamp
    blkinfo = _rpc_batch([("eth_getBlockByNumber", [block, False])])[0]
    block_ts = int(blkinfo["timestamp"], 16)

    total = int(_rpc_batch([_eth_call(SEL_TOTALSUPPLY, None, block)])[0], 16)
    print(f"contract={CONTRACT} block={block_int} totalSupply={total}", file=sys.stderr)

    CHUNK = 100

    # 1) tokenByIndex(0..total-1) -> tokenIds
    token_ids = []
    for start in range(0, total, CHUNK):
        end = min(start + CHUNK, total)
        calls = [_eth_call(SEL_TOKENBYINDEX, _word(i), block) for i in range(start, end)]
        for res in _rpc_batch(calls):
            token_ids.append(int(res, 16))
        print(f"  tokenByIndex {end}/{total}", file=sys.stderr)

    # 2) ownerOf(tokenId) -> owner
    owners = {}
    for start in range(0, len(token_ids), CHUNK):
        chunk = token_ids[start:start + CHUNK]
        calls = [_eth_call(SEL_OWNEROF, _word(tid), block) for tid in chunk]
        for tid, res in zip(chunk, _rpc_batch(calls)):
            owners[tid] = "0x" + res[-40:]
        print(f"  ownerOf {start + len(chunk)}/{len(token_ids)}", file=sys.stderr)

    # aggregate unique holders (checksummed via keccak)
    from _keccak import keccak256

    def checksum(addr):
        a = addr.lower().replace("0x", "")
        h = keccak256(a.encode()).hex()
        return "0x" + "".join(
            c.upper() if int(h[i], 16) >= 8 and c.isalpha() else c
            for i, c in enumerate(a)
        )

    holders = {}
    for tid, owner in owners.items():
        holders.setdefault(owner.lower(), []).append(tid)

    holder_list = sorted(
        (
            {
                "address": checksum(a),
                "count": len(t),
                "tokenIds": sorted(t),
            }
            for a, t in holders.items()
        ),
        key=lambda h: (-h["count"], h["address"].lower()),
    )

    snap = {
        "collection": "AdrianPunks",
        "contract": checksum(CONTRACT),
        "chainId": CHAIN_ID,
        "network": "base-mainnet",
        "block": block_int,
        "blockTimestamp": block_ts,
        "snapshotDateUTC": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(block_ts)
        ),
        "totalSupply": total,
        "uniqueHolders": len(holder_list),
        "holders": holder_list,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(snap, f, indent=2)
        f.write("\n")
    print(
        f"wrote {OUT}: {len(holder_list)} unique holders @ block {block_int}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
