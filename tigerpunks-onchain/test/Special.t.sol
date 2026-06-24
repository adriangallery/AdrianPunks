// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Test.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { TigerRenderer } from "../src/TigerRenderer.sol";
import { TigerBase } from "./TigerBase.sol";
import { B64 } from "./B64.sol";

contract SpecialTest is TigerBase {
    TigerRenderer renderer;
    TigerPunks token;

    function setUp() public {
        renderer = new TigerRenderer(address(deployArt()));
        address[] memory allowed = new address[](1);
        allowed[0] = address(this);
        token = new TigerPunks(allowed, address(renderer));
        token.setMaxSupply(10000);

        // load one real animated 1/1 (#807, smallest) into special tokenId 1
        bytes memory svg = vm.readFileBinary("out/anim/all/807.svg");
        uint256 per = 24000;
        for (uint256 off = 0; off < svg.length; off += per) {
            uint256 end = off + per; if (end > svg.length) end = svg.length;
            bytes memory part = new bytes(end - off);
            for (uint256 i = 0; i < part.length; i++) part[i] = svg[off + i];
            token.addSpecialChunk(1, part);
        }
        token.setSpecialName(1, "TigerPunk Legendary #807");
        token.seedSpecials();
    }

    function test_seeded_to_escrow() public view {
        assertTrue(token.specialsSeeded());
        assertEq(token.ownerOf(1), address(token));     // escrow holds it
        assertEq(token.ownerOf(11), address(token));
        assertEq(token.totalSupply(), 11);
    }

    function test_special_tokenURI_animated() public {
        // before reveal: even the 1/1s are a mystery (silhouette), so claiming
        // early still doesn't leak the legendary art until the global reveal()
        string memory preEnc = token.tokenURI(1);
        string memory pre = B64.decodeDataURI(preEnc);
        assertTrue(_has(pre, "(unrevealed)"), "1/1 hidden pre-reveal");
        assertTrue(!_has(pre, "Animated 1/1"), "no 1/1 art pre-reveal");

        token.reveal();                                  // global reveal flips everything on

        string memory enc = token.tokenURI(1);
        vm.writeFile("out/onchain_special_1.json", enc);
        string memory uri = B64.decodeDataURI(enc);      // plaintext JSON
        assertTrue(_has(uri, "TigerPunk Legendary #807"));
        assertTrue(_has(uri, "\"animation_url\":\"data:image/svg+xml;base64,"));
        assertTrue(_has(uri, "\"Animated 1/1\""));
        string memory svg = B64.firstSvg(uri);           // decode the embedded svg
        assertTrue(_has(svg, "<svg"));
        assertTrue(_has(svg, "<animate"));               // SMIL animation present
    }

    function test_claim_with_merkle() public {
        address alice = makeAddr("alice");
        // single-leaf tree: root == leaf, empty proof
        bytes32 leaf = keccak256(abi.encodePacked(uint256(1), alice));
        token.setClaimRoot(leaf);

        bytes32[] memory proof = new bytes32[](0);
        vm.prank(alice);
        token.claimSpecial(1, proof);
        assertEq(token.ownerOf(1), alice);

        // can't claim twice
        vm.prank(alice);
        vm.expectRevert();
        token.claimSpecial(1, proof);
    }

    function test_airdrop_unclaimed() public {
        address bob = makeAddr("bob");
        token.airdropSpecial(2, bob);
        assertEq(token.ownerOf(2), bob);
    }

    function test_ineligible_cannot_claim() public {
        address mallory = makeAddr("mallory");
        token.setClaimRoot(keccak256(abi.encodePacked(uint256(1), makeAddr("alice"))));
        bytes32[] memory proof = new bytes32[](0);
        vm.prank(mallory);
        vm.expectRevert();
        token.claimSpecial(1, proof);
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
