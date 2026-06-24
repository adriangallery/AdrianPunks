// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

/// @notice Minimal base64 decoder + data-URI helpers for tests only (gas-heavy,
///         never used on-chain). Lets assertions inspect the plaintext JSON/SVG
///         behind the base64 data URIs the renderer now emits.
library B64 {
    function decode(string memory _data) internal pure returns (bytes memory) {
        bytes memory data = bytes(_data);
        if (data.length == 0) return new bytes(0);
        require(data.length % 4 == 0, "bad b64 len");

        bytes memory table = new bytes(256);
        bytes memory alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (uint256 i = 0; i < 64; i++) table[uint8(alpha[i])] = bytes1(uint8(i));

        uint256 outLen = (data.length / 4) * 3;
        if (data[data.length - 1] == "=") outLen--;
        if (data[data.length - 2] == "=") outLen--;

        bytes memory result = new bytes(outLen);
        uint256 p = 0;
        for (uint256 i = 0; i < data.length; i += 4) {
            uint256 triple = (uint256(uint8(table[uint8(data[i])])) << 18)
                | (uint256(uint8(table[uint8(data[i + 1])])) << 12)
                | (uint256(uint8(table[uint8(data[i + 2])])) << 6)
                | uint256(uint8(table[uint8(data[i + 3])]));
            if (p < outLen) result[p++] = bytes1(uint8(triple >> 16));
            if (p < outLen) result[p++] = bytes1(uint8(triple >> 8));
            if (p < outLen) result[p++] = bytes1(uint8(triple));
        }
        return result;
    }

    /// @notice Decode a `data:...;base64,<payload>` URI back to its plaintext.
    function decodeDataURI(string memory uri) internal pure returns (string memory) {
        bytes memory b = bytes(uri);
        uint256 i = 0;
        while (i < b.length && b[i] != ",") i++;       // first comma ends the header
        bytes memory payload = new bytes(b.length - i - 1);
        for (uint256 j = i + 1; j < b.length; j++) payload[j - i - 1] = b[j];
        return string(decode(string(payload)));
    }

    /// @notice From a decoded JSON string, decode the first embedded svg+xml;base64 image.
    function firstSvg(string memory json) internal pure returns (string memory) {
        bytes memory b = bytes(json);
        bytes memory marker = bytes("image/svg+xml;base64,");
        uint256 start = _indexOf(b, marker);
        require(start != type(uint256).max, "no svg");
        start += marker.length;
        uint256 end = start;
        while (end < b.length && b[end] != '"') end++;
        bytes memory payload = new bytes(end - start);
        for (uint256 k = start; k < end; k++) payload[k - start] = b[k];
        return string(decode(string(payload)));
    }

    function _indexOf(bytes memory hay, bytes memory needle) private pure returns (uint256) {
        if (needle.length == 0 || hay.length < needle.length) return type(uint256).max;
        for (uint256 i = 0; i <= hay.length - needle.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (hay[i + j] != needle[j]) { ok = false; break; }
            }
            if (ok) return i;
        }
        return type(uint256).max;
    }
}
