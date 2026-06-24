// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "./TigerData.sol";
import "./TigerLayout.sol";
import "./TigerMeta.sol";
import "./TigerArt.sol";
import { Base64 } from "openzeppelin-contracts/utils/Base64.sol";

/// @title TigerPunks fully on-chain renderer (24x24, 2-byte palette)
/// @notice z-order: Mode (solid bg), Punk (full-art face), Top, Beard, Hair, Hat,
///         Mouth, Eye, Misc (multi). Tiger / White-Tiger punks pull
///         Beard/Hair/Hat/Eye/Misc from the Tiger-* art. The art blob lives in
///         TigerArt (SSTORE2); palette + offsets are inline in TigerData.
///         Combo row (10 bytes): [mode][punk][top][beard][hair][hat][mouth][eye][miscLo][miscHi].
contract TigerRenderer {
    uint256 internal constant GRID = 24;
    address public owner;
    TigerArt public art;

    error NotOwner();
    constructor(address artStore) { owner = msg.sender; art = TigerArt(artStore); }
    function setArt(address artStore) external { if (msg.sender != owner) revert NotOwner(); art = TigerArt(artStore); }

    // ---- buffer helpers -----------------------------------------------------
    function _app(bytes memory buf, uint256 len, bytes memory s) internal pure returns (uint256) {
        uint256 n = s.length;
        assembly {
            let dst := add(add(buf, 0x20), len)
            let src := add(s, 0x20)
            for { let i := 0 } lt(i, n) { i := add(i, 0x20) } { mstore(add(dst, i), mload(add(src, i))) }
        }
        return len + n;
    }
    function _u(uint256 v) internal pure returns (bytes memory) {
        if (v == 0) return "0";
        uint256 d; uint256 t = v;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return b;
    }

    // ---- layer drawing (2-byte palette index) ------------------------------
    /// @dev Emit one filled run as an SVG rect. Kept separate so _drawLayer's stack stays shallow.
    function _rect(bytes memory buf, uint256 len, uint256 x, uint256 y, uint256 run, uint256 idx, bytes memory pal, uint24 tint) internal pure returns (uint256) {
        uint256 r; uint256 g; uint256 b;
        if (tint != 0) { r = tint >> 16; g = (tint >> 8) & 0xFF; b = tint & 0xFF; }
        else { uint256 o = idx * 3; r = uint8(pal[o]); g = uint8(pal[o + 1]); b = uint8(pal[o + 2]); }
        len = _app(buf, len, "<rect x='");
        len = _app(buf, len, _u(x));
        len = _app(buf, len, "' y='");
        len = _app(buf, len, _u(y));
        len = _app(buf, len, "' width='");
        len = _app(buf, len, _u(run));
        len = _app(buf, len, "' height='1' fill='rgb(");
        len = _app(buf, len, _u(r));
        len = _app(buf, len, ",");
        len = _app(buf, len, _u(g));
        len = _app(buf, len, ",");
        len = _app(buf, len, _u(b));
        return _app(buf, len, ")'/>");
    }

    /// @dev RLE run = [len][idxLo][idxHi]. `tint` != 0 forces the colour (silhouette).
    function _drawLayer(
        bytes memory buf, uint256 len,
        bytes memory blob, uint256 start, uint256 length,
        bytes memory pal, uint24 tint
    ) internal pure returns (uint256) {
        if (length < 2) return len;
        uint256 p = start;
        uint256 y = uint8(blob[p]);
        uint256 endRow = y + uint8(blob[p + 1]);
        p += 2;
        uint256 end = start + length;
        uint256 x = 0;
        while (p + 2 < end && y < endRow) {
            uint8 run = uint8(blob[p]);
            uint256 idx = uint256(uint8(blob[p + 1])) | (uint256(uint8(blob[p + 2])) << 8);
            p += 3;
            if (idx != 0) len = _rect(buf, len, x, y, run, idx, pal, tint);
            x += run;
            if (x >= GRID) { x = 0; y++; }
        }
        return len;
    }

    function _traitSlice(bytes memory offs, uint256 gi) internal pure returns (uint256 start, uint256 length) {
        uint256 o = gi * 4;
        start  = (uint256(uint8(offs[o]))     << 8) | uint8(offs[o + 1]);
        length = (uint256(uint8(offs[o + 2])) << 8) | uint8(offs[o + 3]);
    }
    function _draw(bytes memory buf, uint256 len, bytes memory blob, bytes memory offs, bytes memory pal, uint256 gi) internal pure returns (uint256) {
        (uint256 s, uint256 l) = _traitSlice(offs, gi);
        return _drawLayer(buf, len, blob, s, l, pal, 0);
    }
    function _single(bytes memory buf, uint256 len, bytes memory blob, bytes memory offs, bytes memory pal, uint256 base, uint8 local) internal pure returns (uint256) {
        if (local == 0) return len;
        return _draw(buf, len, blob, offs, pal, base + (local - 1));
    }

    // ---- public render ------------------------------------------------------
    function _bgRect(bytes memory buf, uint256 len, uint24 bgc) internal pure returns (uint256) {
        len = _app(buf, len, "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' shape-rendering='crispEdges'><rect width='24' height='24' fill='rgb(");
        len = _app(buf, len, _u(bgc >> 16));
        len = _app(buf, len, ",");
        len = _app(buf, len, _u((bgc >> 8) & 0xFF));
        len = _app(buf, len, ",");
        len = _app(buf, len, _u(bgc & 0xFF));
        return _app(buf, len, ")'/>");
    }

    /// @dev Draw Punk + all single/multi layers in z-order (tiger variant where applicable).
    function _compose(bytes memory buf, uint256 len, bytes memory c, bytes memory pal, bytes memory offs, bytes memory blob) internal pure returns (uint256) {
        bool tg = TigerLayout.isTigerPunk(uint8(c[1]));
        len = _draw(buf, len, blob, offs, pal, TigerLayout.P_PUNK + uint8(c[1]));
        len = _single(buf, len, blob, offs, pal, TigerLayout.P_TOP,                                uint8(c[2]));
        len = _single(buf, len, blob, offs, pal, tg ? TigerLayout.P_BEARD_T : TigerLayout.P_BEARD, uint8(c[3]));
        len = _single(buf, len, blob, offs, pal, tg ? TigerLayout.P_HAIR_T  : TigerLayout.P_HAIR,  uint8(c[4]));
        len = _single(buf, len, blob, offs, pal, tg ? TigerLayout.P_HAT_T   : TigerLayout.P_HAT,   uint8(c[5]));
        len = _single(buf, len, blob, offs, pal, TigerLayout.P_MOUTH,                              uint8(c[6]));
        len = _single(buf, len, blob, offs, pal, tg ? TigerLayout.P_EYE_T   : TigerLayout.P_EYE,   uint8(c[7]));
        uint16 misc = uint16(uint8(c[8])) | (uint16(uint8(c[9])) << 8);
        uint256 mbase = tg ? TigerLayout.P_MISC_T : TigerLayout.P_MISC;
        for (uint256 i = 0; i < TigerLayout.N_MISC; i++) {
            if (((misc >> i) & 1) != 0) len = _draw(buf, len, blob, offs, pal, mbase + i);
        }
        return len;
    }

    /// @notice Build the raw SVG from a 10-byte combo row.
    function imageSVG(bytes memory c) public view returns (string memory) {
        bytes memory pal  = TigerData.palette();
        bytes memory offs = TigerData.offs();
        bytes memory blob = art.blob();
        bytes memory buf  = new bytes(49152);
        uint256 len = _bgRect(buf, 0, TigerData.bgColors()[uint8(c[0])]);
        len = _compose(buf, len, c, pal, offs, blob);
        len = _app(buf, len, "</svg>");
        assembly { mstore(buf, len) }
        return string(buf);
    }

    function tokenURI(uint256 tokenId, bytes memory c) public view returns (string memory) {
        string memory image = string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(imageSVG(c)))));
        bytes memory json = abi.encodePacked(
            "{\"name\":\"TigerPunk #", _u(tokenId),
            "\",\"description\":\"TigerPunks - fully on-chain, hand-drawn pixel punks by HalfxTiger.\",\"image\":\"",
            image, "\",\"attributes\":", _attrsFull(c), "}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    /// @notice Pre-reveal: flat dark Punk silhouette, identical for every token.
    function unrevealedURI(uint256 tokenId) public view returns (string memory) {
        string memory image = string(abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(_silhouetteSVG())));
        bytes memory json = abi.encodePacked(
            "{\"name\":\"TigerPunk #", _u(tokenId),
            " (unrevealed)\",\"description\":\"TigerPunks - fully on-chain, hand-drawn pixel punks by HalfxTiger. Awaiting reveal.\",\"image\":\"",
            image, "\",\"attributes\":[{\"trait_type\":\"Status\",\"value\":\"Unrevealed\"}]}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _silhouetteSVG() internal view returns (bytes memory) {
        bytes memory pal  = TigerData.palette();
        bytes memory offs = TigerData.offs();
        bytes memory blob = art.blob();
        bytes memory buf  = new bytes(16384);
        uint256 len = 0;
        len = _app(buf, len, "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' shape-rendering='crispEdges'><rect width='24' height='24' fill='rgb(43,43,43)'/>");
        (uint256 s, uint256 l) = _traitSlice(offs, TigerLayout.P_PUNK);
        len = _drawLayer(buf, len, blob, s, l, pal, 0x555555);
        len = _app(buf, len, "</svg>");
        assembly { mstore(buf, len) }
        return buf;
    }

    // ---- attributes ---------------------------------------------------------
    function _attrCat(bytes memory buf, uint256 len, bytes memory tt, bytes memory label) internal pure returns (uint256) {
        len = _app(buf, len, ",{\"trait_type\":\"");
        len = _app(buf, len, tt);
        len = _app(buf, len, "\",\"value\":\"");
        len = _app(buf, len, label);
        len = _app(buf, len, "\"}");
        return len;
    }
    function _attrsFull(bytes memory c) internal pure returns (bytes memory) {
        bytes memory buf = new bytes(2048);
        uint256 len = 0;
        len = _app(buf, len, "[{\"trait_type\":\"Mode\",\"value\":\"");
        len = _app(buf, len, bytes(TigerMeta.labels_Mode()[uint8(c[0])]));
        len = _app(buf, len, "\"},{\"trait_type\":\"Punk\",\"value\":\"");
        len = _app(buf, len, bytes(TigerMeta.labels_Punk()[uint8(c[1])]));
        len = _app(buf, len, "\"}");
        uint8 v;
        v = uint8(c[2]); if (v != 0) len = _attrCat(buf, len, "Top",   bytes(TigerMeta.labels_Top()[v - 1]));
        v = uint8(c[3]); if (v != 0) len = _attrCat(buf, len, "Beard", bytes(TigerMeta.labels_Beard()[v - 1]));
        v = uint8(c[4]); if (v != 0) len = _attrCat(buf, len, "Hair",  bytes(TigerMeta.labels_Hair()[v - 1]));
        v = uint8(c[5]); if (v != 0) len = _attrCat(buf, len, "Hat",   bytes(TigerMeta.labels_Hat()[v - 1]));
        v = uint8(c[6]); if (v != 0) len = _attrCat(buf, len, "Mouth", bytes(TigerMeta.labels_Mouth()[v - 1]));
        v = uint8(c[7]); if (v != 0) len = _attrCat(buf, len, "Eye",   bytes(TigerMeta.labels_Eye()[v - 1]));
        uint16 misc = uint16(uint8(c[8])) | (uint16(uint8(c[9])) << 8);
        string[12] memory ml = TigerMeta.labels_Misc();
        for (uint256 i = 0; i < TigerLayout.N_MISC; i++) {
            if (((misc >> i) & 1) != 0) len = _attrCat(buf, len, "Misc", bytes(ml[i]));
        }
        len = _app(buf, len, "]");
        assembly { mstore(buf, len) }
        return buf;
    }
}
