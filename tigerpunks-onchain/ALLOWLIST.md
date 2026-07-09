# TigerPunks allow-list (mint phases 1-3)

How the Holders FREE / Holders PAID / Allowlisted PAID phases are built and wired.
Phase 4 (Public PAID) is a plain SeaDrop `PublicDrop` and is NOT part of this tree.

## Leaf format (must match SeaDrop exactly)

```
leaf = keccak256(abi.encode(
    address minter,
    MintParams(mintPrice, maxTotalMintableByWallet, startTime, endTime,
               dropStageIndex, maxTokenSupplyForStage, feeBps, restrictFeeRecipients)
))
```

This is the exact preimage `SeaDrop.mintAllowList` verifies
(`SeaDrop.sol` → `keccak256(abi.encode(minter, mintParams))`). All per-phase
economics live INSIDE the leaf and are supplied by the minter at mint time; only
the **single Merkle root** is stored on-chain. `MintParams` is a static tuple, so
`abi.encode` = the minter address left-padded to 32 bytes + the 7 uint256 words +
a 32-byte bool (9 words, no dynamic offsets).

Tree: OpenZeppelin-style commutative tree — pair hash `keccak256(min(a,b) || max(a,b))`
(= SeaDrop's `MerkleProof._hashPair`), leaves sorted + de-duped, odd node carried up.

> This is a DIFFERENT tree from `CLAIM_ROOT` (the 11 animated 1/1s), whose leaf is
> `keccak256(abi.encodePacked(tokenId, claimer))`. Do not conflate them.

## Phases (LAUNCH_SPEC.md)

| # | label          | price      | max/wallet | dropStageIndex | source           |
|---|----------------|------------|------------|----------------|------------------|
| 1 | Holders FREE   | 0          | 3          | 1              | AdrianPunks snapshot |
| 2 | Holders PAID   | 0.001 ETH  | 100        | 2              | AdrianPunks snapshot |
| 3 | Allowlist PAID | 0.001 ETH  | 100        | 3              | `data/curated-allowlist.txt` (pending) |

`startTime`/`endTime` are baked into every leaf. Defaults are a WIDE window
(1700000000..2000000000); the mint page (`tigermint.html` `SCHEDULE`) gates phase
order client-side. For the real launch, regenerate with `LAUNCH_TS` set to bake
tight 10-min windows, then redeploy the root.

## Operational flow

1. **Snapshot** current AdrianPunks holders (Base):
   ```
   python3 script/snapshot_holders.py        # -> data/holders-snapshot.json
   ```
   Pins a block + UTC date. `SNAPSHOT_BLOCK=<n>` to re-snapshot a fixed block;
   `BASE_RPC=<url>` to change RPC (default publicnode; batch-friendly).

2. **Build the Merkle tree + proofs**:
   ```
   python3 script/build_allowlist.py         # -> data/allowlist.json (+ self-test)
   ```
   Prints `merkleRoot`. Add `--emit-js` to print the `const ALLOWLIST = [...]`
   line to paste into `tigermint.html`. Optional env: `MINT_PRICE_WEI`,
   `HOLDER_FREE_MAX`, `PAID_MAX`, `LAUNCH_TS` (+ `PHASE_WINDOW`/`PHASE_GAP`),
   `CURATED_ALLOWLIST` (phase-3 address file). The script self-verifies that every
   generated proof recomputes the root and that its pair-hash matches Solidity.

3. **Regenerate the dapp allow-list**: replace the `const ALLOWLIST = [...]` line
   in `tigermint.html` with the `--emit-js` output (the dapp embeds proofs; no
   off-chain URI is served).

4. **Deploy** with the root:
   ```
   FIFTYFIFTY=… FEE_RECIPIENT=… CLAIM_ROOT=… ALLOWLIST_ROOT=<merkleRoot> \
   MINT_PRICE_WEI=… forge script script/DeployFull.s.sol --rpc-url <RED> \
     --account <key> --broadcast --slow
   ```
   `DeployFull._configDrop` calls `token.updateAllowList(SEADROP, AllowListData{
   merkleRoot, publicKeyURIs:[], allowListURI:""})`. If `ALLOWLIST_ROOT` is unset
   (0x0) only the public drop is configured. To re-point the allow-list later
   (e.g. new snapshot or tight windows), re-run just the `updateAllowList` call.

   `allowListURI` is intentionally empty: only needed if OpenSea's HOSTED mint UI
   is used (it fetches proofs from that URI). Our own mint page ships the proofs,
   so no URI/hash publication step is required for the allow-list to work.

## Tests

`test/Allowlist.t.sol` deploys a real `SeaDrop`, wires the root exactly like
`DeployFull`, and mints through `SeaDrop.mintAllowList` — proving the leaf/proof
format end-to-end: FREE phase mints at price 0, PAID phase charges 0.001 and pays
the creator, under-payment / invalid proof / tampered params all revert.
