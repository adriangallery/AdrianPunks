// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TigerRenderer.sol";

contract RenderTest is Test {
    function test_render_writes_svg() public {
        TigerRenderer r = new TigerRenderer();
        // tiger skin (0xF5A623), recolor on, orange bg (0xFF8A3D)
        string memory svg = r.renderSVG(true, 0xF5A623, 0xFF8A3D);
        bytes memory b = bytes(svg);
        emit log_named_uint("svg bytes", b.length);
        assertGt(b.length, 1000, "svg too small");
        // sanity: starts with <svg
        assertEq(b[0], "<");
        vm.writeFile("out_onchain.svg", svg);
        // gas snapshot for a tokenURI-style read
        uint256 g0 = gasleft();
        r.renderSVG(true, 0xF5A623, 0xFF8A3D);
        emit log_named_uint("render gas (view)", g0 - gasleft());
    }
}
