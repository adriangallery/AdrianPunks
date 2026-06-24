// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Script.sol";
import { TigerRenderer } from "../src/TigerRenderer.sol";
import { TigerArt } from "../src/TigerArt.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { TigerMeta } from "../src/TigerMeta.sol";

/// @notice Deploys the renderer + token and uploads the curated combo table.
/// Env:
///   SEADROP   (default: canonical SeaDrop 1.0, same address on Sepolia & mainnet)
/// Run:
///   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --account adrian --broadcast
contract Deploy is Script {
    address constant SEADROP_DEFAULT = 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5;

    function run() external {
        address seadrop = vm.envOr("SEADROP", SEADROP_DEFAULT);

        address existing = vm.envOr("RENDERER", address(0));

        vm.startBroadcast();

        TigerRenderer renderer = existing == address(0)
            ? new TigerRenderer(_loadArt())
            : TigerRenderer(existing);

        address[] memory allowed = new address[](1);
        allowed[0] = seadrop;
        TigerPunks token = new TigerPunks(allowed, address(renderer));

        // upload combo table via SSTORE2 in <=24570-byte chunks.
        // MAX_CHUNKS lets a low-budget test upload only the first chunk(s)
        // (chunk 0 = tokens 1..ROWS_PER_CHUNK). maxSupply is set to the number
        // of rows actually loaded so no mintable token has an unrendered combo.
        bytes memory combos = vm.readFileBinary("data/combos.bin");
        uint256 perChunk = token.ROWS_PER_CHUNK() * token.ROW();
        uint256 maxChunks = vm.envOr("MAX_CHUNKS", type(uint256).max);
        uint256 n = 0;
        uint256 rowsLoaded = 0;
        for (uint256 off = 0; off < combos.length && n < maxChunks; off += perChunk) {
            uint256 end = off + perChunk;
            if (end > combos.length) end = combos.length;
            bytes memory part = new bytes(end - off);
            for (uint256 i = 0; i < part.length; i++) part[i] = combos[off + i];
            token.addComboChunk(part);
            rowsLoaded += part.length / token.ROW();
            n++;
        }

        uint256 maxSupply = rowsLoaded < TigerMeta.SUPPLY ? rowsLoaded : TigerMeta.SUPPLY;
        token.setMaxSupply(maxSupply);

        vm.stopBroadcast();
        console2.log("rowsLoaded:", rowsLoaded);

        console2.log("Renderer :", address(renderer));
        console2.log("TigerPunks:", address(token));
        console2.log("SeaDrop  :", seadrop);
        console2.log("maxSupply:", maxSupply);
        console2.log("chunks   :", n);
        console2.log("NOTE: combo data NOT frozen yet. Verify on OpenSea, then call freezeComboData().");
    }

    function _loadArt() internal returns (address) {
        TigerArt art = new TigerArt();
        bytes memory blob = vm.readFileBinary("data/blob.bin");
        uint256 amax = 24575;
        for (uint256 o = 0; o < blob.length; o += amax) {
            uint256 e = o + amax; if (e > blob.length) e = blob.length;
            bytes memory part = new bytes(e - o);
            for (uint256 i = 0; i < part.length; i++) part[i] = blob[o + i];
            art.addChunk(part);
        }
        art.freeze();
        return address(art);
    }
}
