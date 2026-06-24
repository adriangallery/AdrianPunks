// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import { SSTORE2 } from "solmate/utils/SSTORE2.sol";

/// @title TigerArt — on-chain RLE art blob store (SSTORE2)
/// @notice The 2-byte-palette art blob is too large for EIP-170, so it ships as
///         SSTORE2 chunks here. Push chunks in order, then freeze. `blob()`
///         concatenates them; it is a `view` path only (no gas for holders).
contract TigerArt {
    address public owner;
    address[] public chunks;          // SSTORE2 pointers, in order
    bool public frozen;

    error NotOwner();
    error Frozen();

    constructor() { owner = msg.sender; }
    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    function addChunk(bytes calldata data) external onlyOwner {
        if (frozen) revert Frozen();
        chunks.push(SSTORE2.write(data));
    }

    function freeze() external onlyOwner { frozen = true; }

    function chunkCount() external view returns (uint256) { return chunks.length; }

    /// @notice The full concatenated art blob (view-only; no gas for holders).
    function blob() external view returns (bytes memory) {
        uint256 n = chunks.length;
        if (n == 0) return "";
        if (n == 1) return SSTORE2.read(chunks[0]);
        uint256 total;
        for (uint256 i; i < n; i++) total += SSTORE2.read(chunks[i]).length;
        bytes memory out = new bytes(total);
        uint256 w;
        for (uint256 i; i < n; i++) {
            bytes memory part = SSTORE2.read(chunks[i]);
            uint256 m = part.length;
            for (uint256 j; j < m; j++) { out[w] = part[j]; w++; }
        }
        return out;
    }
}
