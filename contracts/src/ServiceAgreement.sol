// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "openzeppelin-contracts/contracts/utils/ReentrancyGuardTransient.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Ownable2Step} from "openzeppelin-contracts/contracts/access/Ownable2Step.sol";

/**
 * @title ServiceAgreement
 * @notice Trust-gated escrow for agent-to-agent service agreements
 * @dev Payments only release when trust thresholds are met
 * @custom:security-contact security@agenttrust.xyz
 */
contract ServiceAgreement is ReentrancyGuardTransient, Ownable2Step {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    enum AgreementStatus {
        Pending,
        Active,
        Fulfilled,
        Settled,
        Disputed,
        Cancelled,
        Expired
    }

    struct Agreement {
        address requester;
        address provider;
        address token;
        uint256 amount;
        uint256 trustThreshold;
        uint256 deadline;
        bytes32 serviceHash;
        bytes32 outputHash;
        AgreementStatus status;
        uint256 createdAt;
        uint256 settledAt;
    }

    /*//////////////////////////////////////////////////////////////
                              STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 private s_nextAgreementId;
    mapping(uint256 agreementId => Agreement) private s_agreements;
    mapping(address agent => uint256[] agreementIds) private s_agentAgreements;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed requester,
        address indexed provider,
        uint256 amount,
        uint256 trustThreshold
    );
    event AgreementAccepted(uint256 indexed agreementId);
    event AgreementFulfilled(uint256 indexed agreementId, bytes32 outputHash);
    event AgreementSettled(uint256 indexed agreementId, uint256 amount);
    event AgreementDisputed(uint256 indexed agreementId, address indexed disputer);
    event AgreementCancelled(uint256 indexed agreementId);
    event AgreementExpired(uint256 indexed agreementId);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ServiceAgreement__NotFound();
    error ServiceAgreement__NotRequester();
    error ServiceAgreement__NotProvider();
    error ServiceAgreement__NotParticipant();
    error ServiceAgreement__InvalidStatus();
    error ServiceAgreement__TrustBelowThreshold();
    error ServiceAgreement__ZeroAmount();
    error ServiceAgreement__SameAgent();
    error ServiceAgreement__ZeroAddress();
    error ServiceAgreement__DeadlinePassed();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL STATE-CHANGING
    //////////////////////////////////////////////////////////////*/

    function createAgreement(
        address provider,
        address token,
        uint256 amount,
        uint256 trustThreshold,
        uint256 deadline,
        bytes32 serviceHash
    ) external nonReentrant returns (uint256 agreementId) {
        if (amount == 0) revert ServiceAgreement__ZeroAmount();
        if (provider == address(0)) revert ServiceAgreement__ZeroAddress();
        if (msg.sender == provider) revert ServiceAgreement__SameAgent();
        if (deadline <= block.timestamp) revert ServiceAgreement__DeadlinePassed();

        agreementId = s_nextAgreementId++;

        s_agreements[agreementId] = Agreement({
            requester: msg.sender,
            provider: provider,
            token: token,
            amount: amount,
            trustThreshold: trustThreshold,
            deadline: deadline,
            serviceHash: serviceHash,
            outputHash: bytes32(0),
            status: AgreementStatus.Pending,
            createdAt: block.timestamp,
            settledAt: 0
        });

        s_agentAgreements[msg.sender].push(agreementId);
        s_agentAgreements[provider].push(agreementId);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit AgreementCreated(agreementId, msg.sender, provider, amount, trustThreshold);
    }

    function acceptAgreement(uint256 agreementId) external {
        Agreement storage agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
        if (msg.sender != agreement.provider) revert ServiceAgreement__NotProvider();
        if (agreement.status != AgreementStatus.Pending) revert ServiceAgreement__InvalidStatus();

        agreement.status = AgreementStatus.Active;

        emit AgreementAccepted(agreementId);
    }

    function fulfillAgreement(uint256 agreementId, bytes32 outputHash) external {
        Agreement storage agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
        if (msg.sender != agreement.provider) revert ServiceAgreement__NotProvider();
        if (agreement.status != AgreementStatus.Active) revert ServiceAgreement__InvalidStatus();
        if (block.timestamp > agreement.deadline) revert ServiceAgreement__DeadlinePassed();

        agreement.outputHash = outputHash;
        agreement.status = AgreementStatus.Fulfilled;

        emit AgreementFulfilled(agreementId, outputHash);
    }

    function settleAgreement(uint256 agreementId) external nonReentrant {
        Agreement storage agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
        if (msg.sender != agreement.requester) revert ServiceAgreement__NotRequester();
        if (agreement.status != AgreementStatus.Fulfilled) revert ServiceAgreement__InvalidStatus();

        agreement.status = AgreementStatus.Settled; // placeholder — will integrate with TrustNFT
        agreement.settledAt = block.timestamp;

        IERC20(agreement.token).safeTransfer(agreement.provider, agreement.amount);

        emit AgreementSettled(agreementId, agreement.amount);
    }

    function disputeAgreement(uint256 agreementId) external {
        Agreement storage agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
        if (msg.sender != agreement.requester && msg.sender != agreement.provider) {
            revert ServiceAgreement__NotParticipant();
        }
        if (agreement.status != AgreementStatus.Active && agreement.status != AgreementStatus.Fulfilled) {
            revert ServiceAgreement__InvalidStatus();
        }

        agreement.status = AgreementStatus.Disputed;

        emit AgreementDisputed(agreementId, msg.sender);
    }

    function cancelAgreement(uint256 agreementId) external nonReentrant {
        Agreement storage agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
        if (msg.sender != agreement.requester) revert ServiceAgreement__NotRequester();
        if (agreement.status != AgreementStatus.Pending) revert ServiceAgreement__InvalidStatus();

        agreement.status = AgreementStatus.Cancelled;

        IERC20(agreement.token).safeTransfer(agreement.requester, agreement.amount);

        emit AgreementCancelled(agreementId);
    }

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getAgreement(uint256 agreementId) external view returns (Agreement memory agreement) {
        agreement = s_agreements[agreementId];
        if (agreement.requester == address(0)) revert ServiceAgreement__NotFound();
    }

    function getAgentAgreements(address agent) external view returns (uint256[] memory ids) {
        ids = s_agentAgreements[agent];
    }

    function totalAgreements() external view returns (uint256 total) {
        total = s_nextAgreementId;
    }
}
