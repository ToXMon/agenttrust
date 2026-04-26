// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";
import {ServiceAgreement} from "../src/ServiceAgreement.sol";

contract ServiceAgreementTest is Test {
    ServiceAgreement private s_agreement;
    ERC20 private s_token;
    address private s_requester;
    address private s_provider;

    uint256 constant AMOUNT = 100e18;
    uint256 constant TRUST_THRESHOLD = 60;
    uint256 constant DEADLINE = 1 days;

    function setUp() public {
        s_agreement = new ServiceAgreement();
        s_token = new ERC20();
        s_requester = makeAddr("requester");
        s_provider = makeAddr("provider");

        deal(address(s_token), s_requester, AMOUNT * 10);
    }

    modifier withAgreement() {
        vm.prank(s_requester);
        s_token.approve(address(s_agreement), AMOUNT);

        vm.prank(s_requester);
        s_agreement.createAgreement(
            s_provider,
            address(s_token),
            AMOUNT,
            TRUST_THRESHOLD,
            block.timestamp + DEADLINE,
            keccak256("service")
        );
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           CREATE AGREEMENT
    //////////////////////////////////////////////////////////////*/

    function test_CreateAgreement() public {
        vm.prank(s_requester);
        s_token.approve(address(s_agreement), AMOUNT);

        vm.prank(s_requester);
        uint256 agreementId = s_agreement.createAgreement(
            s_provider,
            address(s_token),
            AMOUNT,
            TRUST_THRESHOLD,
            block.timestamp + DEADLINE,
            keccak256("service")
        );

        assertEq(agreementId, 0);

        ServiceAgreement.Agreement memory a = s_agreement.getAgreement(agreementId);
        assertEq(a.requester, s_requester);
        assertEq(a.provider, s_provider);
        assertEq(a.amount, AMOUNT);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Pending));
    }

    function test_RevertWhen_ZeroAmount() public {
        vm.prank(s_requester);
        vm.expectRevert(ServiceAgreement.ServiceAgreement__ZeroAmount.selector);
        s_agreement.createAgreement(
            s_provider, address(s_token), 0, TRUST_THRESHOLD,
            block.timestamp + DEADLINE, keccak256("service")
        );
    }

    function test_RevertWhen_SameAgent() public {
        vm.prank(s_requester);
        s_token.approve(address(s_agreement), AMOUNT);

        vm.prank(s_requester);
        vm.expectRevert(ServiceAgreement.ServiceAgreement__SameAgent.selector);
        s_agreement.createAgreement(
            s_requester, address(s_token), AMOUNT, TRUST_THRESHOLD,
            block.timestamp + DEADLINE, keccak256("service")
        );
    }

    /*//////////////////////////////////////////////////////////////
                          FULL LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    function test_FullAgreementLifecycle() public withAgreement {
        // Accept
        vm.prank(s_provider);
        s_agreement.acceptAgreement(0);

        ServiceAgreement.Agreement memory a = s_agreement.getAgreement(0);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Active));

        // Fulfill
        bytes32 outputHash = keccak256("result");
        vm.prank(s_provider);
        s_agreement.fulfillAgreement(0, outputHash);

        a = s_agreement.getAgreement(0);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Fulfilled));
        assertEq(a.outputHash, outputHash);

        // Settle
        uint256 providerBalanceBefore = s_token.balanceOf(s_provider);
        vm.prank(s_requester);
        s_agreement.settleAgreement(0);

        a = s_agreement.getAgreement(0);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Settled));
        assertEq(s_token.balanceOf(s_provider) - providerBalanceBefore, AMOUNT);
    }

    /*//////////////////////////////////////////////////////////////
                           CANCEL / DISPUTE
    //////////////////////////////////////////////////////////////*/

    function test_CancelAgreement() public withAgreement {
        uint256 requesterBalanceBefore = s_token.balanceOf(s_requester);

        vm.prank(s_requester);
        s_agreement.cancelAgreement(0);

        ServiceAgreement.Agreement memory a = s_agreement.getAgreement(0);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Cancelled));
        assertEq(s_token.balanceOf(s_requester) - requesterBalanceBefore, AMOUNT);
    }

    function test_DisputeAgreement() public withAgreement {
        vm.prank(s_provider);
        s_agreement.acceptAgreement(0);

        vm.prank(s_requester);
        s_agreement.disputeAgreement(0);

        ServiceAgreement.Agreement memory a = s_agreement.getAgreement(0);
        assertEq(uint8(a.status), uint8(ServiceAgreement.AgreementStatus.Disputed));
    }
}
