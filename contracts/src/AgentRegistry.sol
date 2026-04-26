// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {Ownable2Step} from "openzeppelin-contracts/contracts/access/Ownable2Step.sol";

/**
 * @title AgentRegistry
 * @notice Registers AI agents with ENS names and identity metadata as NFTs
 * @custom:security-contact security@agenttrust.xyz
 */
contract AgentRegistry is ERC721, Ownable2Step {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    struct AgentMetadata {
        string ensName;
        bytes32 capabilitiesHash;
        uint256 registeredAt;
        bool isActive;
    }

    /*//////////////////////////////////////////////////////////////
                              STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 private s_nextTokenId;
    mapping(uint256 tokenId => AgentMetadata) private s_agents;
    mapping(address owner => uint256 tokenId) private s_addressToTokenId;
    mapping(string ensName => uint256 tokenId) private s_ensToTokenId;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentRegistered(uint256 indexed tokenId, address indexed agent, string ensName);
    event AgentDeactivated(uint256 indexed tokenId);
    event AgentReactivated(uint256 indexed tokenId);
    event CapabilitiesUpdated(uint256 indexed tokenId, bytes32 capabilitiesHash);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error AgentRegistry__AlreadyRegistered();
    error AgentRegistry__ENSAlreadyTaken();
    error AgentRegistry__NotRegistered();
    error AgentRegistry__NotTokenOwner();
    error AgentRegistry__AgentInactive();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor() ERC721("AgentTrust Identity", "ATID") Ownable(msg.sender) {}

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL STATE-CHANGING
    //////////////////////////////////////////////////////////////*/

    function registerAgent(
        string calldata ensName,
        bytes32 capabilitiesHash
    ) external returns (uint256 tokenId) {
        if (s_addressToTokenId[msg.sender] != 0) {
            revert AgentRegistry__AlreadyRegistered();
        }
        if (s_ensToTokenId[ensName] != 0) {
            revert AgentRegistry__ENSAlreadyTaken();
        }

        tokenId = s_nextTokenId++;

        s_agents[tokenId] = AgentMetadata({
            ensName: ensName,
            capabilitiesHash: capabilitiesHash,
            registeredAt: block.timestamp,
            isActive: true
        });

        s_addressToTokenId[msg.sender] = tokenId;
        s_ensToTokenId[ensName] = tokenId;

        _safeMint(msg.sender, tokenId);

        emit AgentRegistered(tokenId, msg.sender, ensName);
    }

    function deactivateAgent(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) {
            revert AgentRegistry__NotTokenOwner();
        }
        s_agents[tokenId].isActive = false;
        emit AgentDeactivated(tokenId);
    }

    function reactivateAgent(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) {
            revert AgentRegistry__NotTokenOwner();
        }
        s_agents[tokenId].isActive = true;
        emit AgentReactivated(tokenId);
    }

    function updateCapabilities(uint256 tokenId, bytes32 capabilitiesHash) external {
        if (ownerOf(tokenId) != msg.sender) {
            revert AgentRegistry__NotTokenOwner();
        }
        s_agents[tokenId].capabilitiesHash = capabilitiesHash;
        emit CapabilitiesUpdated(tokenId, capabilitiesHash);
    }

    /*//////////////////////////////////////////////////////////////
                          EXTERNAL VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getAgent(uint256 tokenId) external view returns (AgentMetadata memory agent) {
        agent = s_agents[tokenId];
        if (agent.registeredAt == 0) {
            revert AgentRegistry__NotRegistered();
        }
    }

    function getAgentByAddress(address agentAddress) external view returns (uint256 tokenId) {
        tokenId = s_addressToTokenId[agentAddress];
        if (tokenId == 0) {
            revert AgentRegistry__NotRegistered();
        }
    }

    function getAgentByENS(string calldata ensName) external view returns (uint256 tokenId) {
        tokenId = s_ensToTokenId[ensName];
        if (tokenId == 0) {
            revert AgentRegistry__NotRegistered();
        }
    }

    function isAgentActive(uint256 tokenId) external view returns (bool active) {
        if (s_agents[tokenId].registeredAt == 0) {
            revert AgentRegistry__NotRegistered();
        }
        active = s_agents[tokenId].isActive;
    }

    function totalRegistered() external view returns (uint256 total) {
        total = s_nextTokenId;
    }
}
