// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {TrustNFT} from "../src/TrustNFT.sol";

contract TrustNFTTest is Test {
    TrustNFT private s_trustNFT;
    address private s_alice;
    address private s_bob;
    address private s_agreementContract;

    function setUp() public {
        s_trustNFT = new TrustNFT();
        s_alice = makeAddr("alice");
        s_bob = makeAddr("bob");
        s_agreementContract = makeAddr("agreement");

        s_trustNFT.setAgreementContract(s_agreementContract);
    }

    /*//////////////////////////////////////////////////////////////
                            MINT TRUST NFT
    //////////////////////////////////////////////////////////////*/

    function test_MintTrustNFT() public {
        uint256 tokenId = s_trustNFT.mintTrustNFT(s_alice);

        assertEq(tokenId, 0);
        assertEq(s_trustNFT.ownerOf(tokenId), s_alice);

        TrustNFT.TrustData memory data = s_trustNFT.getTrustData(tokenId);
        assertEq(data.score, 50);
        assertEq(data.agreementsCompleted, 0);
        assertEq(data.agreementsDisputed, 0);
        assertGt(data.mintedAt, 0);
    }

    function test_RevertWhen_AlreadyMinted() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.expectRevert(TrustNFT.TrustNFT__AlreadyMinted.selector);
        s_trustNFT.mintTrustNFT(s_alice);
    }

    /*//////////////////////////////////////////////////////////////
                          SOUL-BOUND (NON-TRANSFERABLE)
    //////////////////////////////////////////////////////////////*/

    function test_RevertWhen_TransferFrom() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.prank(s_alice);
        vm.expectRevert(TrustNFT.TrustNFT__NotTransferable.selector);
        s_trustNFT.transferFrom(s_alice, s_bob, 0);
    }

    function test_RevertWhen_Approve() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.prank(s_alice);
        vm.expectRevert(TrustNFT.TrustNFT__NotTransferable.selector);
        s_trustNFT.approve(s_bob, 0);
    }

    /*//////////////////////////////////////////////////////////////
                          AGREEMENT COMPLETION
    //////////////////////////////////////////////////////////////*/

    function test_RecordSuccessfulCompletion() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.prank(s_agreementContract);
        s_trustNFT.recordAgreementCompletion(s_alice, true);

        TrustNFT.TrustData memory data = s_trustNFT.getTrustDataByAgent(s_alice);
        assertEq(data.agreementsCompleted, 1);
        assertEq(data.agreementsDisputed, 0);
        assertGt(data.score, 50);
    }

    function test_RecordDisputedCompletion() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.prank(s_agreementContract);
        s_trustNFT.recordAgreementCompletion(s_alice, false);

        TrustNFT.TrustData memory data = s_trustNFT.getTrustDataByAgent(s_alice);
        assertEq(data.agreementsCompleted, 0);
        assertEq(data.agreementsDisputed, 1);
        assertLt(data.score, 50);
    }

    function test_RevertWhen_NotAgreementContract() public {
        s_trustNFT.mintTrustNFT(s_alice);

        vm.prank(s_bob);
        vm.expectRevert(TrustNFT.TrustNFT__NotAgreementContract.selector);
        s_trustNFT.recordAgreementCompletion(s_alice, true);
    }

    /*//////////////////////////////////////////////////////////////
                          THRESHOLD CHECKS
    //////////////////////////////////////////////////////////////*/

    function test_MeetsThreshold() public {
        s_trustNFT.mintTrustNFT(s_alice);

        assertTrue(s_trustNFT.meetsThreshold(s_alice, 50));
        assertFalse(s_trustNFT.meetsThreshold(s_alice, 51));
    }

    function test_MeetsThreshold_NotMinted() public view {
        assertFalse(s_trustNFT.meetsThreshold(s_alice, 50));
    }

    function test_TrustScoreIncreasesOverMultipleCompletions() public {
        s_trustNFT.mintTrustNFT(s_alice);

        for (uint256 i; i < 10; ++i) {
            vm.prank(s_agreementContract);
            s_trustNFT.recordAgreementCompletion(s_alice, true);
        }

        uint256 score = s_trustNFT.getTrustScore(s_alice);
        assertGt(score, 50);
    }
}
