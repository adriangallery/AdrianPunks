// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Test.sol";
import "../src/TigerRenderer.sol";
import "../src/TigerMeta.sol";
import { TigerBase } from "./TigerBase.sol";
import { B64 } from "./B64.sol";

contract RenderTest is TigerBase {
    TigerRenderer r;
    bytes combos;

    function setUp() public {
        r = new TigerRenderer(address(deployArt()));
        combos = vm.readFileBinary("data/combos.bin");
    }

    function _row(uint256 tokenId) internal view returns (bytes memory out) {
        uint256 w = TigerMeta.ROW_BYTES;
        uint256 o = (tokenId - 1) * w;
        out = new bytes(w);
        for (uint256 i = 0; i < w; i++) out[i] = combos[o + i];
    }

    function test_supply() public view {
        assertEq(TigerMeta.ROW_BYTES, 10);
        assertGt(TigerMeta.SUPPLY, 0);
        assertEq(combos.length, TigerMeta.SUPPLY * TigerMeta.ROW_BYTES);
    }

    function test_render_tokens() public {
        // sample a spread of token ids (first few + middle + last) — config-agnostic.
        uint256 N = TigerMeta.SUPPLY;
        uint256 mid = N / 2 == 0 ? 1 : N / 2;
        uint256[6] memory ids = [uint256(1), 2, 3, 4, mid, N];
        for (uint256 i = 0; i < ids.length; i++) {
            string memory svg = r.imageSVG(_row(ids[i]));
            bytes memory b = bytes(svg);
            assertGt(b.length, 200, "svg too small");
            assertEq(b[0], "<");
            assertEq(b[b.length - 1], ">");
            emit log_named_uint("token", ids[i]);
            emit log_named_uint("  svg bytes", b.length);
            vm.writeFile(string.concat("out/render_", vm.toString(ids[i]), ".svg"), svg);
        }
    }

    /// New-model rules: tiger punks render, Hoodie hat strips Misc.
    /// Config-agnostic: locate a representative token for each rule by decoding the
    /// baked combo rows (row[1]=punk 0-based, row[5]=hat 1-based), then assert the
    /// rendered metadata. Skips a check only if the curated set contains no such token.
    function test_rules() public view {
        int256 ti = _labelIdx(TigerMeta.labels_Punk(), "Tiger");
        if (ti >= 0) {
            uint256 t = _firstWithByte(1, uint8(uint256(ti)));   // punk byte is 0-based
            if (t != 0) {
                string memory u = B64.decodeDataURI(r.tokenURI(t, _row(t)));
                assertTrue(_has(u, "\"Punk\",\"value\":\"Tiger\""), "tiger renders");
            }
        }
        int256 wti = _labelIdx(TigerMeta.labels_Punk(), "White Tiger");
        if (wti >= 0) {
            uint256 t = _firstWithByte(1, uint8(uint256(wti)));
            if (t != 0) {
                string memory u = B64.decodeDataURI(r.tokenURI(t, _row(t)));
                assertTrue(_has(u, "\"Punk\",\"value\":\"White Tiger\""), "white tiger renders");
            }
        }
        int256 hi = _labelIdx(TigerMeta.labels_Hat(), "Hoodie");
        if (hi >= 0) {
            uint256 t = _firstWithByte(5, uint8(uint256(hi) + 1));   // hat byte is 1-based (0=None)
            if (t != 0) {
                string memory u = B64.decodeDataURI(r.tokenURI(t, _row(t)));
                assertTrue(_has(u, "\"Hat\",\"value\":\"Hoodie\""), "hoodie hat");
                assertTrue(!_has(u, "\"trait_type\":\"Misc\""), "no misc under hoodie");
            }
        }
    }

    /// index of `label` in a fixed-size string array, or -1 if absent.
    function _labelIdx(string[8] memory a, string memory label) internal pure returns (int256) {
        for (uint256 i = 0; i < a.length; i++) if (_streq(a[i], label)) return int256(i);
        return -1;
    }
    function _labelIdx(string[23] memory a, string memory label) internal pure returns (int256) {
        for (uint256 i = 0; i < a.length; i++) if (_streq(a[i], label)) return int256(i);
        return -1;
    }
    /// first tokenId (1..SUPPLY) whose combo row byte `b` equals `val`, else 0.
    function _firstWithByte(uint256 b, uint8 val) internal view returns (uint256) {
        for (uint256 t = 1; t <= TigerMeta.SUPPLY; t++) {
            if (uint8(combos[(t - 1) * TigerMeta.ROW_BYTES + b]) == val) return t;
        }
        return 0;
    }
    function _streq(string memory x, string memory y) internal pure returns (bool) {
        return keccak256(bytes(x)) == keccak256(bytes(y));
    }

    function test_gas_render() public {
        bytes memory c = _row(1);
        uint256 g0 = gasleft();
        r.imageSVG(c);
        emit log_named_uint("imageSVG gas (view)", g0 - gasleft());
        uint256 g1 = gasleft();
        r.tokenURI(1, c);
        emit log_named_uint("tokenURI gas (view)", g1 - gasleft());
    }

    function test_tokenURI_shape() public {
        string memory enc = r.tokenURI(1, _row(1));
        vm.writeFile("out/token_1.json", enc);
        assertTrue(_has(enc, "data:application/json;base64,"), "json b64 prefix");
        string memory uri = B64.decodeDataURI(enc);
        assertTrue(_has(uri, "data:image/svg+xml;base64,"), "img b64 prefix");
        assertTrue(_has(uri, "TigerPunk #1"), "name");
        assertTrue(_has(uri, "\"trait_type\":\"Mode\""), "mode attr");
        assertTrue(_has(uri, "\"trait_type\":\"Punk\""), "punk attr");
    }

    function _has(string memory hay, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(hay); bytes memory n = bytes(needle);
        if (n.length == 0 || n.length > h.length) return n.length == 0;
        for (uint256 i = 0; i <= h.length - n.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) { ok = false; break; }
            }
            if (ok) return true;
        }
        return false;
    }
}
