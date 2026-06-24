// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Test.sol";
import { TigerArt } from "../src/TigerArt.sol";

/// Shared test helper: deploy TigerArt and load the RLE blob via SSTORE2 chunks.
abstract contract TigerBase is Test {
    function deployArt() internal returns (TigerArt art) {
        art = new TigerArt();
        bytes memory blob = vm.readFileBinary("data/blob.bin");
        uint256 MAX = 24575;                               // SSTORE2 per-pointer max
        for (uint256 o = 0; o < blob.length; o += MAX) {
            uint256 e = o + MAX; if (e > blob.length) e = blob.length;
            bytes memory part = new bytes(e - o);
            for (uint256 i = 0; i < part.length; i++) part[i] = blob[o + i];
            art.addChunk(part);
        }
        art.freeze();
    }
}
