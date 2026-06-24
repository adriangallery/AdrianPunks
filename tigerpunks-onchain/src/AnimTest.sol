// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import { ERC721 } from "solmate/tokens/ERC721.sol";
import { SSTORE2 } from "solmate/utils/SSTORE2.sol";

/// @notice Throwaway POC: stores ONE on-chain animated SVG (SMIL) and serves it in
///         tokenURI as both `image` and `animation_url`, to verify OpenSea animates it.
contract AnimTest is ERC721 {
    address public owner;
    address[] public chunks;          // SSTORE2 pointers holding the SVG bytes
    constructor() ERC721("TigerPunks Anim Test", "TPAT") { owner = msg.sender; }

    function addChunk(bytes calldata d) external { require(msg.sender == owner); chunks.push(SSTORE2.write(d)); }
    function mint(address to, uint256 id) external { require(msg.sender == owner); _mint(to, id); }

    function svg() public view returns (bytes memory s) {
        for (uint256 i; i < chunks.length; i++) s = abi.encodePacked(s, SSTORE2.read(chunks[i]));
    }

    function tokenURI(uint256) public view override returns (string memory) {
        bytes memory s = svg();
        return string(abi.encodePacked(
            "data:application/json;utf8,{\"name\":\"TigerPunk Omega #221 (anim test)\",",
            "\"description\":\"On-chain animated 1/1 migration POC.\",",
            "\"image\":\"data:image/svg+xml;utf8,", s, "\",",
            "\"animation_url\":\"data:image/svg+xml;utf8,", s, "\"}"
        ));
    }
}
