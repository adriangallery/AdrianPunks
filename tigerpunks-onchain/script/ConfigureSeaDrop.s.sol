// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Script.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { PublicDrop } from "seadrop/lib/SeaDropStructs.sol";

/// @notice Configures a public SeaDrop stage so the token is mintable.
/// Env (all optional except TOKEN):
///   TOKEN        deployed TigerPunks address
///   SEADROP      (default canonical SeaDrop 1.0)
///   CREATOR      creator payout address (default: deployer/tx.origin)
///   FEE_RECIPIENT allowed fee recipient (default: CREATOR; OpenSea sets its own in its UI)
///   MINT_PRICE_WEI (default 0 = free public mint)
///   MAX_PER_WALLET (default 5)
/// Run:
///   TOKEN=0x.. forge script script/ConfigureSeaDrop.s.sol --rpc-url $SEPOLIA_RPC --account adrian --broadcast
contract ConfigureSeaDrop is Script {
    address constant SEADROP_DEFAULT = 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5;

    function run() external {
        TigerPunks token = TigerPunks(vm.envAddress("TOKEN"));
        address seadrop  = vm.envOr("SEADROP", SEADROP_DEFAULT);
        address creator  = vm.envOr("CREATOR", tx.origin);
        address feeRecip = vm.envOr("FEE_RECIPIENT", creator);
        uint256 price    = vm.envOr("MINT_PRICE_WEI", uint256(0));
        uint256 perWallet = vm.envOr("MAX_PER_WALLET", uint256(5));

        vm.startBroadcast();

        token.updateCreatorPayoutAddress(seadrop, creator);
        token.updateAllowedFeeRecipient(seadrop, feeRecip, true);
        token.updatePublicDrop(
            seadrop,
            PublicDrop({
                mintPrice: uint80(price),
                startTime: uint48(block.timestamp),
                endTime: uint48(block.timestamp + 365 days),
                maxTotalMintableByWallet: uint16(perWallet),
                feeBps: 0,
                restrictFeeRecipients: false
            })
        );

        vm.stopBroadcast();

        console2.log("Configured public drop on", address(token));
        console2.log("  creator payout:", creator);
        console2.log("  fee recipient :", feeRecip);
        console2.log("  mint price wei:", price);
        console2.log("  max/wallet    :", perWallet);
    }
}
