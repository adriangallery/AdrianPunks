// SPDX-License-Identifier: MIT
pragma solidity >=0.8.17;

import "forge-std/Test.sol";
import { TigerPunks } from "../src/TigerPunks.sol";
import { TigerRenderer } from "../src/TigerRenderer.sol";
import { TigerBase } from "./TigerBase.sol";
import { SeaDrop } from "seadrop/SeaDrop.sol";
import { AllowListData, MintParams, PublicDrop } from "seadrop/lib/SeaDropStructs.sol";

/// End-to-end coverage of the allow-list mint phases wired by DeployFull's
/// `_configDrop` (T1). Deploys a REAL SeaDrop instance so the leaf format
/// (keccak256(abi.encode(minter, MintParams))) and the sorted-pair Merkle proof
/// are validated by SeaDrop itself — the same path script/build_allowlist.py
/// generates proofs for.
contract AllowlistTest is TigerBase {
    TigerPunks token;
    SeaDrop seadrop;
    address creator = makeAddr("creator");
    address feeRecipient = makeAddr("feeRecipient");
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256 constant PRICE = 0.001 ether;

    function setUp() public {
        seadrop = new SeaDrop();
        TigerRenderer renderer = new TigerRenderer(address(deployArt()));
        address[] memory allowed = new address[](1);
        allowed[0] = address(seadrop);
        token = new TigerPunks(allowed, address(renderer));
        token.setMaxSupply(10000);

        // Mirror DeployFull._configDrop drop/fee wiring (minus files/broadcast).
        token.updateCreatorPayoutAddress(address(seadrop), creator);
        token.updateAllowedFeeRecipient(address(seadrop), feeRecipient, true);
    }

    // ---- MintParams builders (order == SeaDropStructs.MintParams) ------------
    function _freeParams() internal pure returns (MintParams memory) {
        return MintParams({
            mintPrice: 0,
            maxTotalMintableByWallet: 3,
            startTime: 1,
            endTime: 2_000_000_000,
            dropStageIndex: 1,
            maxTokenSupplyForStage: 10000,
            feeBps: 0,
            restrictFeeRecipients: false
        });
    }

    function _paidParams() internal pure returns (MintParams memory) {
        return MintParams({
            mintPrice: PRICE,
            maxTotalMintableByWallet: 100,
            startTime: 1,
            endTime: 2_000_000_000,
            dropStageIndex: 2,
            maxTokenSupplyForStage: 10000,
            feeBps: 0,
            restrictFeeRecipients: false
        });
    }

    function _leaf(address minter, MintParams memory mp) internal pure returns (bytes32) {
        return keccak256(abi.encode(minter, mp));
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    /// Build a 2-leaf tree {alice-FREE, alice-PAID}; set the root on-chain the
    /// same way DeployFull does (token.updateAllowList).
    function _setTwoLeafTree()
        internal
        returns (bytes32 leafFree, bytes32 leafPaid, bytes32 root)
    {
        leafFree = _leaf(alice, _freeParams());
        leafPaid = _leaf(alice, _paidParams());
        root = _hashPair(leafFree, leafPaid);
        token.updateAllowList(
            address(seadrop),
            AllowListData({ merkleRoot: root, publicKeyURIs: new string[](0), allowListURI: "" })
        );
        assertEq(seadrop.getAllowListMerkleRoot(address(token)), root, "root not stored");
    }

    function test_updateAllowList_stores_root_via_token() public {
        (, , bytes32 root) = _setTwoLeafTree();
        assertEq(seadrop.getAllowListMerkleRoot(address(token)), root);
    }

    function test_holders_free_phase_mints_for_zero() public {
        (bytes32 leafFree, bytes32 leafPaid, ) = _setTwoLeafTree();
        leafFree; // silence
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafPaid; // sibling

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        seadrop.mintAllowList{ value: 0 }(
            address(token), feeRecipient, address(0), 3, _freeParams(), proof
        );
        assertEq(token.balanceOf(alice), 3, "free phase should mint 3 at price 0");
    }

    function test_holders_paid_phase_charges_price() public {
        (bytes32 leafFree, , ) = _setTwoLeafTree();
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafFree; // sibling of leafPaid

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        seadrop.mintAllowList{ value: 2 * PRICE }(
            address(token), feeRecipient, address(0), 2, _paidParams(), proof
        );
        assertEq(token.balanceOf(alice), 2);
        assertEq(creator.balance, 2 * PRICE, "creator not paid the mint price");
    }

    function test_paid_phase_reverts_on_underpayment() public {
        (bytes32 leafFree, , ) = _setTwoLeafTree();
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafFree;

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(); // IncorrectPayment
        seadrop.mintAllowList{ value: PRICE }( // pays for 1 but mints 2
            address(token), feeRecipient, address(0), 2, _paidParams(), proof
        );
    }

    function test_invalid_proof_reverts() public {
        _setTwoLeafTree();
        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = keccak256("garbage");

        vm.deal(bob, 1 ether);
        vm.prank(bob); // bob is not in the tree
        vm.expectRevert(); // InvalidProof
        seadrop.mintAllowList{ value: 0 }(
            address(token), feeRecipient, address(0), 1, _freeParams(), badProof
        );
    }

    function test_wrong_params_break_proof() public {
        // Using alice's valid position but tampering maxQty changes the leaf ->
        // proof no longer resolves to the stored root.
        (, bytes32 leafPaid, ) = _setTwoLeafTree();
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafPaid;

        MintParams memory tampered = _freeParams();
        tampered.maxTotalMintableByWallet = 999;

        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert();
        seadrop.mintAllowList{ value: 0 }(
            address(token), feeRecipient, address(0), 3, tampered, proof
        );
    }
}
