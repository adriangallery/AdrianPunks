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
        // 1 = Tiger punk, 2 = White-Tiger, 3 = Hoodie hat, 4 = Tiger+Hoodie (test-config forced)
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
    function test_rules() public view {
        string memory u1 = B64.decodeDataURI(r.tokenURI(1, _row(1)));
        assertTrue(_has(u1, "\"Punk\",\"value\":\"Tiger\""), "t1 punk=Tiger");

        string memory u2 = B64.decodeDataURI(r.tokenURI(2, _row(2)));
        assertTrue(_has(u2, "\"Punk\",\"value\":\"White Tiger\""), "t2 punk=White Tiger");

        // token 3: Hat = Hoodie -> NO Misc trait may appear
        string memory u3 = B64.decodeDataURI(r.tokenURI(3, _row(3)));
        assertTrue(_has(u3, "\"Hat\",\"value\":\"Hoodie\""), "t3 hat=Hoodie");
        assertTrue(!_has(u3, "\"trait_type\":\"Misc\""), "t3 no misc under hoodie");
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
