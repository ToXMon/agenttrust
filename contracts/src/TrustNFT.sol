// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Ownable2Step} from "openzeppelin-contracts/contracts/access/Ownable2Step.sol";

/**
 * @title TrustNFT
 * @notice Soul-bound NFT (ERC-7857 iNFT) representing agent trust scores
 * @dev Tokens are non-transferable — bound to the agent that earned them
 * @custom:security-contact security@agenttrust.xyz
 */
contract TrustNFT is ERC721, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    struct TrustData {
        uint256 score;
        uint256 agreementsCompleted;
        uint256 agreementsDisputed;
        uint256 lastUpdated;
        uint256 mintedAt;
    }

    /*//////////////////////////////////////////////////////////////
                              STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 private s_nextTokenId = 1;
    address private s_agreementContract;
    mapping(uint256 tokenId => TrustData) private s_trustData;
    mapping(address agent => uint256 tokenId) private s_agentToTokenId;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event TrustNFTMinted(uint256 indexed tokenId, address indexed agent, uint256 initialScore);
    event TrustScoreUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);
    event AgreementCompleted(address indexed agent, bool success);
    event AgreementContractUpdated(address indexed oldContract, address indexed newContract);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error TrustNFT__NotTransferable();
    error TrustNFT__AlreadyMinted();
    error TrustNFT__NotAgreementContract();
    error TrustNFT__NotMinted();
    error TrustNFT__InvalidScore();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() ERC721("AgentTrust Score", "ATS") Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                          MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAgreementContract() {
        if (msg.sender != s_agreementContract) {
            revert TrustNFT__NotAgreementContract();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL STATE-CHANGING
    //////////////////////////////////////////////////////////////*/

    function mintTrustNFT(address agent) external returns (uint256 tokenId) {
        if (s_agentToTokenId[agent] != 0) {
            revert TrustNFT__AlreadyMinted();
        }

        tokenId = s_nextTokenId++;

        s_trustData[tokenId] = TrustData({
            score: 50, // Start at neutral trust
            agreementsCompleted: 0,
            agreementsDisputed: 0,
            lastUpdated: block.timestamp,
            mintedAt: block.timestamp
        });

        s_agentToTokenId[agent] = tokenId;

        _safeMint(agent, tokenId);

        emit TrustNFTMinted(tokenId, agent, 50);
    }

    function recordAgreementCompletion(
        address agent,
        bool success
    ) external onlyAgreementContract {
        uint256 tokenId = s_agentToTokenId[agent];
        if (tokenId == 0) revert TrustNFT__NotMinted();

        TrustData storage data = s_trustData[tokenId];
        uint256 oldScore = data.score;

        if (success) {
            data.agreementsCompleted++;
            data.score = _calculateNewScore(oldScore, data.agreementsCompleted, data.agreementsDisputed);
        } else {
            data.agreementsDisputed++;
            data.score = _calculateNewScore(oldScore, data.agreementsCompleted, data.agreementsDisputed);
        }

        data.lastUpdated = block.timestamp;

        emit AgreementCompleted(agent, success);
        emit TrustScoreUpdated(tokenId, oldScore, data.score);
    }

    function setAgreementContract(address newContract) external onlyOwner {
        address oldContract = s_agreementContract;
        s_agreementContract = newContract;
        emit AgreementContractUpdated(oldContract, newContract);
    }

    /*//////////////////////////////////////////////////////////////
                          ERC-721 OVERRIDES (SOUL-BOUND)
    //////////////////////////////////////////////////////////////*/

    function transferFrom(address, address, uint256) public pure override {
        revert TrustNFT__NotTransferable();
    }

    function approve(address, uint256) public pure override {
        revert TrustNFT__NotTransferable();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TrustNFT__NotTransferable();
    }

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getTrustScore(address agent) external view returns (uint256 score) {
        uint256 tokenId = s_agentToTokenId[agent];
        if (tokenId == 0) revert TrustNFT__NotMinted();
        score = s_trustData[tokenId].score;
    }

    function getTrustData(uint256 tokenId) external view returns (TrustData memory data) {
        data = s_trustData[tokenId];
        if (data.mintedAt == 0) revert TrustNFT__NotMinted();
    }

    function getTrustDataByAgent(address agent) external view returns (TrustData memory data) {
        uint256 tokenId = s_agentToTokenId[agent];
        if (tokenId == 0) revert TrustNFT__NotMinted();
        data = s_trustData[tokenId];
    }

    function meetsThreshold(address agent, uint256 threshold) external view returns (bool meets) {
        uint256 tokenId = s_agentToTokenId[agent];
        if (tokenId == 0) {
            meets = false;
            return meets;
        }
        meets = s_trustData[tokenId].score >= threshold;
    }

    function totalMinted() external view returns (uint256 total) {
        total = s_nextTokenId - 1;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _calculateNewScore(
        uint256 currentScore,
        uint256 completed,
        uint256 disputed
    ) internal pure returns (uint256 newScore) {
        uint256 total = completed + disputed;
        if (total == 0) {
            newScore = currentScore;
            return newScore;
        }

        uint256 successRate = (completed * 100) / total;
        uint256 targetScore = successRate;

        if (targetScore > currentScore) {
            newScore = currentScore + ((targetScore - currentScore) / 10);
        } else {
            newScore = currentScore - ((currentScore - targetScore) / 5);
        }

        if (newScore > 100) {
            newScore = 100;
        }
    }
}
