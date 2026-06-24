// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import { ERC721SeaDrop } from "seadrop/ERC721SeaDrop.sol";
import { ERC721ContractMetadata } from "seadrop/ERC721ContractMetadata.sol";
import { ERC721AConduitPreapproved } from "seadrop/lib/ERC721AConduitPreapproved.sol";
import { ERC721AQueryable } from "ERC721A/extensions/ERC721AQueryable.sol";
import { ERC721A, IERC721A } from "ERC721A/ERC721A.sol";
import { SSTORE2 } from "solmate/utils/SSTORE2.sol";
import { MerkleProof } from "openzeppelin-contracts/utils/cryptography/MerkleProof.sol";
import { Base64 } from "openzeppelin-contracts/utils/Base64.sol";
import { TigerRenderer } from "./TigerRenderer.sol";
import { TigerMeta } from "./TigerMeta.sol";

/// @title  TigerPunks
/// @notice Fully on-chain ERC-721 minted via OpenSea SeaDrop (sequential, seed-curated).
///         Each tokenId (1..SUPPLY) maps to a fixed 10-byte trait combo, stored on-chain
///         via SSTORE2 in <=24KB chunks. tokenURI is rendered 100% on-chain by TigerRenderer.
///         Combos are pre-resolved off-chain from the curation builder's `set` (no on-chain
///         RNG); PROVENANCE pins the exact assignment.
contract TigerPunks is ERC721SeaDrop, ERC721AQueryable {
    uint256 public constant ROW = TigerMeta.ROW_BYTES;       // 10 bytes/token
    uint256 public constant ROWS_PER_CHUNK = 2457;           // 2457*10 = 24570 <= SSTORE2 max
    bytes32 public constant PROVENANCE = TigerMeta.PROVENANCE;

    TigerRenderer public renderer;
    bool public rendererFrozen;                              // one-way lock for the renderer
    address[] public comboChunks;                            // SSTORE2 pointers, in order
    bool public comboDataFrozen;

    // delayed-reveal random offset (anti-sniping): set AFTER mint via reveal()
    uint256 public revealOffset;
    bool public revealed;

    event Revealed(uint256 offset);

    error ComboDataFrozen();
    error ChunkMisaligned();
    error TraitsNotLoaded();
    error AlreadyRevealed();
    error RendererFrozen();

    event RendererFrozenEvent(address renderer);

    constructor(address[] memory allowedSeaDrop, address renderer_)
        ERC721SeaDrop("TigerPunks", "TPUNKS", allowedSeaDrop)
    {
        renderer = TigerRenderer(renderer_);
    }

    // ---- inheritance disambiguation (ERC721SeaDrop + ERC721AQueryable) ------
    // Both branches descend from ERC721A; route every shared override to the
    // SeaDrop side (royalty enforcement, transfer validator, startTokenId=1,
    // 2981/4906 interface ids) via super, while keeping ERC721AQueryable's
    // tokensOfOwner / explicitOwnership view helpers.
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC721A, IERC721A, ERC721SeaDrop) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function isApprovedForAll(address owner_, address operator)
        public view virtual override(ERC721A, ERC721AConduitPreapproved, IERC721A) returns (bool)
    {
        return super.isApprovedForAll(owner_, operator);
    }

    function _baseURI()
        internal view virtual override(ERC721A, ERC721ContractMetadata) returns (string memory)
    {
        return super._baseURI();
    }

    function _startTokenId()
        internal view virtual override(ERC721A, ERC721SeaDrop) returns (uint256)
    {
        return super._startTokenId();
    }

    function _beforeTokenTransfers(address from, address to, uint256 startTokenId, uint256 quantity)
        internal virtual override(ERC721A, ERC721ContractMetadata)
    {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }

    // ---- reveal -------------------------------------------------------------
    /// @notice Fix the random offset that maps tokenId -> curated combo. Call once,
    ///         after minting, so no one can snipe rare combos during the sale.
    function reveal() external onlyOwner {
        if (revealed) revert AlreadyRevealed();
        // block.prevrandao carries L1 beacon entropy on the OP stack (Base), which the
        // owner/sequencer cannot grind as cheaply as blockhash+timestamp alone.
        uint256 o = uint256(
            keccak256(abi.encodePacked(
                blockhash(block.number - 1), block.prevrandao, block.timestamp, _totalMinted(), address(this)
            ))
        ) % TigerMeta.SUPPLY;
        revealOffset = o == 0 ? 1 : o;          // guarantee a real shuffle
        revealed = true;
        emit Revealed(revealOffset);
    }

    // ---- animated 1/1s (tokenIds 1..SPECIAL_COUNT) -------------------------
    uint256 public constant SPECIAL_COUNT = 11;                 // migrated OG animated 1/1s
    mapping(uint256 => address[]) public specialChunks;        // tokenId => SSTORE2 ptrs (animated SVG)
    bool public specialsSeeded;
    bytes32 public claimRoot;                                   // leaf = keccak256(tokenId, claimer)
    string[SPECIAL_COUNT] public specialName;                  // optional per-1/1 name

    error SpecialsLocked();
    error NotSpecial();
    error NotEligible();
    error AlreadyClaimed();

    function isSpecial(uint256 tokenId) public pure returns (bool) {
        return tokenId >= 1 && tokenId <= SPECIAL_COUNT;
    }

    /// @notice Append a chunk of one 1/1's animated SVG (raw <svg>..</svg>, single-quoted).
    function addSpecialChunk(uint256 tokenId, bytes calldata d) external onlyOwner {
        if (specialsSeeded) revert SpecialsLocked();
        if (!isSpecial(tokenId)) revert NotSpecial();
        specialChunks[tokenId].push(SSTORE2.write(d));
    }

    function setSpecialName(uint256 tokenId, string calldata n) external onlyOwner {
        if (!isSpecial(tokenId)) revert NotSpecial();
        specialName[tokenId - 1] = n;
    }

    /// @notice Mint tokenIds 1..SPECIAL_COUNT to this contract (escrow) once all art is loaded.
    function seedSpecials() external onlyOwner {
        if (specialsSeeded) revert SpecialsLocked();
        specialsSeeded = true;
        _mint(address(this), SPECIAL_COUNT);                   // ERC721A: ids 1..SPECIAL_COUNT
    }

    function setClaimRoot(bytes32 r) external onlyOwner { claimRoot = r; }

    /// @notice Eligible OG owner claims their reserved 1/1 (held in escrow).
    function claimSpecial(uint256 tokenId, bytes32[] calldata proof) external {
        if (!isSpecial(tokenId)) revert NotSpecial();
        if (ownerOf(tokenId) != address(this)) revert AlreadyClaimed();
        bytes32 leaf = keccak256(abi.encodePacked(tokenId, msg.sender));
        if (!MerkleProof.verify(proof, claimRoot, leaf)) revert NotEligible();
        this.transferFrom(address(this), msg.sender, tokenId); // self-call: msg.sender==this==owner
    }

    /// @notice Owner airdrops any unclaimed 1/1 to its rightful OG owner after the window.
    function airdropSpecial(uint256 tokenId, address to) external onlyOwner {
        if (!isSpecial(tokenId)) revert NotSpecial();
        if (ownerOf(tokenId) != address(this)) revert AlreadyClaimed();
        this.transferFrom(address(this), to, tokenId);
    }

    function _specialURI(uint256 tokenId) internal view returns (string memory) {
        bytes memory svg;
        address[] storage cs = specialChunks[tokenId];
        for (uint256 i; i < cs.length; i++) svg = abi.encodePacked(svg, SSTORE2.read(cs[i]));
        string memory nm = bytes(specialName[tokenId - 1]).length > 0
            ? specialName[tokenId - 1]
            : string(abi.encodePacked("TigerPunk Legendary #", _toString(tokenId)));
        string memory image = string(abi.encodePacked(
            "data:image/svg+xml;base64,", Base64.encode(svg)
        ));
        bytes memory json = abi.encodePacked(
            "{\"name\":\"", nm,
            "\",\"description\":\"Animated 1/1 - migrated on-chain from the original AdrianPunks.\",",
            "\"image\":\"", image, "\",",
            "\"animation_url\":\"", image, "\",",
            "\"attributes\":[{\"trait_type\":\"1/1\",\"value\":\"", nm,
            "\"},{\"trait_type\":\"Type\",\"value\":\"Animated 1/1\"}]}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    // ---- leftover sweep (owner) --------------------------------------------
    /// @notice Mint remaining supply to `to` (treasury/holders) after the sale, so the
    ///         collection can be fully minted. Respects maxSupply.
    function ownerMint(address to, uint256 qty) external onlyOwner {
        require(_totalMinted() + qty <= maxSupply(), "exceeds maxSupply");
        _mint(to, qty);
    }

    /// @notice Cheap bulk sweep: mints `qty` to `to` emitting a single ERC-2309
    ///         ConsecutiveTransfer event (gas ~flat regardless of qty). Max 5000
    ///         per call (ERC721A limit) — split larger sweeps into batches.
    ///         Use only before any tokens are revealed/traded for best indexer support.
    function ownerMintBatch(address to, uint256 qty) external onlyOwner {
        require(_totalMinted() + qty <= maxSupply(), "exceeds maxSupply");
        _mintERC2309(to, qty);
    }

    // ---- combo data (owner, pre-launch) ------------------------------------
    /// @notice Append one SSTORE2 chunk of combo rows. Push chunks in tokenId order,
    ///         each exactly ROWS_PER_CHUNK rows (the final chunk may be shorter).
    function addComboChunk(bytes calldata data) external onlyOwner {
        if (comboDataFrozen) revert ComboDataFrozen();
        if (data.length % ROW != 0) revert ChunkMisaligned();
        comboChunks.push(SSTORE2.write(data));
    }

    /// @notice Lock combo data permanently once all chunks are uploaded & verified.
    function freezeComboData() external onlyOwner {
        comboDataFrozen = true;
    }

    /// @notice Swap the renderer (e.g. a bug-fix). Open until freezeRenderer() is called
    ///         (renderer is upgradeable; combo data can still be frozen separately).
    function setRenderer(address renderer_) external onlyOwner {
        if (rendererFrozen) revert RendererFrozen();
        renderer = TigerRenderer(renderer_);
    }

    /// @notice Permanently lock the renderer once the final art is verified, so the
    ///         collection is genuinely immutable ("frozen on-chain"). One-way.
    function freezeRenderer() external onlyOwner {
        rendererFrozen = true;
        emit RendererFrozenEvent(address(renderer));
    }

    // ---- reads --------------------------------------------------------------
    /// @notice Curated combo row for a tokenId, with the post-reveal random offset applied.
    function comboOf(uint256 tokenId) public view returns (bytes memory) {
        uint256 i = (tokenId - 1 + revealOffset) % TigerMeta.SUPPLY;  // shuffle by offset
        uint256 chunk = i / ROWS_PER_CHUNK;
        if (chunk >= comboChunks.length) revert TraitsNotLoaded();
        uint256 off = (i % ROWS_PER_CHUNK) * ROW;
        return SSTORE2.read(comboChunks[chunk], off, off + ROW);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721A, ERC721SeaDrop, IERC721A) returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        if (!revealed) return renderer.unrevealedURI(tokenId);   // everything is a mystery until reveal()
        if (isSpecial(tokenId)) return _specialURI(tokenId);     // animated 1/1 (after reveal)
        return renderer.tokenURI(tokenId, comboOf(tokenId));
    }

    function chunkCount() external view returns (uint256) {
        return comboChunks.length;
    }
}
