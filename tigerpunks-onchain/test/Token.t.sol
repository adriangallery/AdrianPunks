// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Test.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { TigerRenderer } from "../src/TigerRenderer.sol";
import { TigerMeta } from "../src/TigerMeta.sol";
import { TigerBase } from "./TigerBase.sol";
import { B64 } from "./B64.sol";

contract TokenTest is TigerBase {
    TigerRenderer renderer;
    TigerPunks token;
    bytes combos;

    function setUp() public {
        renderer = new TigerRenderer(address(deployArt()));
        address[] memory allowed = new address[](1);
        allowed[0] = address(this);                 // act as SeaDrop in tests
        token = new TigerPunks(allowed, address(renderer));
        token.setMaxSupply(TigerMeta.SUPPLY);

        combos = vm.readFileBinary("data/combos.bin");
        uint256 perChunk = token.ROWS_PER_CHUNK() * token.ROW();   // 24570 bytes
        for (uint256 off = 0; off < combos.length; off += perChunk) {
            uint256 end = off + perChunk; if (end > combos.length) end = combos.length;
            bytes memory part = new bytes(end - off);
            for (uint256 i = 0; i < part.length; i++) part[i] = combos[off + i];
            token.addComboChunk(part);
        }
        token.freezeComboData();
        token.seedSpecials();            // tokenIds 1..11 reserved as animated 1/1s; normals start at 12
    }

    function test_chunks_and_provenance() public view {
        uint256 per = token.ROWS_PER_CHUNK() * token.ROW();
        uint256 expected = (combos.length + per - 1) / per;
        assertEq(token.chunkCount(), expected);
        assertTrue(token.PROVENANCE() != bytes32(0));
    }

    function test_comboOf_matches_file() public view {
        uint256 w = token.ROW();
        bytes memory c1 = token.comboOf(1);                       // pre-reveal: offset 0 -> row 0
        for (uint256 i = 0; i < w; i++) assertEq(c1[i], combos[i]);
        uint256 last = TigerMeta.SUPPLY;
        bytes memory cLast = token.comboOf(last);                 // -> row last-1
        for (uint256 i = 0; i < w; i++) assertEq(cLast[i], combos[(last - 1) * w + i]);
    }

    function test_seadrop_interface() public view {
        // INonFungibleSeaDropToken interfaceId
        assertTrue(token.supportsInterface(0x1890fe8e), "not SeaDrop token");
        assertTrue(token.supportsInterface(0x80ac58cd), "not ERC721");
    }

    function test_unrevealed_then_reveal() public {
        address alice = makeAddr("alice");
        token.mintSeaDrop(alice, 1);
        uint256 id = 12;                 // first public token after the 11 reserved 1/1s
        assertEq(token.ownerOf(id), alice);

        // before reveal -> mystery placeholder
        string memory pre = B64.decodeDataURI(token.tokenURI(id));
        assertTrue(_has(pre, "(unrevealed)"), "should be unrevealed");
        assertTrue(_has(pre, "\"Status\",\"value\":\"Unrevealed\""), "status");
        assertFalse(token.revealed());

        // reveal -> offset fixed, real on-chain render
        token.reveal();
        assertTrue(token.revealed());
        assertGt(token.revealOffset(), 0);

        string memory enc = token.tokenURI(id);
        vm.writeFile("out/onchain_token_12.json", enc);
        string memory uri = B64.decodeDataURI(enc);
        assertTrue(_has(uri, "TigerPunk #12"));
        assertTrue(_has(uri, "data:image/svg+xml;base64,"));
        assertTrue(_has(B64.firstSvg(uri), "<svg"));
        assertTrue(_has(uri, "\"trait_type\":\"Mode\""));
        assertTrue(_has(uri, "\"trait_type\":\"Punk\""));
        // self-consistent with the standalone renderer fed the offset-applied combo
        assertEq(enc, renderer.tokenURI(id, token.comboOf(id)));
    }

    function test_reveal_only_once() public {
        token.reveal();
        vm.expectRevert();
        token.reveal();
    }

    function _has(string memory hay, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(hay); bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < n.length; j++) if (h[i + j] != n[j]) { ok = false; break; }
            if (ok) return true;
        }
        return false;
    }
}
