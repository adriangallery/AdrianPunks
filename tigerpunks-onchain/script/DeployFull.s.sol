// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Script.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { TigerRenderer } from "../src/TigerRenderer.sol";
import { TigerArt } from "../src/TigerArt.sol";
import { TigerMeta } from "../src/TigerMeta.sol";
import { PublicDrop } from "seadrop/lib/SeaDropStructs.sol";
import { ISeaDropTokenContractMetadata } from "seadrop/interfaces/ISeaDropTokenContractMetadata.sol";

/// @notice Full integral deploy + config on one --slow run.
/// Env: FIFTYFIFTY, FEE_RECIPIENT, CLAIM_ROOT (bytes32), MINT_PRICE_WEI (default 1e15 = 0.001)
contract DeployFull is Script {
    address constant SEADROP = 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5;

    function run() external {
        address fifty   = vm.envAddress("FIFTYFIFTY");
        address feeRec  = vm.envOr("FEE_RECIPIENT", fifty);
        bytes32 root    = vm.envBytes32("CLAIM_ROOT");
        uint256 price   = vm.envOr("MINT_PRICE_WEI", uint256(1e15)); // 0.001 ETH

        vm.startBroadcast();

        // 0) on-chain art blob via SSTORE2 (2-byte palette -> exceeds EIP-170)
        address art = _loadArt();
        TigerRenderer renderer = new TigerRenderer(art);
        address[] memory allowed = new address[](1); allowed[0] = SEADROP;
        TigerPunks token = new TigerPunks(allowed, address(renderer));
        // maxSupply MUST equal the baked SUPPLY: comboOf()/reveal() index `% TigerMeta.SUPPLY`,
        // so any divergence (e.g. the old hardcoded 10000 vs a test-baked 80) silently breaks
        // the collection (combos repeat, offset wraps the wrong modulus).
        token.setMaxSupply(TigerMeta.SUPPLY);
        require(token.maxSupply() == TigerMeta.SUPPLY, "maxSupply != baked SUPPLY");

        _uploadCombos(token);   // 1) curated combos
        // Every tokenId must resolve to a loaded combo row before any mint can happen.
        require(token.chunkCount() * token.ROWS_PER_CHUNK() >= TigerMeta.SUPPLY, "combos do not cover SUPPLY");
        token.freezeComboData();   // lock combos before the sale opens

        _loadSpecials(token);   // 2) animated 1/1s (tokenIds 1..11) + names
        token.seedSpecials();   // mint tokenIds 1..11 to escrow
        token.setClaimRoot(root);
        _configDrop(token, fifty, feeRec, price);   // 3) royalties + 4) public drop

        // 5) bake the 100% on-chain collection metadata (data: URI w/ on-chain logo) into
        //    the token's contractURI. Re-run this if you update copy/showcase before freezing.
        token.setContractURI(renderer.contractURI());

        vm.stopBroadcast();

        console2.log("TigerArt  :", art);
        console2.log("Renderer  :", address(renderer));
        console2.log("TigerPunks:", address(token));
        console2.log("FiftyFifty:", fifty);
    }

    function _slice(bytes memory b, uint256 s, uint256 e) internal pure returns (bytes memory out) {
        out = new bytes(e - s);
        for (uint256 i = 0; i < out.length; i++) out[i] = b[s + i];
    }

    function _loadArt() internal returns (address) {
        TigerArt art = new TigerArt();
        bytes memory blob = vm.readFileBinary("data/blob.bin");
        uint256 amax = 24575;
        for (uint256 o = 0; o < blob.length; o += amax) {
            uint256 e = o + amax; if (e > blob.length) e = blob.length;
            art.addChunk(_slice(blob, o, e));
        }
        art.freeze();
        return address(art);
    }

    function _uploadCombos(TigerPunks token) internal {
        bytes memory combos = vm.readFileBinary("data/combos.bin");
        uint256 per = token.ROWS_PER_CHUNK() * token.ROW();
        for (uint256 o = 0; o < combos.length; o += per) {
            uint256 e = o + per; if (e > combos.length) e = combos.length;
            token.addComboChunk(_slice(combos, o, e));
        }
    }

    function _loadSpecials(TigerPunks token) internal {
        uint256[11] memory og = [uint256(1),13,69,221,369,420,555,690,777,807,911];
        string[11] memory nm = ["Adrian","Negative","Checker","Idea","Laser","420","$ADRIAN","Mona Punk Lisa","Funk","OI","FFS!"];
        for (uint256 i = 0; i < 11; i++) {
            bytes memory svg = vm.readFileBinary(string.concat("out/anim/final/", vm.toString(og[i]), ".svg"));
            uint256 cp = 24000;
            for (uint256 o = 0; o < svg.length; o += cp) {
                uint256 e = o + cp; if (e > svg.length) e = svg.length;
                token.addSpecialChunk(i + 1, _slice(svg, o, e));
            }
            token.setSpecialName(i + 1, nm[i]);
        }
    }

    function _configDrop(TigerPunks token, address fifty, address feeRec, uint256 price) internal {
        token.setRoyaltyInfo(ISeaDropTokenContractMetadata.RoyaltyInfo({ royaltyAddress: fifty, royaltyBps: 500 }));
        token.updateCreatorPayoutAddress(SEADROP, fifty);
        token.updateAllowedFeeRecipient(SEADROP, feeRec, true);
        token.updatePublicDrop(SEADROP, PublicDrop({
            mintPrice: uint80(price), startTime: uint48(block.timestamp),
            endTime: uint48(block.timestamp + 365 days),
            maxTotalMintableByWallet: 100, feeBps: 0, restrictFeeRecipients: false
        }));
    }
}
