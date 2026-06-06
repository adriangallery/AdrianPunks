// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TigerData.sol";

/// @title TigerPunks fully on-chain renderer (PoC)
/// @notice Decodes palette + full-row RLE trait data into an SVG, entirely on-chain.
///         The base layer gets the tiger remap (anaglyph red->orange / cyan->dark)
///         and an optional skin tint (white face -> skin color), mirroring the builder.
contract TigerRenderer {
    uint256 internal constant GRID = 72;

    function _u(uint256 v) internal pure returns (bytes memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t = v;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return b;
    }

    function _col(bytes memory pal, uint8 idx) internal pure returns (uint8 r, uint8 g, uint8 b) {
        uint256 o = uint256(idx) * 3;
        r = uint8(pal[o]); g = uint8(pal[o + 1]); b = uint8(pal[o + 2]);
    }

    function _remap(uint8 r, uint8 g, uint8 b, bool recolor, uint8 sr, uint8 sg, uint8 sb, bool hasSkin)
        internal pure returns (uint8, uint8, uint8)
    {
        if (recolor && r > 150 && g < 115 && b < 115) return (255, 107, 43); // red -> tiger orange
        if (recolor && r < 115 && g > 150 && b > 150) return (18, 18, 18);   // cyan -> near black
        if (hasSkin && r > 238 && g > 238 && b > 238) return (sr, sg, sb);   // white face -> skin
        return (r, g, b);
    }

    function _layer(
        bytes memory data, bytes memory pal,
        bool isBase, bool recolor, uint8 sr, uint8 sg, uint8 sb, bool hasSkin
    ) internal pure returns (bytes memory out) {
        uint256 x; uint256 y;
        for (uint256 i = 0; i + 1 < data.length; i += 2) {
            uint8 len = uint8(data[i]);
            uint8 idx = uint8(data[i + 1]);
            if (idx != 0) {
                (uint8 r, uint8 g, uint8 b) = _col(pal, idx);
                if (isBase) (r, g, b) = _remap(r, g, b, recolor, sr, sg, sb, hasSkin);
                out = abi.encodePacked(
                    out,
                    '<rect x="', _u(x), '" y="', _u(y), '" width="', _u(len),
                    '" height="1" fill="rgb(', _u(r), ',', _u(g), ',', _u(b), ')"/>'
                );
            }
            x += len;
            if (x >= GRID) { x = 0; y++; }
        }
    }

    /// @param recolor apply tiger anaglyph remap on base
    /// @param skin    packed RGB skin color; 0x000000 = classic (white face kept)
    /// @param bg      packed RGB background color
    function renderSVG(bool recolor, uint24 skin, uint24 bg) public pure returns (string memory) {
        bytes memory pal = TigerData.palette();
        bool hasSkin = skin != 0;
        uint8 sr = uint8(skin >> 16); uint8 sg = uint8(skin >> 8); uint8 sb = uint8(skin);
        uint8 br = uint8(bg >> 16); uint8 bgc = uint8(bg >> 8); uint8 bb = uint8(bg);

        bytes memory s = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" shape-rendering="crispEdges">',
            '<rect x="0" y="0" width="72" height="72" fill="rgb(', _u(br), ',', _u(bgc), ',', _u(bb), ')"/>'
        );
        s = abi.encodePacked(s, _layer(TigerData.BASE(),  pal, true,  recolor, sr, sg, sb, hasSkin));
        s = abi.encodePacked(s, _layer(TigerData.TOP(),   pal, false, false, 0,0,0, false));
        s = abi.encodePacked(s, _layer(TigerData.HAIR(),  pal, false, false, 0,0,0, false));
        s = abi.encodePacked(s, _layer(TigerData.EYES(),  pal, false, false, 0,0,0, false));
        s = abi.encodePacked(s, _layer(TigerData.MOUTH(), pal, false, false, 0,0,0, false));
        s = abi.encodePacked(s, _layer(TigerData.HAT(),   pal, false, false, 0,0,0, false));
        s = abi.encodePacked(s, '</svg>');
        return string(s);
    }
}
